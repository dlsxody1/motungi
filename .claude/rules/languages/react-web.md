---
paths:
  - "apps/web/**/*.tsx"
  - "apps/web/**/*.ts"
---

# apps/web — Next.js / React 19 (React DOM)

`apps/web` 파일 작업 시에만 로드된다. 여기는 **React DOM**이다 — React Native 패턴을 넣지 마라.

## 스택
- Next.js 15 **App Router**, React 19 / react-dom 19, Tailwind **v4**(`@theme`), Zustand 5, `@supabase/supabase-js`.
- `@motungi/core`·`@motungi/tokens`는 `transpilePackages`로 소스 공유 — import하면 그대로 쓴다.

## 규율
- **Server / Client Component 경계**를 의식한다. `"use client"`는 상호작용·훅·브라우저 API가 필요한 최소 범위에만.
- 데이터 페칭은 서버 컴포넌트/route handler 우선. 시크릿은 서버에만(`@.claude/rules/core/security-policy.md`).
- route handler(`app/api/*/route.ts`)는 REST 규약(`api-design` 스킬) 준수. NAVER는 `/api/geo` 프록시 뒤.
- FSD 계층(entities/features/widgets/shared·app) import 방향 준수.
- `noUncheckedIndexedAccess` — 배열 인덱싱 결과 `undefined` 방어.

## 스킬 (도메인 라우팅)
- 컴포넌트/훅/서버·클라 경계 → **react-patterns**
- 큐레이션 피드·카드 UI·상태·성능·토큰 → **frontend-patterns**
- 빌드/dev 속도/Turbopack → **nextjs-turbopack**
- 컴포넌트·훅·페이지 테스트(RTL+Vitest+MSW+axe) → **react-testing**
- 사용자 플로우 E2E(Playwright) → **e2e-testing**
- route handler 설계 → **api-design**
- **UI 디자인·리디자인·정돈·감사 → `impeccable` (제품 UI 필수)** · 플로우/IA/인터랙션/UX카피 → `ux` · 랜딩/마케팅 → `design-taste-frontend`
