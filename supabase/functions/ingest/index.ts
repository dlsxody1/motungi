/**
 * 적재 Edge Function — 공공 API에서 활동을 받아 opportunities 테이블에 upsert.
 *
 * 소스: 서울 문화행사(culture) · 문화정보 data.go.kr(culture) · 두루누비(active).
 * 각 소스는 독립 try/catch로 격리 — 한 소스가 실패해도 나머지는 적재된다.
 * upsert 키: (source, external_id) unique.
 *
 * 인증(M-026): 이 함수는 SERVICE_ROLE 권한(upsert/delete)으로 동작하므로 verify_jwt=false여도
 * 애플리케이션 레벨에서 호출자를 검증한다. 요청 헤더 `x-cron-secret`이 Edge Function secret
 * `INGEST_CRON_SECRET`과 일치해야 실행되고, 불일치·미설정이면 401을 반환한다.
 * 외부 API 키 해석: SEOUL_OPENAPI_KEY / DATA_GO_KR_SERVICE_KEY는 서버 env(secret)만 신뢰한다
 * (요청 body로 대체 불가 — 과거엔 body 폴백이 있었으나 인증 없는 임의 키 주입 경로였다).
 * Supabase 접속: SUPABASE_URL + SERVICE_ROLE_KEY(자동 주입).
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  mapCultureInfo,
  mapSeoulCulture,
  mapSeoulJob,
  mapTrail,
  type OppRow,
} from "./adapters.ts";
import {
  dedupByKey,
  inMetro,
  isAllowedGpxUrl,
  isCronAuthorized,
  isPlainRecord,
  judgeIngest,
  parseJsonItems,
  parseXmlItems,
  safeMapItems,
} from "../../../packages/core/src/adapters/ingest-fetch.ts";
import {
  applyGuCoordFallback,
  buildGuCentroids,
  type GuCentroidRow,
} from "../../../packages/core/src/adapters/gu-fallback.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Edge 런타임 자동 주입은 SERVICE_ROLE_KEY. 커스텀 secret도 fallback 허용.
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY")!;

/** 소스별 최대 적재 건수(1회 실행). 부하·쿼터 보호. */
const LIMIT = 300;

/**
 * seoul_jobs만 페이지를 도는 이유: 채택 대상(퇴근후 종료 19시 이상)이 전체 2.5만 건에
 * 얇게 흩어져 있어 앞 300건으로는 거의 안 잡힌다. 페이지당 1000건(서울 API 상한) ×
 * 25페이지 = 25,000으로 현재 전량(24,897)을 덮는다. 총량이 늘면 이 수를 올린다.
 */
const SEOUL_JOBS_PAGE = 1000;
const SEOUL_JOBS_MAX_PAGES = 25;

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
  start = 1,
  end = LIMIT,
  /**
   * 페이지 순회용 — 범위를 넘어선 페이지는 row 없이 오는데, 그때 throw하면 runSource가
   * 소스 전체를 실패로 처리해 **앞서 모은 페이지까지 통째로 버린다**. 순회 호출은
   * 빈 배열로 받아 루프가 정상 종료되게 한다(첫 페이지 실패는 여전히 throw).
   */
  emptyOnNoRow = false,
): Promise<Record<string, string>[]> {
  if (!seoulKey) throw new Error("SEOUL_OPENAPI_KEY 없음");
  const url = `http://openapi.seoul.go.kr:8088/${seoulKey}/json/${service}/${start}/${end}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${service} HTTP ${res.status}`);
  const json = await res.json();
  const body = json[service];
  if (!body?.row) {
    if (emptyOnNoRow && start > 1) return [];
    throw new Error(`${service}: row 없음 (${body?.RESULT?.MESSAGE ?? "?"})`);
  }
  // row 원소 중 평범한 객체가 아닌 값은 걸러낸다(M-028) — parseJsonItems 가드와 동일한 이유.
  return Array.isArray(body.row) ? body.row.filter(isPlainRecord) : [];
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
 *
 * gpxUrl은 courseList API가 준 값을 그대로 fetch하기 전에 프로토콜/호스트를 검증한다
 * (SSRF 방지, M-059) — 읽기 경로(apps/web/src/app/api/trail-route/route.ts)와 동일 규칙.
 */
