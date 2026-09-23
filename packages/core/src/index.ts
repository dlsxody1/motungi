/**
 * `@motungi/core`의 공개 API — web·mobile이 실제로 쓰는 것만 의도적으로 고른다(M-114).
 *
 * 예전엔 이 파일이 11개 모듈을 통째로 `export *`했다. 그 결과 각 모듈 내부에서만 쓰는
 * 어댑터 파서·타입(예: `stripHtml`·`SourceKind`)까지 패키지 공개 API 표면에 올라갔고,
 * 그게 "미사용 export를 실수로 다시 연다" 재발 패턴(M-038 → M-091 → M-093)의 뿌리였다
 * (`docs/audit/2026-09-11-state-management.md` 축 5).
 *
 * 아래 목록은 web·mobile의 `from "@motungi/core"` import를 전수조사(2026-09-23)해 만들었다.
 * 새 export가 필요하면 **여기 추가하는 게 그 자체로 "공개 API로 승격한다"는 결정**이다 —
 * 조용히 `export *`로 묻지 말고 이 목록에 이름을 올려라.
 *
 * gu-summary 계열(GuSummary·summarizeGu 등)은 여기 없다 — SEO 구 페이지 전용이라
 * `apps/web/src/lib/gu-summary.ts`로 내려갔다(M-114). mobile은 쓴 적이 없다.
 *
 * WEB_ONLY로 남은 나머지 9개(CATEGORY_LABEL 등)를 core에 둔 이유와, mobile이 "아직
 * 안 쓰는 것" vs "구조적으로 이미 양쪽이 쓰는 것"의 구분은
 * `docs/architecture/core-public-api.md`에 근거와 함께 남겼다.
 */

// ── types.ts ─────────────────────────────────────────────
export type { GeoPoint, Opportunity, OpportunityCategory, UserAnchors } from "./types";

// ── geo.ts ───────────────────────────────────────────────
export type { NeighborhoodSearchResult, ReverseGeoResult } from "./geo";
export { parseNeighborhoodSearchResponse, parseReverseGeoResponse } from "./geo";

// ── diagnosis.ts ─────────────────────────────────────────
export type { DiagnosisAnswers } from "./diagnosis";
export { draftToAnswers } from "./diagnosis";

// ── scoring.ts ───────────────────────────────────────────
export { PREFILTERED_WEIGHTS, pickTop, scoreAll, scoreOpportunity } from "./scoring";

// ── adapters/ (barrel 자체는 core 내부 공용 유틸도 함께 내보내지만,
//    앱이 실제로 쓰는 건 이 둘뿐이다 — 나머지는 여기서 재노출하지 않는다) ──
export { parseGpxPoints, parseHttpUrl } from "./adapters";

// ── view.ts ──────────────────────────────────────────────
export type { WhyReasonsPromptInput } from "./view";
export {
  buildWhyReasonsPrompt,
  CATEGORY_LABEL,
  deadlineLabel,
  diagnosisSummaryChips,
  displayNameOf,
  ENERGY_LABEL,
  EXPLORE_CATEGORY_FILTERS,
  isWeekendOuting,
  normalizeDong,
  normalizeGu,
  timeRangeLabel,
  whyReasons,
} from "./view";

// ── explore.ts ───────────────────────────────────────────
export {
  buildSearchHaystacks,
  exploreCategoryCounts,
  exploreRegionCounts,
  filterExplore,
  searchTerms,
  sortByDistance,
} from "./explore";

// ── catalog.ts ───────────────────────────────────────────
export type {
  CatalogResult,
  CatalogStatus,
  FetchOpportunitiesOptions,
  MockOpportunity,
  NeighborhoodPick,
  NoAnchorFetch,
  OpportunityResult,
  RadiusFetch,
} from "./catalog";
export {
  DEFAULT_NEIGHBORHOOD,
  fetchOpportunities,
  fetchOpportunitiesByIds,
  fetchOpportunityById,
  loadCatalogByRadiusLadder,
  NO_ANCHOR_LIMIT,
  POPULAR_NEIGHBORHOODS,
  rowToMock,
} from "./catalog";

// ── store.ts ─────────────────────────────────────────────
export type { AnchorSlot, AppState, AuthUser, SavedOpportunitiesClient } from "./store";
export { createAppStore } from "./store";

// ── database.types.ts ───────────────────────────────────
export type { Database } from "./database.types";
export { isOpportunityCategory } from "./database.types";
