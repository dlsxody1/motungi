/**
 * 공공체육시설 어댑터 (active 소스).
 * 소스: data.go.kr 공공체육시설 상세 (15107764, 공용 인증키, 자동승인).
 *
 * 동네에서 바로 갈 수 있는 운동 장소(수영장·체육관·풋살장·헬스장 등)를 active 카드로.
 * 전국 데이터 — 적재 계층이 주소/자치구로 서울·수도권만 필터한다.
 *
 * ⚠️ 필드명 미확정: 발급 응답 1건을 받아 아래 RawSportsFacility 필드명을 확정한다.
 *    지금은 계약(무엇을 어디로 매핑할지)만 고정하고, 필드명은 추정값 + TODO 표기.
 *    (seoul-jobs.ts와 동일한 미확정 소스 처리 방식.)
 */
import type { Opportunity } from "../types";
import { parseFeeKrw } from "./util";

/**
 * 공공체육시설 상세 원본 레코드(추정 스키마).
 * TODO(발급후): 실제 응답 필드명으로 교체. data.go.kr 표준데이터 관용상 대문자 스네이크.
 */
export interface RawSportsFacility {
  /** 시설 일련번호 (없으면 시설명+주소 해시로 대체) — 예: FCLTY_SN */
  FCLTY_SN?: string;
  /** 시설명 — 예: FCLTY_NM */
  FCLTY_NM: string;
  /** 시설유형명 ("수영장"|"체육관"|"축구장"…) — 예: FCLTY_TY_NM */
  FCLTY_TY_NM?: string;
  /** 소재지 도로명주소 — 예: RDNMADR */
  RDNMADR?: string;
  /** 소재지 지번주소 — 예: LNMADR */
  LNMADR?: string;
  /** 자치구/시군구 — 예: SIGNGU_NM */
  SIGNGU_NM?: string;
  /** 위도 — 예: LATITUDE */
  LATITUDE?: string;
  /** 경도 — 예: LONGITUDE */
  LONGITUDE?: string;
  /** 이용요금 문자열 ("무료"|"1회 3,000원"…) — 예: UTILIZA_CHRGE */
  UTILIZA_CHRGE?: string;
  /** 홈페이지/예약 URL — 예: HMPG_URL */
  HMPG_URL?: string;
}

/** 결정적 문자열 해시(djb2). 시설 일련번호가 없을 때 external_id 생성용. */
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

export function normalizeSportsFacility(raw: RawSportsFacility): Opportunity | null {
  const title = raw.FCLTY_NM?.trim();
  if (!title) return null;

  const addr = raw.RDNMADR?.trim() || raw.LNMADR?.trim();
  const externalId = raw.FCLTY_SN?.trim() || hashKey(`${title}|${addr ?? ""}`);
  const point = parsePoint(raw.LATITUDE, raw.LONGITUDE);

  const summaryParts = [raw.FCLTY_TY_NM, raw.SIGNGU_NM, addr].map((s) => s?.trim()).filter(Boolean);

  return {
    id: `sports:${externalId}`,
    source: "sports_facility",
    category: "active",
    title,
    summary: summaryParts.join(" · ") || title,
    // 시설은 무료·유료가 섞여 있음 — 요금 미상이면 0(무료)이 아니라 undefined로 둔다.
    costKrw: parseFeeKrw(raw.UTILIZA_CHRGE),
    location:
      raw.SIGNGU_NM || point ? { dongName: raw.SIGNGU_NM?.trim(), point } : undefined,
    ctaUrl: raw.HMPG_URL?.trim() || undefined,
    sourceLabel: "공공체육시설",
  };
}

export function normalizeSportsFacilities(records: RawSportsFacility[]): Opportunity[] {
  return records
    .map(normalizeSportsFacility)
    .filter((o): o is Opportunity => o != null);
}
