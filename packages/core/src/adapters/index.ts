/**
 * 소스 어댑터 레이어.
 *
 * 각 외부 데이터 소스의 원본 응답(Raw*)을 core `Opportunity`로 정규화한다.
 * 어댑터는 **순수 함수** — 네트워크 호출은 적재 계층(Edge Function)이 담당하고,
 * 여기서는 "받은 레코드 → Opportunity" 변환 규칙만 소유한다(TDD 대상).
 *
 * 소스 ↔ SourceKind 매핑 (docs/DATA-SOURCES.md):
 *   seoul-jobs   → side_job / gig_deal   (일자리 카드 본체)
 *   youth-policy → subsidy               (지원금/청년정책)
 *   commercial   → (근거 맥락, summary 보강용 — 카드 본체 아님)
 *
 * ⚠️ 워크넷 채용정보목록/상세 API는 개인회원 이용 불가(민간 직업정보제공사업 신고 필요).
 *    → 서울시 일자리 소스로 대체. 사업자 확보 후 워크넷 어댑터 추가 가능.
 */
export * from "./seoul-jobs";
export * from "./youth-policy";
