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

## 레이어는 디렉토리가 아니라 **import 방향**이다 (기계가 강제)
평면 구조를 유지하되 의존 방향은 단방향이다 — **아래는 위를 모른다**.
```
app/ → components/ → hooks/ → lib/ · @motungi/core     (store/는 hooks 이하에서 사용)
```
- `lib/`·`core/`는 **순수**하다: react·store·hooks·components·app을 import하지 않는다.
- `components/ → hooks/`는 **허용**이다(위 "렌더 격리"가 요구하는 방향).
- 강제 수단: `apps/web/.eslintrc.json`의 `import/no-restricted-paths`(위반 시 Error)
  + `scripts/check-pure-tests.sh`(lib·core 테스트 누락 시 게이트 실패). 둘 다 `gate.sh` 안.
- 예외는 `lib/auth.ts` 하나뿐이며 파일 상단에 사유가 적혀 있다 — **선례로 삼지 마라**.
- 어디에 둘지 판단하는 결정 트리와 안티패턴(`useMemo` 안의 도메인 계산)은
  **`react-patterns` 스킬의 "레이어 분리 결정 트리"**에 있다.

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

## ESLint 규모 규율 (max-lines · max-lines-per-function · complexity)
`apps/web/.eslintrc.json`의 세 규칙은 성격이 다르므로 취급도 다르다 (M-103, 2026-09-28).
- **`max-lines`(파일 300줄)는 `error`다.** 파일 분할은 실제로 듣는다 — M-102에서 diagnosis·
  location을 컨테이너+모바일/데스크톱 뷰로 쪼개자 경고 7건 → 0건. 새로 300줄을 넘기면 게이트가
  막는다: 마크업을 `components/*-mobile.tsx`·`*-desktop.tsx`로 쪼개거나(선례:
  `report-mobile.tsx`/`report-desktop.tsx`, `diagnosis-mobile.tsx`/`diagnosis-desktop.tsx`), 정말
  못 쪼개면 `poster-ring.tsx`처럼 파일 상단에 이유를 남기고 개별 `eslint-disable`을 쓴다 — 규칙을
  전역으로 끄지 마라.
- **`max-lines-per-function`(200)·`complexity`(25)는 여전히 `warn`이고, 승격하지 않는다.**
  M-099에서 explore의 도메인 로직을 core로 전부 들어냈는데도 complexity가 31 → 31로 그대로였다 —
  출처가 계산이 아니라 JSX 조건부 렌더(`&&`/`??`/`||`)였기 때문이다. 이 두 규칙은 **JSX를 쓰는
  React 컴포넌트에서 구조적으로 임계를 넘는다**: 더 쪼개도 분기 총량이 자식으로 옮겨갈 뿐이고,
  숫자를 맞추려 들면 재사용되지 않는 파편 컴포넌트만 늘어난다(과분할 — `gate.sh`가 커버리지 %
  게이트를 일부러 안 넣은 것과 같은 이유). 임계값(150→200, 15→25)은 M-102 이후 실측
  분포(설명 6개 파일이 150~264줄, complexity 최댓값이 explore의 31)에서 "구조적으로 못 피하는
  JSX 분기"와 "진짜 커진 함수"를 가르는 지점으로 재보정한 것이다 — 0으로 밀어붙이지 않는다.

## 스킬 (도메인 라우팅)
- 컴포넌트/훅/서버·클라 경계 → **react-patterns**
- 큐레이션 피드·카드 UI·상태·성능·토큰 → **frontend-patterns**
- 빌드/dev 속도/Turbopack → **nextjs-turbopack**
- 컴포넌트·훅·페이지 테스트(RTL+Vitest+MSW+axe) → **react-testing**
- 사용자 플로우 E2E(Playwright) → **e2e-testing**
- route handler 설계 → **api-design**
- **UI 디자인·리디자인·정돈·감사 → `impeccable` (제품 UI 필수)** · 플로우/IA/인터랙션/UX카피 → `ux` · 랜딩/마케팅 → `design-taste-frontend`
