/**
 * 탐색 목록(/explore) 연산 — 순수 함수.
 *
 * **web·mobile 단일 출처.** 예전엔 같은 검색·정렬·집계를 web(app/explore/(list)/page.tsx)과
 * mobile(app/(tabs)/explore.tsx)이 각자 구현했고, 그 결과 **조용히 갈라졌다**(M-104):
 * web은 검색어를 공백으로 쪼개 AND 매칭하고 하이스택에 지역·카테고리 라벨까지 넣었는데,
 * mobile은 통짜 `includes` 하나뿐이라 "망원 재즈"가 0건이었고 지역명으로도 못 찾았다.
 * 한쪽만 고치면 또 갈라지므로 계산을 여기로 올린다 — 필터 taxonomy를
 * `EXPLORE_CATEGORY_FILTERS`로 통합한 M-080과 같은 처방이다.
 *
 * `view.ts`가 아니라 별 파일인 이유: view는 "한 Opportunity → 표시 문자열"(단일 행)이고
 * 여기는 **목록(배열) 연산**이다. `gu-summary.ts`가 같은 이유로 분리돼 있다.
 *
 * ⚠️ **캐싱은 여기서 하지 않는다.** core는 순수 함수만 두고 모듈 스코프 가변 상태를
 * 갖지 않는다. 하이스택 Map을 언제 다시 만들지는 호출부가 `useMemo`로 정한다
 * (목록 identity가 캐시 키다 — core가 WeakMap을 들어도 배열이 매번 새로 만들어져 안 걸린다).
 */
import { normalizeGenre } from "./genre";
import { nearestAnchorKm } from "./scoring";
import type { Location, Opportunity, OpportunityCategory, UserAnchors } from "./types";
import { EXPLORE_CATEGORY_FILTERS, normalizeGu } from "./view";

/**
 * 탐색 목록 연산이 요구하는 최소 입력.
 * web의 `MockOpportunity`와 mobile의 행 타입이 **둘 다** 이걸 만족한다 —
 * 더 넓게 잡으면(예: MockOpportunity 전체) mobile이 안 들어오고,
 * 더 좁게 잡으면 categoryLabel 검색이 불가능해진다.
 */
export type ExploreItem = Opportunity & { categoryLabel: string };

/** 난이도 "낮음"의 상한. web·mobile이 각자 0.33 리터럴을 들고 있던 것을 단일화한다. */
export const EASY_DIFFICULTY_MAX = 0.33;

/**
 * 행 하나의 검색 하이스택(소문자 조인 문자열).
 *
 * summary는 산문이 아니라 "구 · 장소 · 장르" 조인 문자열이라 지역·장소·장르가 이미 들어있다.
 * 반면 `categoryLabel`("동네 문화·공연")은 **우리가 붙인 라벨**이라 어디에도 없어서
 * 그대로 치면 0건이 나왔다 — 그래서 라벨과 정규화한 구 이름을 함께 넣는다.
 *
 * genre는 **원문과 통합 라벨을 둘 다** 넣는다. 소스마다 어휘가 갈려서
 * (전시/미술 vs 전시, 콘서트 vs 음악/콘서트) 원문만으로는 "미술"로 검색했을 때
 * culture_info 쪽이 통째로 빠진다.
 */
