/**
 * 모퉁이 Corner — 공용 도메인 타입.
 * 웹(Next.js)·앱(Expo)이 동일하게 import 한다.
 */

/** 기회 카테고리 (기획서 §5) */
export type OpportunityCategory =
  | "side_job" // 부업
  | "subsidy" // 지원금 / 청년정책
  | "gig_deal" // 긱·딜
  | "class_talent" // 클래스·재능
  | "space_used"; // 공간·중고

/**
 * 데이터 소스 (기획서 §7 + docs/DATA-SOURCES.md).
 * - seoul_jobs: 서울시 일자리플러스센터 채용정보 (side_job/gig_deal 본체). 워크넷 대체.
 * - youth_policy: 온통청년 청년정책 (subsidy).
 * - commercial_area: 소상공인 상권정보 (추천 근거 맥락).
 * - affiliate_feed: 제휴 피드 (보류).
 */
export type SourceKind =
  | "seoul_jobs"
  | "youth_policy"
  | "commercial_area"
  | "affiliate_feed";

/** 행정동 단위 위치 */
export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Location {
  /** 행정동 코드 (법정동/행정동) */
  admCode?: string;
  /** 표시용 동 이름 e.g. "망원동" */
  dongName?: string;
  point?: GeoPoint;
}

/** 정규화된 기회 카드 (소스별 어댑터가 이 형태로 변환) */
export interface Opportunity {
  id: string;
  source: SourceKind;
  category: OpportunityCategory;
  title: string;
  /** 근거/요약 한 줄 */
  summary: string;
  /** 예상 수익(원, 월 기준). 정책이면 지원금액. */
  estimatedIncomeKrw?: number;
  /** 시작 난이도 0(쉬움)~1(어려움) */
  difficulty?: number;
  location?: Location;
  /** 제휴/외부 상세 연결 URL */
  ctaUrl?: string;
  /** 마감일(있으면 D-day 계산) */
  deadline?: string; // ISO date
  /** 데이터 출처·갱신일 (신뢰 표기, §8) */
  sourceLabel?: string;
  fetchedAt?: string; // ISO datetime
}
