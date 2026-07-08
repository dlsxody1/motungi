/**
 * 적재 Edge Function — 공공 API에서 활동을 받아 opportunities 테이블에 upsert.
 *
 * 소스: 서울 문화행사 · 문화정보(data.go.kr) · 두루누비 · 서울 일자리.
 * 각 소스는 독립 try/catch로 격리 — 한 소스가 실패해도 나머지는 적재된다.
 * upsert 키: (source, external_id) unique.
 *
 * 시크릿(서버 전용): SUPABASE_URL, SUPABASE_SECRET_KEY, SEOUL_OPENAPI_KEY, DATA_GO_KR_SERVICE_KEY.
 * Cron(일 1회)이 호출하거나, 수동 POST로 트리거.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  mapCultureInfo,
  mapSeoulCulture,
  mapSeoulJob,
  mapTrail,
  type OppRow,
} from "./adapters.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SECRET_KEY = Deno.env.get("SUPABASE_SECRET_KEY")!;
const SEOUL_KEY = Deno.env.get("SEOUL_OPENAPI_KEY")?.trim();
const DATA_GO_KR_KEY = Deno.env.get("DATA_GO_KR_SERVICE_KEY")?.trim();

/** 소스별 최대 적재 건수(1회 실행). 부하·쿼터 보호. */
const LIMIT = 300;
/** 수도권 필터(전국 소스용). 서울/경기/인천만 카드로. */
const METRO_PREFIXES = ["서울", "경기", "인천"];

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

interface SourceResult {
  source: string;
  fetched: number;
  upserted: number;
  error?: string;
}

/** 서울 열린데이터광장 JSON 응답에서 row 배열 추출. */
async function fetchSeoul(service: string, path = ""): Promise<Record<string, string>[]> {
  if (!SEOUL_KEY) throw new Error("SEOUL_OPENAPI_KEY 없음");
  const url = `http://openapi.seoul.go.kr:8088/${SEOUL_KEY}/json/${service}/1/${LIMIT}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${service} HTTP ${res.status}`);
  const json = await res.json();
  const body = json[service];
  if (!body?.row) throw new Error(`${service}: row 없음 (${body?.RESULT?.MESSAGE ?? "?"})`);
  return body.row;
}

/** data.go.kr JSON 응답에서 item 배열 추출. */
async function fetchDataGoKr(url: string): Promise<Record<string, string>[]> {
  if (!DATA_GO_KR_KEY) throw new Error("DATA_GO_KR_SERVICE_KEY 없음");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`data.go.kr HTTP ${res.status}`);
  const json = await res.json();
  const items = json?.response?.body?.items?.item ?? json?.body?.items ?? [];
  return Array.isArray(items) ? items : [items].filter(Boolean);
}

/** OppRow[] → opportunities upsert. (source, external_id) 충돌 시 갱신. */
async function upsertRows(rows: OppRow[]): Promise<number> {
  if (!rows.length) return 0;
  const payload = rows.map((r) => ({
    source: r.source,
    category: r.category,
    external_id: r.external_id,
    title: r.title,
    summary: r.summary,
    cost_krw: r.cost_krw,
    difficulty: r.difficulty,
    dong_name: r.dong_name,
    lat: r.lat,
    lng: r.lng,
    cta_url: r.cta_url,
    deadline: r.deadline,
    source_label: r.source_label,
    time_start_hour: r.time_start_hour,
    time_end_hour: r.time_end_hour,
    fetched_at: new Date().toISOString(),
  }));
  const { error, count } = await supabase
    .from("opportunities")
    .upsert(payload, { onConflict: "source,external_id", count: "exact" });
  if (error) throw new Error(error.message);
  return count ?? payload.length;
}

function inMetro(dong?: string | null): boolean {
  if (!dong) return true; // 지역 불명은 통과(다른 소스에서 걸러짐)
  return METRO_PREFIXES.some((p) => dong.startsWith(p));
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

Deno.serve(async () => {
  const results = await Promise.all([
    runSource("seoul_culture", async () => {
      const raw = await fetchSeoul("culturalEventInfo");
      return raw.map(mapSeoulCulture).filter((r): r is OppRow => r != null);
    }),
    runSource("culture_info", async () => {
      const enc = encodeURIComponent(DATA_GO_KR_KEY ?? "");
      const url = `https://apis.data.go.kr/B553457/cultureinfo/period2?serviceKey=${enc}&numOfRows=${LIMIT}&PageNo=1&from=20260701&to=20261231&sido=서울특별시`;
      const raw = await fetchDataGoKr(url);
      return raw.map(mapCultureInfo).filter((r): r is OppRow => r != null && inMetro(r.dong_name));
    }),
    runSource("trail", async () => {
      const enc = encodeURIComponent(DATA_GO_KR_KEY ?? "");
      const url = `https://apis.data.go.kr/B551011/Durunubi/courseList?serviceKey=${enc}&numOfRows=${LIMIT}&pageNo=1&MobileOS=ETC&MobileApp=motungi&_type=json`;
      const raw = await fetchDataGoKr(url);
      return raw.map(mapTrail).filter((r): r is OppRow => r != null && inMetro(r.dong_name));
    }),
    runSource("seoul_jobs", async () => {
      // J01103 = 계약직(시간제) — 퇴근후 파트에 적합.
      const raw = await fetchSeoul("GetJobInfo");
      return raw.map(mapSeoulJob).filter((r): r is OppRow => r != null);
    }),
  ]);

  const total = results.reduce((s, r) => s + r.upserted, 0);
  return new Response(JSON.stringify({ ok: true, total, results }, null, 2), {
    headers: { "content-type": "application/json" },
  });
});
