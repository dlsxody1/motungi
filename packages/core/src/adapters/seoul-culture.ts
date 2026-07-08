/**
 * 서울시 문화행사 정보 어댑터 (1순위 culture 소스).
 * 소스: 서울 열린데이터광장 culturalEventInfo (개인 인증키, JSON, 공공누리 1유형).
 *
 * 실제 응답(2026-07)으로 필드 확정. 고유 ID 필드가 없어 제목+시작일+장소로 external_id 생성.
 */
import type { Opportunity } from "../types";
import { parseFeeKrw, parseHour, toIsoDate } from "./util";

/** culturalEventInfo row (실제 필드명). */
export interface RawSeoulCulture {
  /** 분류 (콘서트/전시/축제…) */
  CODENAME?: string;
  /** 자치구 */
  GUNAME?: string;
  /** 공연/행사명 */
  TITLE: string;
  /** 장소 */
  PLACE?: string;
  /** 이용 대상 */
  USE_TRGT?: string;
  /** 이용 요금 ("전석 15,000원" 등) */
  USE_FEE?: string;
  /** 홈페이지/예매 링크 */
  ORG_LINK?: string;
  /** 대표 이미지 */
  MAIN_IMG?: string;
  /** 시작일 "2026-10-28 00:00:00.0" */
  STRTDATE?: string;
  /** 종료일 */
  END_DATE?: string;
  /** 경도 */
  LOT?: string;
  /** 위도 */
  LAT?: string;
  /** 유무료 ("무료"/"유료") */
  IS_FREE?: string;
  /** 공연시간 "수요일 11:00" */
  PRO_TIME?: string;
}

/** 결정적 문자열 해시(djb2). Edge/브라우저 어디서나 동일 결과. */
function hashKey(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function parsePoint(lat?: string, lng?: string): { lat: number; lng: number } | undefined {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || (la === 0 && lo === 0)) return undefined;
  return { lat: la, lng: lo };
}

/** 무료 판정: IS_FREE="무료"거나 요금 파싱 결과가 0. */
function resolveCost(raw: RawSeoulCulture): number | undefined {
  if (raw.IS_FREE?.includes("무료")) return 0;
  return parseFeeKrw(raw.USE_FEE);
}

export function normalizeSeoulCulture(raw: RawSeoulCulture): Opportunity | null {
  const title = raw.TITLE?.trim();
  if (!title) return null;

  const externalId = hashKey(`${title}|${raw.STRTDATE ?? ""}|${raw.PLACE ?? ""}`);
  const point = parsePoint(raw.LAT, raw.LOT);
  const startHour = parseHour(raw.PRO_TIME);

  return {
    id: `seoul-culture:${externalId}`,
    source: "seoul_culture",
    category: "culture",
    title,
    summary: buildSummary(raw),
    costKrw: resolveCost(raw),
    location: { dongName: raw.GUNAME, point },
    timeWindow: startHour != null ? { startHour, endHour: Math.min(startHour + 2, 24) } : undefined,
    ctaUrl: raw.ORG_LINK || undefined,
    deadline: toIsoDate(raw.END_DATE),
    sourceLabel: "서울시 문화행사",
  };
}

function buildSummary(raw: RawSeoulCulture): string {
  const parts = [raw.GUNAME, raw.PLACE, raw.CODENAME].filter(Boolean);
  return parts.join(" · ") || raw.TITLE;
}

export function normalizeSeoulCultures(records: RawSeoulCulture[]): Opportunity[] {
  return records
    .map(normalizeSeoulCulture)
    .filter((o): o is Opportunity => o != null);
}
