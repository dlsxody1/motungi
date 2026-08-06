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
- `noUncheckedIndexedAccess` — 배열 인덱싱 결과 `undefined` 방어.

## 파일 구조 (실제 규칙 — FSD 아님)
`entities/features/widgets/shared` 디렉토리는 **이 앱에 존재하지 않는다.** 예전 룰에 FSD 문구가
있었지만 실체가 없어 지침으로 쓸 수 없었다. 실제 규칙은 다음과 같다.
- `app/`(App Router 라우트·route handler) · `components/`(**평면**, kebab-case) · `hooks/` · `lib/` · `data/` · `store/`.
- 도메인 묶음은 디렉토리가 아니라 **파일명 접두사**로 한다: `explore-*`, `report-*`, `saved-*`, `landing-*`, `web-*`, `hero-*`.
- 한 파일에 한 컴포넌트. 새 컴포넌트를 만들 때 `features/`류 디렉토리를 새로 파지 마라.

## 렌더 격리 (상태는 쓰는 곳이 소유한다)
`md:hidden`은 **CSS라 모바일·데스크톱 트리가 둘 다 마운트된다** — 같은 목록이 두 번 그려지고,
페이지가 리렌더되면 비용도 두 배다. 그래서:
- **중복 JSX는 memo된 공용 컴포넌트 하나로** 뽑는다(모바일/데스크톱 variant prop). 같은 마크업을
  2벌 복붙하면 한쪽만 고쳐져 조용히 갈라진다.
- **memo 경계에 넘기는 콜백은 ref로 고정**한다. `useCallback([router])`는 `useRouter()`가 새 객체를
  주는 순간 무너져 하위 memo를 전부 무력화한다(실측으로 확인된 함정).
- **스토어는 필요한 최소 단위로 구독**한다. `s.savedIds`(배열) 대신 `s.savedIds.includes(id)`(boolean),
  `s.anchors`(객체) 대신 좌표 값. `setAnchor`/`toggleSaved`는 매번 새 객체·배열을 만든다.
- **변덕스러운 로컬 상태는 memo된 자식 안으로** 내린다(virtualizer·스크롤·matchMedia 등).
- 모든 memo 경계에는 **무슨 회귀를 막는지** 주석을 단다.
- 선례: `components/explore-list.tsx`, `explore-search.tsx`, `saved-card.tsx`, `report-related-card.tsx`.
- 격리는 주장하지 말고 **측정**한다 — `*/render-isolation.test.tsx`가 실제 렌더 횟수를 센다.
  "격리됐다"와 "바뀌어야 할 때는 바뀐다"를 항상 쌍으로 단언할 것.

## 스킬 (도메인 라우팅)
- 컴포넌트/훅/서버·클라 경계 → **react-patterns**
- 큐레이션 피드·카드 UI·상태·성능·토큰 → **frontend-patterns**
- 빌드/dev 속도/Turbopack → **nextjs-turbopack**
- 컴포넌트·훅·페이지 테스트(RTL+Vitest+MSW+axe) → **react-testing**
- 사용자 플로우 E2E(Playwright) → **e2e-testing**
- route handler 설계 → **api-design**
- **UI 디자인·리디자인·정돈·감사 → `impeccable` (제품 UI 필수)** · 플로우/IA/인터랙션/UX카피 → `ux` · 랜딩/마케팅 → `design-taste-frontend`
