/**
 * 한눈에보는문화정보 어댑터 (전국 culture 소스, 서울 문화행사 보조).
 * 소스: data.go.kr B553457/cultureinfo (공용 인증키).
 *
 * 서울 문화행사와 중복 가능 → 적재 계층이 title+장소+기간으로 dedup.
 * 요금 정보가 응답에 없어 costKrw는 미상(undefined)으로 둔다.
 */
import type { Opportunity } from "../types";
import { toIsoDate } from "./util";

/** cultureinfo item (실제 필드명). */
export interface RawCultureInfo {
  /** 고유 seq */
  seq: string;
  title: string;
  /** 시작일 YYYYMMDD */
  startDate?: string;
  /** 종료일 YYYYMMDD */
  endDate?: string;
  place?: string;
  /** 분야 (전시/공연…) */
  realmName?: string;
  /** 시도 */
  area?: string;
  /** 시군구 */
  sigungu?: string;
  thumbnail?: string;
  /** 경도 */
  gpsX?: string;
  /** 위도 */
  gpsY?: string;
}

function parsePoint(lat?: string, lng?: string): { lat: number; lng: number } | undefined {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || (la === 0 && lo === 0)) return undefined;
  return { lat: la, lng: lo };
}

export function normalizeCultureInfo(raw: RawCultureInfo): Opportunity | null {
  const seq = raw.seq?.trim();
  const title = raw.title?.trim();
  if (!seq || !title) return null;

  // area(시도)+sigungu(구) 결합 — 수도권 필터가 시도 접두어로 판정 가능하도록.
  const dongName = [raw.area, raw.sigungu].filter(Boolean).join(" ") || undefined;
  return {
    id: `culture-info:${seq}`,
    source: "culture_info",
    category: "culture",
    title,
    summary: [raw.sigungu, raw.place, raw.realmName].filter(Boolean).join(" · ") || title,
    // 요금 정보 없음 — 미상(무료로 단정하지 않음).
    location: { dongName, point: parsePoint(raw.gpsY, raw.gpsX) },
    deadline: toIsoDate(raw.endDate),
    sourceLabel: "한눈에보는문화정보",
  };
}

export function normalizeCultureInfos(records: RawCultureInfo[]): Opportunity[] {
  return records
    .map(normalizeCultureInfo)
    .filter((o): o is Opportunity => o != null);
}
