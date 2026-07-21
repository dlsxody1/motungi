/**
 * 소스 어댑터 (Deno/Edge 런타임용).
 *
 * ⚠️ 로직 원본은 packages/core/src/adapters (TDD 테스트 소유).
 *    Edge Function은 Deno라 npm 워크스페이스(패키지명) import는 불가하지만,
 *    상대경로(.ts 확장자 명시) import는 가능하므로 공통 파서(parseFeeKrw/parseHour/
 *    toIsoDate/hashKey/parsePoint)는 core/adapters/util.ts를 그대로 import해 중복을 없앤다.
 *    필드 매핑 규칙(mapSeoulCulture 등)은 이 파일이 SoT — core adapters(seoul-culture.ts 등)와
 *    필드명이 다르므로 함께 수정할 것.
 */
import { hashKey, parseFeeKrw, parseHour, parsePoint, toIsoDate } from "../../../packages/core/src/adapters/util.ts";

/** DB opportunities row (upsert 페이로드). */
export interface OppRow {
  source: string;
  category: string;
  external_id: string;
  title: string;
  summary: string;
  cost_krw: number | null;
  difficulty: number | null;
  dong_name: string | null;
  lat: number | null;
  lng: number | null;
  cta_url: string | null;
  image_url: string | null;
  deadline: string | null;
  source_label: string;
  time_start_hour: number | null;
  time_end_hour: number | null;
}

// ── 서울시 문화행사 → culture ──────────────────────────────

export function mapSeoulCulture(raw: Record<string, string>): OppRow | null {
  const title = raw.TITLE?.trim();
  if (!title) return null;
  const externalId = hashKey(`${title}|${raw.STRTDATE ?? ""}|${raw.PLACE ?? ""}`);
  const cost = raw.IS_FREE?.includes("무료") ? 0 : parseFeeKrw(raw.USE_FEE);
  const startHour = parseHour(raw.PRO_TIME);
  const point = parsePoint(raw.LAT, raw.LOT);
  return {
    source: "seoul_culture",
    category: "culture",
    external_id: externalId,
    title,
    summary: [raw.GUNAME, raw.PLACE, raw.CODENAME].filter(Boolean).join(" · ") || title,
    cost_krw: cost ?? null,
    difficulty: null,
    dong_name: raw.GUNAME || null,
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
    cta_url: raw.ORG_LINK || null,
    image_url: raw.MAIN_IMG?.trim() || null,
    deadline: toIsoDate(raw.END_DATE) ?? null,
    source_label: "서울시 문화행사",
    time_start_hour: startHour ?? null,
    time_end_hour: startHour != null ? Math.min(startHour + 2, 24) : null,
  };
}

// ── 한눈에보는문화정보 → culture ──────────────────────────

export function mapCultureInfo(raw: Record<string, string>): OppRow | null {
  const seq = raw.seq?.trim();
  const title = raw.title?.trim();
  if (!seq || !title) return null;
  const point = parsePoint(raw.gpsY, raw.gpsX);
  return {
    source: "culture_info",
    category: "culture",
    external_id: seq,
    title,
    summary: [raw.sigungu, raw.place, raw.realmName].filter(Boolean).join(" · ") || title,
    cost_krw: null,
    difficulty: null,
    dong_name: [raw.area, raw.sigungu].filter(Boolean).join(" ") || null,
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
    cta_url: null,
    image_url: raw.thumbnail?.trim() || null,
    deadline: toIsoDate(raw.endDate) ?? null,
    source_label: "한눈에보는문화정보",
    time_start_hour: null,
    time_end_hour: null,
  };
}

// ── 두루누비 걷기길 → active ──────────────────────────────

