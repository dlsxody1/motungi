/**
 * 목업용 기회 데이터 — @motungi/core 의 Opportunity 형태를 따르되,
 * 화면 표시에 필요한 파생 문자열(수익 라벨·매칭도 등)을 함께 담는다.
 * 실제 데이터는 이후 소스 어댑터(상권/청년정책/제휴)가 이 형태로 채운다.
 */
import type { Opportunity, OpportunityCategory } from "@motungi/core";

export type MockOpportunity = Opportunity & {
  /** 카테고리 한글 라벨 (태그용) */
  categoryLabel: string;
  /** 수익 표시 문자열 (예: "+48만 원") */
  incomeLabel: string;
  /** 수익 단위 (예: "월", "건당", "연") */
  incomeUnit: string;
  /** 매칭도 0~100 */
  matchScore: number;
  /** 상세 메타(칩) */
  meta: { label: string; value: string }[];
  /** 시작 방법 스텝 */
  steps?: string[];
  incomeNote?: string;
  tone: "brand" | "mint";
};

export const ONE_PICK: MockOpportunity = {
  id: "cafe-barista",
  source: "commercial_area",
  category: "side_job",
  categoryLabel: "동네 기반 부업",
  title: "주말 오전, 동네 카페 오픈 바리스타 파트",
  summary:
    "망원동은 카페 밀도 상위 5%. 방전형인 도윤님께 맞는 주말 오전 단타임 수요가 많아요.",
  estimatedIncomeKrw: 480000,
  incomeLabel: "+48만 원",
  incomeUnit: "월",
  incomeNote: "한 달이면 에어팟 프로 2개",
  matchScore: 94,
  difficulty: 0.2,
  location: { dongName: "망원동" },
  meta: [
    { label: "예상 시간", value: "주 8시간" },
    { label: "난이도", value: "낮음" },
    { label: "정산", value: "주급" },
  ],
  steps: [
    "제휴 채널에서 망원동 카페 단타임 공고를 확인해요.",
    "간단 프로필로 지원해요. 이력서는 필요 없어요.",
    "매장 확인 후 첫 주말 오전부터 시작해요.",
  ],
  sourceLabel: "소상공인 상권정보 · 2026.06 갱신",
  ctaUrl: "#",
  tone: "brand",
};

export const RELATED: MockOpportunity[] = [
  {
    id: "youth-rent",
    source: "youth_policy",
    category: "subsidy",
    categoryLabel: "내게 맞는 지원금",
    title: "청년 월세 한시 특별지원",
    summary: "만 19~34세 · 마포구 거주 요건 충족",
    estimatedIncomeKrw: 2400000,
    incomeLabel: "연 240만",
    incomeUnit: "지원",
    matchScore: 88,
    location: { dongName: "마포구" },
    meta: [{ label: "대상", value: "만 19~34세" }],
    tone: "mint",
    sourceLabel: "온통청년 · 2026.06 갱신",
  },
  {
    id: "market-delivery",
    source: "affiliate_feed",
    category: "gig_deal",
    categoryLabel: "동네 긱 · 딜",
    title: "망원시장 배달 피커 단기 긱",
    summary: "집에서 도보 7분 · 원하는 시간만",
    estimatedIncomeKrw: 15000,
    incomeLabel: "건당 1.2~1.8만",
    incomeUnit: "건",
    matchScore: 81,
    location: { dongName: "망원동" },
    meta: [{ label: "거리", value: "도보 7분" }],
    tone: "brand",
    sourceLabel: "제휴 피드",
  },
];

/** B1 탐색 목록용 확장 데이터 */
export const EXPLORE_LIST: MockOpportunity[] = [
  ONE_PICK,
  RELATED[0]!,
  RELATED[1]!,
  {
    id: "drawing-class",
    source: "affiliate_feed",
    category: "class_talent",
    categoryLabel: "클래스 · 재능",
    title: "동네 원데이 드로잉 클래스 강사",
    summary: "연남동 공방 · 회당 2시간",
    estimatedIncomeKrw: 80000,
    incomeLabel: "회당 8만",
    incomeUnit: "회",
    matchScore: 76,
    location: { dongName: "연남동" },
    meta: [],
    tone: "brand",
  },
  {
    id: "parking-share",
    source: "affiliate_feed",
    category: "space_used",
    categoryLabel: "공간 · 중고",
    title: "안 쓰는 주차공간 시간제 대여",
    summary: "우리 빌라 · 평일 낮 유휴",
    estimatedIncomeKrw: 90000,
    incomeLabel: "월 9만",
    incomeUnit: "월",
    matchScore: 68,
    location: { dongName: "망원동" },
    meta: [],
    tone: "brand",
  },
];

export const CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  side_job: "부업",
  subsidy: "지원금",
  gig_deal: "긱 · 딜",
  class_talent: "클래스 · 재능",
  space_used: "공간 · 중고",
};