async function fetchTrailStartCoord(
  gpxUrl?: string | null,
): Promise<{ lat: number; lng: number } | null> {
  if (!isAllowedGpxUrl(gpxUrl)) return null;
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

/**
 * 구 중심좌표 맵 — 요청당 1회만 neighborhoods를 읽어 재사용한다.
 * 소스마다 upsertRows가 불리므로 캐시하지 않으면 같은 426행을 4번 읽는다.
 */
let guCentroidsCache: Map<string, { lat: number; lng: number }> | null = null;

async function getGuCentroids(): Promise<Map<string, { lat: number; lng: number }>> {
  if (guCentroidsCache) return guCentroidsCache;
  const { data, error } = await supabase
    .from("neighborhoods")
    .select("sigungu,lat,lng")
    .not("lat", "is", null);
  // 폴백은 있으면 좋은 것이지 적재의 전제가 아니다 — 실패하면 빈 맵으로 넘어간다.
  if (error || !data) return (guCentroidsCache = new Map());
  return (guCentroidsCache = buildGuCentroids(data as GuCentroidRow[]));
}

/** OppRow[] → opportunities upsert. (source, external_id) 충돌 시 갱신. */
async function upsertRows(rows: OppRow[]): Promise<number> {
  if (!rows.length) return 0;
  const now = new Date().toISOString();
  /**
   * 좌표 없는 행에 구 중심좌표를 채운다(0018). 여기서 거는 이유: 마이그레이션 백필만
   * 하면 **다음 적재가 다시 null로 덮어써** 재오염된다. 모든 소스가 이 함수를 지나므로
   * 한 곳에서 건다. 원본 좌표는 덮어쓰지 않는다(applyGuCoordFallback 계약).
   */
  const centroids = await getGuCentroids();
  const payload = rows.map((r) => ({
    ...applyGuCoordFallback(r, centroids),
    fetched_at: now,
  }));
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
  // 인증(M-026): 시크릿 불일치·미설정이면 소스 fetch·DB 접근 전에 즉시 401로 차단한다.
  if (!isCronAuthorized(Deno.env.get("INGEST_CRON_SECRET"), req.headers.get("x-cron-secret"))) {
    return new Response(
      JSON.stringify({ ok: false, error: "unauthorized" }, null, 2),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  const seoulKey = (Deno.env.get("SEOUL_OPENAPI_KEY") ?? "").trim();
  const dataGoKrKey = (Deno.env.get("DATA_GO_KR_SERVICE_KEY") ?? "").trim();
  const enc = encodeURIComponent(dataGoKrKey);

  const results = await Promise.all([
    runSource("seoul_culture", async () => {
      const raw = await fetchSeoul(seoulKey, "culturalEventInfo");
      // 항목 단위 격리(M-028): 한 항목이 예상 밖 shape라 mapSeoulCulture가 던져도
      // 그 항목만 건너뛰고 나머지는 그대로 적재한다(예전엔 소스 배치 전체가 버려졌다).
      const { results: mapped, skipped } = safeMapItems(raw, mapSeoulCulture);
      if (skipped) console.warn(`seoul_culture: 매핑 실패 ${skipped}건 스킵`);
      return mapped.filter((r): r is OppRow => r != null);
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
        // 항목 단위 격리(M-028): 페이지 안 한 항목이 던져도 그 항목만 스킵.
        const { results: mappedPage, skipped } = safeMapItems(raw, mapCultureInfo);
        if (skipped) console.warn(`culture_info: 매핑 실패 ${skipped}건 스킵(page ${page})`);
        for (const mapped of mappedPage) {
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
      // 항목 단위 격리(M-028): 한 항목이 던져도 그 항목만 스킵.
      const { results: mappedTrail, skipped } = safeMapItems(raw, mapTrail);
      if (skipped) console.warn(`trail: 매핑 실패 ${skipped}건 스킵`);
      const rows = mappedTrail.filter((r): r is OppRow => r != null && inMetro(r.dong_name));
      // 좌표는 GPX 안에만 있다 — 수도권으로 좁힌 뒤에 채운다(전국 152건 fetch 방지).
      return await enrichTrailCoords(rows);
    }),
    runSource("seoul_jobs", async () => {
      // 퇴근후(종료 19시 이상) 건은 전체 2.5만 건에 얇게 흩어져 있다 — 앞 300건만 받으면
      // 서너 건밖에 안 걸리므로 여기서는 페이지를 돈다(서울 API는 페이지당 1000건이 상한).
      // 실측(2026-08-04): 전체 24,897 → 수도권 시간제 6,294 → 퇴근후 309.
      const rows: OppRow[] = [];
      for (let page = 0; page < SEOUL_JOBS_MAX_PAGES; page++) {
        const start = page * SEOUL_JOBS_PAGE + 1;
        const raw = await fetchSeoul(
          seoulKey,
          "GetJobInfo",
          "",
          start,
          start + SEOUL_JOBS_PAGE - 1,
          true,
        );
        if (raw.length === 0) break; // 마지막 페이지
        // 항목 단위 격리(M-028): 페이지 안 한 항목이 던져도 그 항목만 스킵.
        const { results: mappedJobs, skipped } = safeMapItems(raw, mapSeoulJob);
        if (skipped) console.warn(`seoul_jobs: 매핑 실패 ${skipped}건 스킵(page ${page})`);
        for (const mapped of mappedJobs) {
          if (mapped && inMetro(mapped.dong_name)) rows.push(mapped);
        }
      }
      return dedupByKey(rows, (r) => r.external_id);
    }),
    // ⚠️ sports_facility(mapSportsFacility)는 여전히 미배선 — Raw* 필드명이 추정값(발급 응답
    //    미확정)이라 실호출 시 전량 null 위험. 데드코드가 아니라 게이팅 상태다.
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
