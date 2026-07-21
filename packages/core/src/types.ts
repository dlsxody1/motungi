/**
 * 모퉁이 Corner — 공용 도메인 타입.
 * 웹(Next.js)·앱(Expo)이 동일하게 import 한다.
 */

/**
 * 활동 카테고리 (기획: "퇴근하고 뭐하지?" — 동네 문화·여가 큐레이션).
 * 주력: culture / active / side_job. 보조: class / food / market.
 */
export type OpportunityCategory =
  | "culture" // 공연·전시
  | "active" // 운동·산책·걷기길
  | "side_job" // 퇴근후 파트·단기 부업
  | "class" // 클래스·배움
  | "food" // 먹거리·맛집
  | "market"; // 마켓·플리마켓

/**
 * 데이터 소스 (docs/DATA-SOURCES.md · docs/API-DESIGN.md).
 * - seoul_culture: 서울시 문화행사 (culture, 1순위).
 * - culture_info: 한눈에보는문화정보 data.go.kr (culture, 전국).
 * - sports_facility: 공공체육시설 data.go.kr (active).
 * - trail: 두루누비 걷기길 data.go.kr (active).
 * - seoul_jobs: 서울시 일자리플러스센터 (side_job, 파트/단기만).
 * - commercial_area: 소상공인 상권정보 (food 보조 + 근거 맥락).
 */
export type SourceKind =
  | "seoul_culture"
  | "culture_info"
  | "sports_facility"
  | "trail"
  | "seoul_jobs"
  | "commercial_area";

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

/**
 * 사용자 위치 앵커 (공간 축의 뼈대).
 * 집·회사 두 지점을 잡고, 거리는 두 앵커 중 가까운 쪽(min)으로 스코어링.
 */
export interface UserAnchors {
  home?: Location;
  work?: Location;
}

/** 활동 가능 시간대 메타 (스코어링 time 축용). 24시간제. */
export interface TimeWindow {
  /** 시작 시각(시). e.g. 18 */
  startHour: number;
  /** 종료 시각(시). e.g. 22 */
  endHour: number;
}

/** 정규화된 활동 카드 (소스별 어댑터가 이 형태로 변환) */
export interface Opportunity {
  id: string;
  source: SourceKind;
  category: OpportunityCategory;
  title: string;
  /** 근거/요약 한 줄 */
  summary: string;
  /** 참가/이용 비용(원). 0 = 무료. side_job이면 반대로 벌이(income) 성격 — 표시 시 costHeading으로 "예상 수입" 구분. */
  costKrw?: number;
  /** 시작 난이도 0(쉬움)~1(어려움) */
  difficulty?: number;
  location?: Location;
  /** 활동 가능 시간대 (퇴근후 18~22시 겹침 가점에 사용) */
  timeWindow?: TimeWindow;
  /** 제휴/외부 상세 연결 URL */
  ctaUrl?: string;
  /** 대표 이미지(썸네일) URL. 원본 제공 소스(문화행사·문화정보)만 채워짐 */
  imageUrl?: string;
  /** 마감일(있으면 D-day 계산) */
  deadline?: string; // ISO date
  /** 데이터 출처·갱신일 (신뢰 표기, §8) */
  sourceLabel?: string;
  fetchedAt?: string; // ISO datetime
}
