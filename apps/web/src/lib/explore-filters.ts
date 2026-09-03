import { EXPLORE_CATEGORY_FILTERS, type OpportunityCategory } from "@motungi/core";

/**
 * 탐색(/explore)의 카테고리 필터 라벨 ↔ 카테고리.
 *
 * 여기 있는 이유: 라벨이 URL 파라미터(`/explore?cat=`)의 값이라 화면 밖에서도 필요하다.
 * 리포트의 "더 찾아보기"가 원픽 카테고리로 프리필하려면 같은 라벨을 만들어야 하는데,
 * 페이지 컴포넌트에서 import하면 순환이 생긴다.
 *
 * "전체"는 category=null이고 URL엔 쓰지 않는다(파라미터 없음 = 전체).
 *
 * taxonomy 자체는 core 단일 출처(`EXPLORE_CATEGORY_FILTERS`, M-080) — mobile(explore.tsx)과
 * 동일 배열을 공유한다. web 전용 헬퍼(filterLabelOf/exploreHref)만 이 파일에 남긴다.
 */
export const FILTERS = EXPLORE_CATEGORY_FILTERS;

/**
 * 카테고리 → 탐색 필터 라벨. 매칭되는 라벨이 없으면 null
 * (URL에 넣지 않는다 — 존재하지 않는 필터로 목록이 비면 안 된다).
 */
export function filterLabelOf(category: OpportunityCategory | undefined): string | null {
  if (!category) return null;
  return FILTERS.find((f) => f.category === category)?.label ?? null;
}

/** 카테고리로 프리필된 탐색 링크. 매칭 라벨이 없으면 필터 없는 /explore. */
export function exploreHref(category: OpportunityCategory | undefined): string {
  const label = filterLabelOf(category);
  return label ? `/explore?cat=${encodeURIComponent(label)}` : "/explore";
}
