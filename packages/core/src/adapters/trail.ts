/**
 * 두루누비 걷기길 어댑터 (active 소스).
 * 소스: data.go.kr B551011/Durunubi/courseList (공용 인증키).
 *
 * 전국 데이터 — 적재 계층이 sigun으로 서울/수도권만 필터한다.
 * 좌표는 gpxpath(GPX 파일)라 어댑터에서 채우지 않는다(적재 계층이 필요시 파싱).
 */
import type { Opportunity } from "../types";

/** Durunubi courseList item (실제 필드명). */
export interface RawTrail {
  /** 코스 고유 ID */
  crsIdx: string;
  /** 코스명 */
  crsKorNm: string;
  /** 총거리(km, 문자열) */
  crsDstnc?: string;
  /** 총 소요시간(분) */
  crsTotlRqrmHour?: string;
  /** 난이도 (1 쉬움 ~ 3 어려움) */
  crsLevel?: string;
  /** 요약 */
  crsSummary?: string;
  /** 상세 내용 */
  crsContents?: string;
  /** 지역 "부산 중구" */
  sigun?: string;
  /** GPX 경로 파일 URL */
  gpxpath?: string;
}

/** crsLevel(1~3) → difficulty(0~1). 범위 밖/미상은 undefined. */
function levelToDifficulty(level?: string): number | undefined {
  const n = Number(level);
  if (!Number.isFinite(n) || n < 1 || n > 3) return undefined;
  return (n - 1) / 2;
}

export function normalizeTrail(raw: RawTrail): Opportunity | null {
  const id = raw.crsIdx?.trim();
  const title = raw.crsKorNm?.trim();
  if (!id || !title) return null;

  const km = raw.crsDstnc?.trim();
  const summaryParts = [
    raw.sigun,
    km ? `${km}km` : undefined,
    raw.crsSummary?.replace(/<[^>]+>/g, "").trim(),
  ].filter(Boolean);

  return {
    id: `trail:${id}`,
    source: "trail",
    category: "active",
    title,
    summary: summaryParts.join(" · ") || title,
    costKrw: 0, // 걷기길은 무료
    difficulty: levelToDifficulty(raw.crsLevel),
    location: raw.sigun ? { dongName: raw.sigun } : undefined,
    ctaUrl: raw.gpxpath || undefined,
    sourceLabel: "두루누비",
  };
}

export function normalizeTrails(records: RawTrail[]): Opportunity[] {
  return records.map(normalizeTrail).filter((o): o is Opportunity => o != null);
}