export function searchHaystack(o: ExploreItem): string {
  return [
    o.title,
    o.summary,
    o.categoryLabel,
    o.location?.dongName,
    normalizeGu(o.location?.dongName),
    o.genre,
    normalizeGenre(o.genre),
  ]
    // falsy 제거가 없으면 없는 필드가 "undefined" 문자열로 새어 들어가 오매칭을 만든다.
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * id → 하이스택 Map.
 *
 * 행별로 미리 만들어 두는 이유: 필터 안에서 만들면 **키 입력마다** (행 × 필드) join이 다시 돈다.
 * 언제 다시 만들지는 호출부가 정한다(위 파일 주석 참고).
 */
export function buildSearchHaystacks(items: readonly ExploreItem[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const o of items) m.set(o.id, searchHaystack(o));
  return m;
}

/**
 * 검색어 → 소문자 term 배열. 공백으로 쪼개므로 "망원 재즈"처럼 **떨어진 두 단어**도
 * 잡힌다(연속 부분문자열이 아니라서 통짜 `includes`로는 0건이었다).
 */
export function searchTerms(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** terms가 **전부** 하이스택에 있는가(AND). terms가 비면 검색을 안 한 것이므로 항상 true. */
export function matchesTerms(haystack: string | undefined, terms: readonly string[]): boolean {
  if (terms.length === 0) return true;
  // 하이스택이 없는 행(Map 미스)은 검색어가 있는 한 매칭될 수 없다.
  if (!haystack) return false;
  return terms.every((t) => haystack.includes(t));
}

export interface ExploreFilterInput {
  /** `EXPLORE_CATEGORY_FILTERS`의 category. null이면 전체. */
  category: OpportunityCategory | null;
  /** `normalizeGu` 결과와 일치해야 하는 구 라벨. null이면 전체. */
  region: string | null;
  /** `searchTerms()` 결과. 빈 배열이면 검색 없음. */
  terms: readonly string[];
  /** 난이도 `EASY_DIFFICULTY_MAX` 이하만. */
  easyOnly: boolean;
  /** `buildSearchHaystacks()` 결과. terms가 비면 쓰이지 않는다. */
  haystacks: ReadonlyMap<string, string>;
}

/** 카테고리 · 지역 · 검색어(AND) · 난이도를 모두 만족하는 행만. */
export function filterExplore<T extends ExploreItem>(
  items: readonly T[],
  { category, region, terms, easyOnly, haystacks }: ExploreFilterInput,
): T[] {
  return items.filter((o) => {
    if (category && o.category !== category) return false;
    if (region && normalizeGu(o.location?.dongName) !== region) return false;
    if (!matchesTerms(haystacks.get(o.id), terms)) return false;
    // difficulty가 없는 행은 "낮은 난이도"로 볼 근거가 없으므로 제외한다.
    if (easyOnly && !(o.difficulty != null && o.difficulty <= EASY_DIFFICULTY_MAX)) return false;
    return true;
  });
}

/**
 * 앵커 최소거리 오름차순. 좌표가 없는 행은 뒤로 보낸다.
 *
 * 거리를 **한 번만** 계산해 붙인 뒤 정렬한다(decorate-sort-undecorate).
 * comparator 안에서 부르면 비교마다 하버사인이 돌아 n log n번이다 —
 * 500건이면 약 4500회, 미리 뽑으면 500회로 끝난다.
 */
export function sortByDistance<T extends ExploreItem>(
  items: readonly T[],
  anchors: UserAnchors,
): T[] {
  return items
    .map((o) => ({ o, km: nearestAnchorKm(anchors, o.location as Location | undefined) ?? Infinity }))
    .sort((a, b) => a.km - b.km)
    .map((x) => x.o);
}

/**
 * 구(區)별 건수, 많은 순. `dongName`이 없거나 구로 정규화되지 않는 행은 제외한다.
 *
 * 상위 N개로 자르지 않는다 — 목록이 이미 앵커 반경이라 구 종류가 적고,
 * 자르면 오히려 선택할 수 없는 구가 생긴다.
 */
export function exploreRegionCounts(
  items: readonly ExploreItem[],
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const o of items) {
    const gu = normalizeGu(o.location?.dongName);
    if (gu) counts.set(gu, (counts.get(gu) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

/**
 * 카테고리 필터별 건수. `EXPLORE_CATEGORY_FILTERS` 순서를 유지하고 "전체"는 전체 길이다.
 *
 * `category`까지 실어 보내는 이유: web은 `label === "전체" || count > 0`로,
 * mobile은 `!category || count > 0`으로 거른다. 결과는 같지만(전체만 category가 null)
 * 표현이 달라서 둘 다 쓸 수 있게 한다. 거르는 것 자체는 UI 결정이라 여기서 하지 않는다
 * (web은 칩에 건수를 표시하고 mobile은 하지 않는다).
 */
export function exploreCategoryCounts(
  items: readonly ExploreItem[],
): { label: string; category: OpportunityCategory | null; count: number }[] {
  return EXPLORE_CATEGORY_FILTERS.map((f) => ({
    label: f.label,
    category: f.category,
    count: f.category ? items.filter((o) => o.category === f.category).length : items.length,
  }));
}
