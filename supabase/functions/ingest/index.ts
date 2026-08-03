/**
 * 적재 Edge Function — 공공 API에서 활동을 받아 opportunities 테이블에 upsert.
 *
 * 소스: 서울 문화행사(culture) · 문화정보 data.go.kr(culture) · 두루누비(active).
 * 각 소스는 독립 try/catch로 격리 — 한 소스가 실패해도 나머지는 적재된다.
 * upsert 키: (source, external_id) unique.
 *
 * 키 해석 우선순위: Edge Function secret(env) → 요청 body.
 *   - Cron 자동 실행: secret 등록 필요 (SEOUL_OPENAPI_KEY, DATA_GO_KR_SERVICE_KEY).
 *   - 수동/초기 검증: POST body { seoulKey, dataGoKrKey }로 전달 가능.
 * Supabase 접속: SUPABASE_URL + SERVICE_ROLE_KEY(자동 주입).
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  mapCultureInfo,
  mapSeoulCulture,
  mapTrail,
  type OppRow,
} from "./adapters.ts";
import {
  dedupByKey,
  inMetro,
  judgeIngest,
  parseJsonItems,
  parseXmlItems,
} from "../../../packages/core/src/adapters/ingest-fetch.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Edge 런타임 자동 주입은 SERVICE_ROLE_KEY. 커스텀 secret도 fallback 허용.
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY")!;

/** 소스별 최대 적재 건수(1회 실행). 부하·쿼터 보호. */
const LIMIT = 300;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

interface SourceResult {
  source: string;
  fetched: number;
  upserted: number;
  error?: string;
}

/** 서울 열린데이터광장 JSON 응답에서 row 배열 추출. */
async function fetchSeoul(
  seoulKey: string,
  service: string,
  path = "",
): Promise<Record<string, string>[]> {
  if (!seoulKey) throw new Error("SEOUL_OPENAPI_KEY 없음");
  const url = `http://openapi.seoul.go.kr:8088/${seoulKey}/json/${service}/1/${LIMIT}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${service} HTTP ${res.status}`);
  const json = await res.json();
  const body = json[service];
  if (!body?.row) throw new Error(`${service}: row 없음 (${body?.RESULT?.MESSAGE ?? "?"})`);
  return body.row;
}

/** data.go.kr JSON 응답 fetch — 파싱(단일object quirk 정규화 포함)은 core parseJsonItems가 담당. */
async function fetchDataGoKrJson(url: string): Promise<Record<string, string>[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`data.go.kr HTTP ${res.status}`);
  const json = await res.json();
  return parseJsonItems(json);
}

/** data.go.kr XML 응답 fetch — <item> 블록 파싱은 core parseXmlItems가 담당. */
async function fetchDataGoKrXml(url: string): Promise<Record<string, string>[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`data.go.kr HTTP ${res.status}`);
  const xml = await res.text();
  return parseXmlItems(xml);
}

/**
 * 걷기길 시점 좌표 — GPX 파일 첫 trkpt.
 *
 * 두루누비 courseList는 좌표를 주지 않고 GPX 파일 경로(gpxpath)만 준다. 좌표가 없으면
 * 거리 스코어가 중립(0.5)로 떨어져 "동네" 큐레이션에서 사실상 빠지므로 적재 때 한 번 채운다.
 * 실패(네트워크·형식)는 null로 삼키고 넘어간다 — 좌표 하나 때문에 적재 전체를 막지 않는다.
 */
