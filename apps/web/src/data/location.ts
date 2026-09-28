import type { NeighborhoodSearchResult } from "@motungi/core";
import type { NeighborhoodPick } from "@/data/opportunities";

/**
 * 선택이 어디서 왔는지 — 배너·위치카드가 출처를 눈으로 알려주기 위한 태그.
 * app/location/page.tsx(컨테이너)와 components/location-*(뷰)이 함께 참조하므로
 * 두 레이어 아래(data/)에 둔다 — components는 app을 import할 수 없다
 * (import/no-restricted-paths, apps/web/.eslintrc.json).
 */
export type LocationPickSource = "default" | "current" | "search" | "popular";

/** 검색 결과(NeighborhoodSearchResult) → 선택 객체. 좌표를 그대로 실어 앵커에 주입 가능하게. */
export function locationSearchItemToPick(it: NeighborhoodSearchResult): NeighborhoodPick {
  return {
    admCode: it.admCode,
    dongName: it.dongName,
    region: it.sigungu,
    point: { lat: it.lat, lng: it.lng },
  };
}
