/**
 * 소스 어댑터 레이어.
 *
 * 실제 외부 데이터 소스별 매핑(Raw* → Opportunity)의 SoT는 여기가 아니라
 * `supabase/functions/ingest/adapters.ts`다(mapSeoulCulture/mapCultureInfo/mapTrail/
 * mapSportsFacility/mapSeoulJob). 여기 남은 건 그 매핑이 실제로 import해 쓰는 공용
 * 순수 함수뿐이다:
 *   - ./util        — 공통 파서(요금/시간/날짜/좌표/HTML 정리)
 *   - ./seoul-jobs  — isAfterWorkShift/parseShiftHours/parseWorkRegion(퇴근후 판정 SoT)
 *   - ./ingest-fetch — 적재 파싱/필터/판정 유틸(parseJsonItems·judgeIngest 등)
 *
 * M-029(2026-08-08): 여기 있던 5개 mapping 함수의 core-mirror(seoul-culture.ts·
 * culture-info.ts·sports-facility.ts·trail.ts 전체, seoul-jobs.ts의 normalizeSeoulJob 등)는
 * 죽은 코드였다(SoT는 위 adapters.ts, 이 미러는 어디서도 호출되지 않았다) — 제거했다.
 */
export * from "./util";
export * from "./seoul-jobs";
export * from "./ingest-fetch";
export * from "./culture-info-detail";
// normalizeGu는 barrel로 내지 않는다(M-098) — view.ts가 이미 같은 이름으로 export하고
// 있어 `export *`로 겹치면 index.ts에서 TS2308(모호한 재export)로 typecheck가 깨진다.
// 두 실제 소비처(ingest/index.ts, gu-fallback.test.ts) 모두 이 leaf 파일을 상대경로로
// 직접 import하므로 barrel 노출이 필요 없다.
export {
  applyGuCoordFallback,
  buildGuCentroids,
  type CoordFallbackRow,
  type GuCentroidRow,
} from "./gu-fallback";