async function fetchTrailStartCoord(
  gpxUrl?: string | null,
): Promise<{ lat: number; lng: number } | null> {
  if (!gpxUrl) return null;
  try {
    const res = await fetch(gpxUrl, { redirect: "follow" });
    if (!res.ok) return null;
    const xml = await res.text();
    const m = xml.match(/<trkpt\b[^>]*>/);
    if (!m) return null;
    const lat = Number(m[0].match(/\blat="([^"]+)"/)?.[1]);
    const lng = Number(m[0].match(/\blon="([^"]+)"/)?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/** GPX는 수백 KB라 동시성을 제한한다(수도권 19건 기준 3라운드). */
const TRAIL_GPX_CONCURRENCY = 8;

async function enrichTrailCoords(rows: OppRow[]): Promise<OppRow[]> {
  for (let i = 0; i < rows.length; i += TRAIL_GPX_CONCURRENCY) {
    const chunk = rows.slice(i, i + TRAIL_GPX_CONCURRENCY);
    const coords = await Promise.all(chunk.map((r) => fetchTrailStartCoord(r.gpx_url)));
    coords.forEach((c, j) => {
      if (c) {
        chunk[j]!.lat = c.lat;
        chunk[j]!.lng = c.lng;
      }
    });
  }
  return rows;
}

/** OppRow[] → opportunities upsert. (source, external_id) 충돌 시 갱신. */
async function upsertRows(rows: OppRow[]): Promise<number> {
  if (!rows.length) return 0;
  const now = new Date().toISOString();
  const payload = rows.map((r) => ({ ...r, fetched_at: now }));
  const { error, count } = await supabase
    .from("opportunities")
    .upsert(payload, { onConflict: "source,external_id", count: "exact" });
  if (error) throw new Error(error.message);
  return count ?? payload.length;
}

async function runSource(
  source: string,
  loader: () => Promise<OppRow[]>,
): Promise<SourceResult> {
  try {
    const rows = await loader();
    const upserted = await upsertRows(rows);
    return { source, fetched: rows.length, upserted };
  } catch (e) {
    return { source, fetched: 0, upserted: 0, error: String(e instanceof Error ? e.message : e) };
  }
}

Deno.serve(async (req) => {
  // 키 해석: env(secret) 우선, 없으면 요청 body.
  let body: { seoulKey?: string; dataGoKrKey?: string } = {};
  try {
    if (req.method === "POST") body = await req.json();
  } catch { /* body 없음 허용 */ }

  const seoulKey = (Deno.env.get("SEOUL_OPENAPI_KEY") ?? body.seoulKey ?? "").trim();
  const dataGoKrKey = (Deno.env.get("DATA_GO_KR_SERVICE_KEY") ?? body.dataGoKrKey ?? "").trim();
  const enc = encodeURIComponent(dataGoKrKey);

  const results = await Promise.all([
    runSource("seoul_culture", async () => {
      const raw = await fetchSeoul(seoulKey, "culturalEventInfo");
      return raw.map(mapSeoulCulture).filter((r): r is OppRow => r != null);
    }),
    runSource("culture_info", async () => {
      if (!dataGoKrKey) throw new Error("DATA_GO_KR_SERVICE_KEY 없음");
      // period2는 XML + 페이지당 10건 고정 → 여러 페이지 순회하며 수도권만 수집.
      let candidates: OppRow[] = [];
      let rows: OppRow[] = [];
      for (let page = 1; page <= 40 && rows.length < LIMIT; page++) {
        const url = `https://apis.data.go.kr/B553457/cultureinfo/period2?serviceKey=${enc}&numOfRows=10&PageNo=${page}&from=20260708&to=20261231`;
        const raw = await fetchDataGoKrXml(url);
        if (raw.length === 0) break; // 마지막 페이지
        for (const r of raw) {
          const mapped = mapCultureInfo(r);
          if (mapped && inMetro(mapped.dong_name)) candidates.push(mapped);
        }
        rows = dedupByKey(candidates, (r) => r.external_id);
      }
      return rows;
    }),
    runSource("trail", async () => {
      if (!dataGoKrKey) throw new Error("DATA_GO_KR_SERVICE_KEY 없음");
      const url = `https://apis.data.go.kr/B551011/Durunubi/courseList?serviceKey=${enc}&numOfRows=${LIMIT}&pageNo=1&MobileOS=ETC&MobileApp=motungi&_type=json`;
      const raw = await fetchDataGoKrJson(url);
      const rows = raw
        .map(mapTrail)
        .filter((r): r is OppRow => r != null && inMetro(r.dong_name));
      // 좌표는 GPX 안에만 있다 — 수도권으로 좁힌 뒤에 채운다(전국 152건 fetch 방지).
      return await enrichTrailCoords(rows);
    }),
    // ⚠️ sports_facility(mapSportsFacility)·seoul_jobs(mapSeoulJob)는 의도적으로 미배선.
    //    매퍼는 준비됐으나 Raw* 필드명이 추정값(발급 응답 미확정)이라 실호출 시 전량 null 위험.
    //    데드코드가 아니라 게이팅 상태 — 인증키 발급 후 응답 1건으로 필드 확정하면 여기 runSource 추가.
  ]);

  // 판정은 core의 순수 함수가 한다(테스트 소유는 packages/core/src/adapters/ingest-fetch.test.ts).
  const { allFailed, failedSources, total } = judgeIngest(results);

  /**
   * 전 소스 실패 = 적재 자체가 안 된 것. 예전엔 이때도 `ok: true`를 반환해서
   * **실패가 성공처럼 보였다** — 실제로 키 secret이 비어 있는 동안 cron이 매일
   * "성공"을 반환하며 아무것도 적재하지 않았고, 아무도 알아채지 못했다(M-040).
   * 이제 5xx로 응답해 호출자(cron 로그·수동 확인)가 실패를 알 수 있게 한다.
   *
   * 또한 이 경우 **purge를 건너뛴다**. 새로 적재된 게 없는데 마감 지난 행만 지우면
   * 카탈로그가 조용히 비어간다 — 적재 실패가 데이터 손실로 번지는 걸 막는다.
   */
  if (allFailed) {
    return new Response(
      JSON.stringify(
        {
          ok: false,
          error: "all_sources_failed",
          message: "전 소스 적재 실패 — 키(secret) 등록 여부를 확인하라.",
          total: 0,
          purged: 0,
          results,
        },
        null,
        2,
      ),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  // 마감 지난 활동 정리: 새로 적재한 뒤 오래된 것을 치운다. 상시(deadline null)·미래 마감은
  // 보존 — deadline이 있고 오늘보다 과거인 것만 삭제.
  // 일부 소스만 실패한 경우는 그대로 진행한다(그 소스의 신규분만 빠질 뿐 카탈로그는 갱신됐다).
  const today = new Date().toISOString().slice(0, 10);
  let purged = 0;
  try {
    const { count } = await supabase
      .from("opportunities")
      .delete({ count: "exact" })
      .not("deadline", "is", null)
      .lt("deadline", today);
    purged = count ?? 0;
  } catch (e) {
    // 삭제 실패는 적재 성공을 무효화하지 않는다 — 응답에 표기만.
    return new Response(
      JSON.stringify({ ok: true, total, purged: 0, purgeError: String(e), results }, null, 2),
      { headers: { "content-type": "application/json" } },
    );
  }

  // 일부 실패는 200으로 두되 어떤 소스가 실패했는지 남긴다 — 부분 성공을 실패로 취급해
  // 재시도 루프를 유발하지 않으면서도 조용히 넘어가지 않게.
  return new Response(
    JSON.stringify({ ok: true, total, purged, failedSources, results }, null, 2),
    { headers: { "content-type": "application/json" } },
  );
});
