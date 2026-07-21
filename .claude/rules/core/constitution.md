# Constitution — 항상 로드

모퉁이(motungi)의 정체성·구조·불변 규칙. 어떤 작업이든 이 규칙이 우선한다.

## 제품 정체성
- **모퉁이(Corner) = "퇴근하고 뭐하지?"** — 서울/수도권 직장인의 퇴근 후·주말, 60초 3문항 진단 → 1픽 동네 문화·여가 큐레이션.
- 옛 기획(일자리/소득)에서 **문화·여가 큐레이션으로 피벗**됨. 일자리 잔재를 다시 끌어오지 마라.
- 차별점은 **"동네"** — 동네는 필터가 아니라 **좌표→거리점수**(집·직장 2축 앵커, 최소거리). 권위 있는 출처: `docs/HANDOFF.md`, `docs/PIVOT-afterwork.md`, `PRODUCT.md`.

## 모노레포 경계 (건드릴 곳을 정확히)
- `apps/web` — Next.js 15 App Router, **React 19 / React DOM**. 포트 3000.
- `apps/mobile` — Expo 52 / expo-router, **React 18 / React Native**. (DOM ≠ RN — 웹 패턴 그대로 앱에 넣지 마라.)
- `packages/core` — `@motungi/core`, **순수 도메인 로직**(scoring/diagnosis/types/adapters). 빌드 없이 소스 직접 export. 부작용 격리.
- `packages/tokens` — `@motungi/tokens`, 디자인 토큰(Twilight Rose). 웹·모바일이 동일 토큰 공유. `DESIGN.md` 참조.
- `supabase/` — Postgres 마이그레이션(순수 SQL) + Edge Functions(Deno).

## 툴체인 규율
- 패키지 매니저는 **pnpm@9** (npm/yarn 금지). Node ≥20.
- 빌드/테스트는 **turbo** 경유: `pnpm dev|build|lint|typecheck|test`.
- TS strict + **`noUncheckedIndexedAccess: true`** — 배열/객체 인덱싱 결과는 `T | undefined`다. 방어 코드 필수.
- web은 `@motungi/core`·`@motungi/tokens`를 `transpilePackages`로 **소스 공유**(빌드 산출물 아님).

## 불변 규칙
- FSD 아키텍처 경계(entities/features/widgets/shared)를 지킨다. import 방향을 거스르지 마라.
- 시크릿·환경변수는 `@.claude/rules/core/security-policy.md`를 따른다 (예외 없음).
- 야간 작업은 `@.claude/rules/workflow/nightly-pipeline.md`를 따른다.
- 도메인에 맞는 스킬은 `@.claude/rules/workflow/skill-routing.md`에서 고른다.
