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
      return raw.map(mapTrail).filter((r): r is OppRow => r != null && inMetro(r.dong_name));
    }),
    // ⚠️ sports_facility(mapSportsFacility)·seoul_jobs(mapSeoulJob)는 의도적으로 미배선.
    //    매퍼는 준비됐으나 Raw* 필드명이 추정값(발급 응답 미확정)이라 실호출 시 전량 null 위험.
    //    데드코드가 아니라 게이팅 상태 — 인증키 발급 후 응답 1건으로 필드 확정하면 여기 runSource 추가.
  ]);

  const total = results.reduce((s, r) => s + r.upserted, 0);
  return new Response(JSON.stringify({ ok: true, total, results }, null, 2), {
    headers: { "content-type": "application/json" },
  });
});
