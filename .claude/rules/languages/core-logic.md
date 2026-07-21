---
paths:
  - "packages/core/**/*.ts"
---

# packages/core — 순수 도메인 로직 (`@motungi/core`)

`packages/core` 작업 시에만 로드된다. 여기는 **순수 로직**만 산다 — UI·네트워크·부작용을 넣지 마라.

## 성격
- `type: module`, 빌드 없이 `src/index.ts`를 직접 export. web·mobile이 소스로 공유.
- 핵심: `types.ts` · `diagnosis.ts` · `scoring.ts`(집·직장 2축 거리 + 시간중첩 + fit/난이도/비용) · `catalog.ts` · `view.ts` · `adapters/`(외부소스 정규화).
- `database.types.ts`는 Supabase 스키마 미러 — 스키마 바뀌면 함께 갱신.

## 규율
- **순수 함수 유지**: 같은 입력 → 같은 출력, 부작용 격리. fetch/IO는 adapter 경계에만.
- `noUncheckedIndexedAccess` — 인덱싱 결과 `undefined` 방어를 타입으로 강제받는다.
- 타입 변경은 core → web/mobile로 전파됨을 의식(하위 앱 typecheck 깨질 수 있음).
- 콜로케이션 테스트 컨벤션 유지: `foo.ts` ↔ `foo.test.ts` (Vitest).

## 스킬 (도메인 라우팅)
- 새 로직·버그수정·리팩터 → **tdd-workflow** (Red-Green-Refactor, 80%+ 커버리지, 기존 `*.test.ts` 컨벤션)
