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
  /** 시·구 표기 e.g. "마포구" / "서울 마포구". 매칭엔 normalizeGu로 정규화해 쓸 것. */
  region?: string;
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
  /**
   * 활동 설명 원문(산문). summary가 "구 · 장소 · 장르" 조인 문자열인 것과 달리 실제 문장이다.
   * 자연어 검색·LLM 근거 생성의 입력. **소스별 채움률이 크게 달라 없는 게 정상**이다
   * (실측: trail 100%, seoul_culture 약 20%, culture_info 0%). 마이그레이션 0015.
   */
  description?: string;
  /**
   * 원본 장르 문자열(0017). seoul_culture=CODENAME("교육/체험"·"전시/미술"·"콘서트"…),
   * culture_info=realmName. 소스별 어휘가 달라 통합 enum을 두지 않고 원문을 보존한다.
   */
  genre?: string;
  /**
   * 관람/참여 대상 원문(0017). seoul_culture=USE_TRGT.
   * **null/undefined는 "미상"이며 성인 가능으로 취급**한다 — 모르는 걸 배제하지 않는다.
   * 아동 전용 판정은 adapters/audience.ts의 isKidsOnly가 SoT.
   */
  audience?: string;
  /** 참가/이용 비용(원). 0 = 무료. side_job이면 반대로 벌이(income) 성격 — 표시 시 costHeading으로 "예상 수입" 구분. */
  costKrw?: number;
  /** 시작 난이도 0(쉬움)~1(어려움) */
  difficulty?: number;
  location?: Location;
  /**
   * 활동 시간대 — **표시 전용**(카드 메타 "19–21시", 상세, 근거 문구).
   * 시작·종료가 **둘 다 실측일 때만** 채워진다. 추정값을 넣으면 카드에 사실이 아닌
   * 시간대가 찍힌다(과거 실제 버그 — 어댑터가 start+2로 지어내던 것을 고쳤다).
   */
  timeWindow?: TimeWindow;
  /**
   * 활동 시간대 — **스코어링 전용**(time 축 겹침 계산).
   *
   * timeWindow와 나눈 이유: seoul_culture는 종료시각을 주지 않아(어댑터가 일부러
   * 지어내지 않는다) 한 필드로 합치면 파싱해둔 시작시각까지 함께 버려진다. 실측
   * (2026-09-03) 229행이 "시작만 있음"이라 time 축(가중치 0.15)이 통째로 죽어 있었다.
   * 종료가 실측이면 그 값을, 없으면 기본 지속시간으로 추정한 창을 담는다 —
   * 추정이 **점수에는 들어가되 화면에는 새지 않는다.**
   */
  scoringWindow?: TimeWindow;
  /** 제휴/외부 상세 연결 URL */
  ctaUrl?: string;
  /** 대표 이미지(썸네일) URL. 원본 제공 소스(문화행사·문화정보)만 채워짐 */
  imageUrl?: string;
  /** 마감일(있으면 D-day 계산) */
  deadline?: string; // ISO date
  /** 데이터 출처·갱신일 (신뢰 표기, §8) */
  sourceLabel?: string;
  /** 걷기길 코스 안내(trail 전용). 두루누비 travelerinfo 파싱 결과. */
  courseStart?: string;
  courseEnd?: string;
  /** 시점/종점 형식이 아닌 주의사항(DMZ 코스 등). courseStart와 배타적. */
  courseNotes?: string[];
  /** 총 소요시간(분). */
  durationMin?: number;
  /** 순환형이면 true — 비순환형은 종점에서 돌아와야 한다. */
  isLoop?: boolean;
  fetchedAt?: string; // ISO datetime
}
