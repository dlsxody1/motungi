# packages/core — 순수 도메인 로직 (`@motungi/core`)

모퉁이의 공유 도메인 로직. **순수 함수만** — UI·네트워크·부작용을 넣지 마라. 상위 규칙은 루트 `CLAUDE.md`.

## 경계 규칙 (작업 시 자동 로드)
@../../.claude/rules/languages/core-logic.md

## 이 패키지의 성격
- `type: module`, 빌드 없이 `src/index.ts`를 직접 export → web·mobile이 소스로 공유.
- 핵심: `types.ts` · `diagnosis.ts` · `scoring.ts`(집·직장 2축 거리 + 시간중첩 + fit/난이도/비용) · `catalog.ts` · `view.ts` · `adapters/`.
- `database.types.ts`는 Supabase 스키마 미러 — 스키마 변경 시 함께 갱신.
- 콜로케이션 테스트: `foo.ts` ↔ `foo.test.ts`(Vitest). `noUncheckedIndexedAccess` 방어 필수.

## 스킬 라우팅 (SSOT: `@../../.claude/rules/workflow/skill-routing.md`)
- 신규 로직·버그수정·리팩터 → **tdd-workflow** (Red-Green-Refactor, 80%+ 커버리지, 기존 `*.test.ts` 컨벤션)

## 주의
- 타입 변경은 core → web/mobile로 전파됨. 하위 앱 typecheck가 깨질 수 있으니 함께 확인.
- fetch/IO는 adapter 경계에만. **실제 적재 어댑터는 여기가 아니라 `supabase/functions/ingest/adapters.ts`**다.
