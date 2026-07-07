/**
 * 목업용 활동 데이터 — @motungi/core 의 Opportunity 형태를 따르되,
 * 화면 표시에 필요한 파생 문자열(비용 라벨·매칭도 등)을 함께 담는다.
 * 실제 데이터는 이후 소스 어댑터(문화행사/두루누비/일자리)가 이 형태로 채운다.
 */
import type { GeoPoint, Opportunity, OpportunityCategory } from "@motungi/core";

/** 동네 → 대표 좌표. distance 스코어링 및 위치 앵커에 사용(행정동 API 전까지 근사값). */
export const NEIGHBORHOOD_POINTS: Record<string, GeoPoint> = {
  망원동: { lat: 37.5556, lng: 126.9019 },
  성수동: { lat: 37.5445, lng: 127.0559 },
  연남동: { lat: 37.5638, lng: 126.9256 },
  판교동: { lat: 37.3948, lng: 127.1112 },
  합정동: { lat: 37.5495, lng: 126.9138 },
};

export type MockOpportunity = Opportunity & {
  /** 카테고리 한글 라벨 (태그용) */
  categoryLabel: string;
  /** 비용 표시 문자열 (예: "무료", "₩12,000"). side_job이면 벌이(예: "+48만 원") */
  costLabel: string;
  /** 비용 단위/맥락 (예: "1인", "회당", "월") */
  costUnit: string;
  /** 매칭도 0~100 */
  matchScore: number;
  /** 상세 메타(칩) */
  meta: { label: string; value: string }[];
  /** 참여 방법 스텝 */
  steps?: string[];
  costNote?: string;
  tone: "brand" | "mint";
};

export const ONE_PICK: MockOpportunity = {
  id: "hangang-jazz",
  source: "seoul_culture",
  category: "culture",
  categoryLabel: "동네 문화·공연",
  title: "퇴근길 20분, 망원 한강 야간 재즈 소품 공연",
  summary:
    "망원 한강공원은 회사에서 15분. 방전형인 도윤님도 앉아서 즐기기 좋은 무료 야외 공연이에요.",
  costKrw: 0,
  costLabel: "무료",
  costUnit: "1인",
  costNote: "예약 없이 그냥 가면 돼요",
  matchScore: 94,
  difficulty: 0.1,
  location: { dongName: "망원동" },
  timeWindow: { startHour: 19, endHour: 21 },
  meta: [
    { label: "소요 시간", value: "약 1시간" },
    { label: "강도", value: "낮음" },
    { label: "시간대", value: "저녁 7시" },
  ],
  steps: [
    "퇴근길에 망원 한강공원 입구로 가요.",
    "돗자리나 벤치에 앉아 공연을 즐겨요.",
    "끝나고 근처 야시장에서 간단히 먹고 마무리해요.",
  ],
  sourceLabel: "서울시 문화행사 · 2026.06 갱신",
  ctaUrl: "#",
  tone: "brand",
};

export const RELATED: MockOpportunity[] = [
  {
    id: "gyeongui-walk",
    source: "trail",
    category: "active",
    categoryLabel: "동네 산책·운동",
    title: "경의선숲길 저녁 산책 코스",
    summary: "연남~홍대 3km, 조명 켜진 걷기길로 하루를 비워요.",
    costKrw: 0,
    costLabel: "무료",
    costUnit: "1인",
    matchScore: 88,
    difficulty: 0.2,
    location: { dongName: "연남동" },
    timeWindow: { startHour: 18, endHour: 22 },
    meta: [{ label: "거리", value: "3km" }],
    tone: "mint",
    sourceLabel: "두루누비 · 2026.06 갱신",
  },
  {
    id: "night-market",
    source: "commercial_area",
    category: "food",
    categoryLabel: "동네 먹거리",
    title: "망원시장 저녁 먹거리 골목",
    summary: "집에서 도보 7분, 퇴근 후 출출할 때 딱.",
    costKrw: 12000,
    costLabel: "₩12,000",
    costUnit: "1인",
    matchScore: 81,
    difficulty: 0.1,
    location: { dongName: "망원동" },
    timeWindow: { startHour: 18, endHour: 21 },
    meta: [{ label: "거리", value: "도보 7분" }],
    tone: "brand",
    sourceLabel: "소상공인 상권정보",
  },
];

/** B1 탐색 목록용 확장 데이터 */
export const EXPLORE_LIST: MockOpportunity[] = [
  ONE_PICK,
  RELATED[0]!,
  RELATED[1]!,
  {
    id: "drawing-class",
    source: "culture_info",
    category: "class",
    categoryLabel: "클래스·배움",
    title: "연남동 원데이 드로잉 클래스",
    summary: "연남동 공방 · 회당 2시간, 초보 환영",
    costKrw: 35000,
    costLabel: "₩35,000",
    costUnit: "회당",
    matchScore: 76,
    difficulty: 0.3,
    location: { dongName: "연남동" },
    timeWindow: { startHour: 19, endHour: 21 },
    meta: [],
    tone: "brand",
  },
  {
    id: "cafe-part",
    source: "seoul_jobs",
    category: "side_job",
    categoryLabel: "퇴근후 부업",
    title: "주말 오전 동네 카페 파트",
    summary: "토·일 4시간, 망원동 인근 · 원하는 시간만",
    costKrw: 480000,
    costLabel: "+48만 원",
    costUnit: "월",
    costNote: "용돈벌이로 딱",
    matchScore: 68,
    difficulty: 0.3,
    location: { dongName: "망원동" },
    timeWindow: { startHour: 9, endHour: 13 },
    meta: [{ label: "예상 시간", value: "주 8시간" }],
    tone: "brand",
    sourceLabel: "서울시 일자리플러스센터",
  },
];

export const CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  culture: "문화·공연",
  active: "운동·산책",
  side_job: "부업",
  class: "클래스",
  food: "먹거리",
  market: "마켓",
};

/** dongName → 좌표를 location.point에 채운다(스코어링 distance 축용). */
function withPoint<T extends MockOpportunity>(o: T): T {
  const dong = o.location?.dongName;
  const point = dong ? NEIGHBORHOOD_POINTS[dong] : undefined;
  if (!point || o.location?.point) return o;
  return { ...o, location: { ...o.location, point } };
}

/** 스코어링에 넣을 전체 후보(좌표 주입 완료). 화면은 EXPLORE_LIST 대신 이걸 쓴다. */
export const ALL_OPPORTUNITIES: MockOpportunity[] = EXPLORE_LIST.map(withPoint);

/** id로 단일 활동 조회. 없으면 undefined. */
export function findOpportunity(id?: string): MockOpportunity | undefined {
  if (!id) return undefined;
  return ALL_OPPORTUNITIES.find((o) => o.id === id);
}
