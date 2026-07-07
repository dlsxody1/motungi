/**
 * 소스 어댑터 레이어.
 *
 * 각 외부 데이터 소스의 원본 응답(Raw*)을 core `Opportunity`로 정규화한다.
 * 어댑터는 **순수 함수** — 네트워크 호출은 적재 계층(Edge Function)이 담당하고,
 * 여기서는 "받은 레코드 → Opportunity" 변환 규칙만 소유한다(TDD 대상).
 *
 * 소스 ↔ SourceKind 매핑 (docs/DATA-SOURCES.md):
 *   seoul-jobs   → side_job              (퇴근후 파트/단기 부업, 보조 카테고리)
 *   commercial   → (food 근거 맥락, summary 보강용)
 *
 * TODO(인프라 라운드): culture(seoul_culture/culture_info)·active(sports_facility/trail)
 *   어댑터 추가. 발급 응답 1건으로 Raw* 필드명 확정 후 구현.
 */
export * from "./seoul-jobs";
