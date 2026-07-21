# 스킬 라우팅 — 도메인·역할별 스킬 매핑 · 항상 로드 · 단일 출처(SSOT)

어떤 작업에 어떤 스킬을 쓸지의 **단일 출처**. CLAUDE.md·에이전트 .md는 이 표를 참조한다. 스킬은 SKILL.md description으로도 자동 트리거되지만, 아래는 **명시적 필수 라우팅**이다.

## 작업 영역별 (경계 기준)
| 작업 영역 | 필수/권장 스킬 |
|---|---|
| `apps/web` 컴포넌트·훅·서버/클라 경계 | **react-patterns** |
| `apps/web`·`apps/mobile` 화면·상태·성능·카드 UI·토큰 | **frontend-patterns** |
| `apps/web` 빌드/dev/Turbopack | **nextjs-turbopack** |
| 컴포넌트·훅·페이지 테스트(RTL+Vitest+MSW+axe) | **react-testing** |
| 웹 사용자 플로우 E2E(Playwright) | **e2e-testing** |
| `packages/core` 순수 로직(신규·버그·리팩터) | **tdd-workflow** |
| DB 마이그레이션 추가/백필/롤백 | **database-migrations** |
| 스키마·쿼리·RLS·인덱스 최적화 | **postgres-patterns** |
| 신뢰 안 되는 입력 SQL | **safe-sql-execution** |
| Edge Function / route handler REST·외부소스 래핑 | **api-design** |
| 인증·시크릿·입력처리·외부연동·제휴 코드 작성 후 | **security-review** |

## 디자인 작업 (용도 분리 — 반드시 지킴)
| 디자인 성격 | 스킬 |
|---|---|
| **제품 UI**(대시보드·폼·화면·컴포넌트·앱셸)의 디자인·리디자인·정돈·감사·폴리시 | **impeccable** (제품 UI 작업 시 필수. PostToolUse 훅으로도 발동) |
| 사용자 플로우·정보구조(IA)·내비게이션·인터랙션·UX 카피·사용성 진단 | **ux** |
| 랜딩/마케팅/포트폴리오 페이지 | **design-taste-frontend** |
> 시각 스타일링·토큰은 `packages/tokens`(Twilight Rose) + `DESIGN.md`를 따른다. `ux`는 비주얼 토큰을 다루지 않는다(플로우·IA·인터랙션 담당).

## 야간 에이전트별 필수 스킬
| 에이전트 | 스킬 |
|---|---|
| planner | — (스펙만) |
| architect | — (검증만; FSD 경계는 rules 참조) |
| frontend-impl | react-patterns · frontend-patterns · react-testing · (UI 변경 시) impeccable · ux |
| backend-impl | tdd-workflow · postgres-patterns · database-migrations · safe-sql-execution · security-review · api-design |
| qa | (실행 검증) e2e-testing·react-testing 컨벤션 인지 |
| reviewer | security-review (최종 훑기) |
