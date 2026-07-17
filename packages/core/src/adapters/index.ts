/**
 * 소스 어댑터 레이어.
 *
 * 각 외부 데이터 소스의 원본 응답(Raw*)을 core `Opportunity`로 정규화한다.
 * 어댑터는 **순수 함수** — 네트워크 호출은 적재 계층(Edge Function)이 담당하고,
 * 여기서는 "받은 레코드 → Opportunity" 변환 규칙만 소유한다(TDD 대상).
 *
 * 소스 ↔ SourceKind 매핑 (docs/DATA-SOURCES.md):
 *   seoul-culture   → culture   (서울시 문화행사, 1순위)
 *   culture-info    → culture   (한눈에보는문화정보, 전국 보조)
 *   sports-facility → active    (공공체육시설 — 필드명 미확정, 발급후 확정)
 *   trail           → active    (두루누비 걷기길)
 *   seoul-jobs      → side_job  (퇴근후 파트/단기 부업, 보조 카테고리)
 *
 * 공통 파서(요금/시간/날짜)는 ./util.
 */
export * from "./util";
export * from "./seoul-culture";
export * from "./culture-info";
export * from "./sports-facility";
export * from "./trail";
export * from "./seoul-jobs";
export * from "./ingest-fetch";