export function mapTrail(raw: Record<string, string>): OppRow | null {
  const id = raw.crsIdx?.trim();
  const title = raw.crsKorNm?.trim();
  if (!id || !title) return null;
  const level = Number(raw.crsLevel);
  const difficulty =
    Number.isFinite(level) && level >= 1 && level <= 3 ? (level - 1) / 2 : null;
  const km = raw.crsDstnc?.trim();
  const summary =
    [raw.sigun, km ? `${km}km` : undefined, raw.crsSummary?.replace(/<[^>]+>/g, "").trim()]
      .filter(Boolean)
      .join(" · ") || title;
  return {
    source: "trail",
    category: "active",
    external_id: id,
    title,
    summary,
    cost_krw: 0,
    difficulty,
    dong_name: raw.sigun || null,
    lat: null,
    lng: null,
    cta_url: raw.gpxpath || null,
    image_url: null,
    deadline: null,
    source_label: "두루누비",
    time_start_hour: null,
    time_end_hour: null,
  };
}

// ── 공공체육시설 → active ─────────────────────────────────
// ⚠️ 필드명 미확정(추정) — 발급 응답 확정 후 교체. core sports-facility.ts 미러.

export function mapSportsFacility(raw: Record<string, string>): OppRow | null {
  const title = raw.FCLTY_NM?.trim();
  if (!title) return null;
  const addr = raw.RDNMADR?.trim() || raw.LNMADR?.trim();
  const externalId = raw.FCLTY_SN?.trim() || hashKey(`${title}|${addr ?? ""}`);
  const point = parsePoint(raw.LATITUDE, raw.LONGITUDE);
  const summary =
    [raw.FCLTY_TY_NM, raw.SIGNGU_NM, addr].map((s) => s?.trim()).filter(Boolean).join(" · ") ||
    title;
  return {
    source: "sports_facility",
    category: "active",
    external_id: externalId,
    title,
    summary,
    // 시설은 무료·유료가 섞임 — 요금 미상이면 0이 아니라 null.
    cost_krw: parseFeeKrw(raw.UTILIZA_CHRGE) ?? null,
    difficulty: null,
    dong_name: raw.SIGNGU_NM?.trim() || null,
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
    cta_url: raw.HMPG_URL?.trim() || null,
    image_url: null,
    deadline: null,
    source_label: "공공체육시설",
    time_start_hour: null,
    time_end_hour: null,
  };
}

// ── 서울시 일자리 → side_job (파트/단기만) ─────────────────

// ⚠️ 분류 규칙 SoT는 core seoul-jobs.ts(PART_TIME_KEYWORDS). 여기 목록은 그 미러다.
// (계약직은 단기 보장이 없어 core와 함께 제외 — 목록을 core와 일치시킨다.)
const PART_KEYWORDS = ["파트", "시간제", "단기", "아르바이트", "알바", "일용"];

export function mapSeoulJob(raw: Record<string, string>): OppRow | null {
  const empType = raw.EMPLYM_STLE_CMMN_MM || "";
  // 정규직/기간의 정함 없음 등 풀타임 제외.
  if (empType.includes("정규") || empType.includes("정함이 없")) return null;
  // 파트/시간제/단기만 채택(미상은 제외 — 문화·여가 컨셉 유지).
  if (empType && !PART_KEYWORDS.some((k) => empType.includes(k))) return null;

  const id = raw.JO_REQST_NO?.trim();
  const jobName = raw.JOBCODE_NM?.trim();
  if (!id || !jobName) return null;

  const title = raw.CMPNY_NM ? `${raw.CMPNY_NM} · ${jobName}` : jobName;
  const startHour = parseHour(raw.WORK_TIME_NM || raw.DTY_CN);
  return {
    source: "seoul_jobs",
    category: "side_job",
    external_id: id,
    title,
    summary: [raw.CMPNY_NM, empType, raw.WORK_PARAR_BASS_ADRES_CN].filter(Boolean).join(" · ") || title,
    // side_job의 cost_krw는 지출이 아니라 벌이(income) — UI에서 카테고리로 분기 표기.
    cost_krw: parseFeeKrw(raw.HOPE_WAGE) ?? null,
    difficulty: null,
    dong_name: raw.WORK_PARAR_BASS_ADRES_CN || null,
    lat: null,
    lng: null,
    cta_url: null,
    image_url: null,
    deadline: toIsoDate(raw.RCEPT_CLOS) ?? null,
    source_label: "서울시 일자리플러스센터",
    time_start_hour: startHour ?? null,
    time_end_hour: startHour != null ? Math.min(startHour + 4, 24) : null,
  };
}
