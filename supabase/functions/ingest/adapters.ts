/**
 * 소스 어댑터 (Deno/Edge 런타임용).
 *
 * ⚠️ 로직 원본은 packages/core/src/adapters (TDD 테스트 소유).
 *    Edge Function은 Deno라 npm 워크스페이스를 직접 import하기 어려워, 순수 변환 로직을
 *    여기 복제한다. 필드 매핑·파서를 바꿀 때는 core와 이 파일을 함께 수정할 것.
 */

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
  deadline: string | null;
  source_label: string;
  time_start_hour: number | null;
  time_end_hour: number | null;
}

// ── 공통 파서 (core/adapters/util.ts 미러) ─────────────────

export function parseFeeKrw(fee?: string | number): number | undefined {
  if (fee == null) return undefined;
  if (typeof fee === "number") return Number.isFinite(fee) ? fee : undefined;
  const s = fee.trim();
  if (!s) return undefined;
  if (s.includes("무료")) return 0;
  const amounts: number[] = [];
  for (const m of s.matchAll(/([\d,.]+)\s*만/g)) {
    const n = Number(m[1]!.replace(/,/g, ""));
    if (Number.isFinite(n)) amounts.push(Math.round(n * 10_000));
  }
  if (amounts.length === 0) {
    for (const m of s.matchAll(/([\d,]{3,})/g)) {
      const n = Number(m[1]!.replace(/,/g, ""));
      if (Number.isFinite(n) && n > 0) amounts.push(n);
    }
  }
  return amounts.length ? Math.min(...amounts) : undefined;
}

export function parseHour(time?: string): number | undefined {
  if (!time) return undefined;
  const s = time.trim();
  const hm = s.match(/(\d{1,2}):(\d{2})/);
  if (hm) {
    const h = Number(hm[1]);
    if (h >= 0 && h <= 24) return h % 24;
  }
  const kor = s.match(/(오전|오후)?\s*(\d{1,2})\s*시/);
  if (kor) {
    let h = Number(kor[2]);
    if (h >= 0 && h <= 24) {
      if (kor[1] === "오후" && h < 12) h += 12;
      if (kor[1] === "오전" && h === 12) h = 0;
      return h % 24;
    }
  }
  return undefined;
}

export function toIsoDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (!s) return undefined;
  const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const dash = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (dash) return `${dash[1]}-${dash[2]!.padStart(2, "0")}-${dash[3]!.padStart(2, "0")}`;
  return undefined;
}

function hashKey(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function num(v?: string): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ── 서울시 문화행사 → culture ──────────────────────────────

export function mapSeoulCulture(raw: Record<string, string>): OppRow | null {
  const title = raw.TITLE?.trim();
  if (!title) return null;
  const externalId = hashKey(`${title}|${raw.STRTDATE ?? ""}|${raw.PLACE ?? ""}`);
  const cost = raw.IS_FREE?.includes("무료") ? 0 : parseFeeKrw(raw.USE_FEE);
  const startHour = parseHour(raw.PRO_TIME);
  const la = num(raw.LAT);
  const lo = num(raw.LOT);
  return {
    source: "seoul_culture",
    category: "culture",
    external_id: externalId,
    title,
    summary: [raw.GUNAME, raw.PLACE, raw.CODENAME].filter(Boolean).join(" · ") || title,
    cost_krw: cost ?? null,
    difficulty: null,
    dong_name: raw.GUNAME || null,
    lat: la && lo ? la : null,
    lng: la && lo ? lo : null,
    cta_url: raw.ORG_LINK || null,
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
  const la = num(raw.gpsY);
  const lo = num(raw.gpsX);
  return {
    source: "culture_info",
    category: "culture",
    external_id: seq,
    title,
    summary: [raw.sigungu, raw.place, raw.realmName].filter(Boolean).join(" · ") || title,
    cost_krw: null,
    difficulty: null,
    dong_name: [raw.area, raw.sigungu].filter(Boolean).join(" ") || null,
    lat: la && lo ? la : null,
    lng: la && lo ? lo : null,
    cta_url: null,
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
    deadline: null,
    source_label: "두루누비",
    time_start_hour: null,
    time_end_hour: null,
  };
}

// ── 서울시 일자리 → side_job (파트/단기만) ─────────────────

const PART_KEYWORDS = ["파트", "시간제", "단기", "아르바이트", "알바", "일용", "계약직"];

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
    deadline: toIsoDate(raw.RCEPT_CLOS) ?? null,
    source_label: "서울시 일자리플러스센터",
    time_start_hour: startHour ?? null,
    time_end_hour: startHour != null ? Math.min(startHour + 4, 24) : null,
  };
}
