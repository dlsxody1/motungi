# apps/web — Next.js 15 / React 19 (React DOM)

모퉁이 웹앱. **React DOM**이다 — `apps/mobile`(RN)의 패턴을 그대로 가져오지 마라. 상위 규칙은 루트 `CLAUDE.md`.

## 경계 규칙 (작업 시 자동 로드)
@../../.claude/rules/languages/react-web.md

## 이 앱의 성격
- App Router(`src/app/`), 서버/클라이언트 컴포넌트 경계 준수. `"use client"`는 최소 범위.
- Tailwind v4(`@theme`) + `@motungi/tokens`(Twilight Rose). 시각 토큰 하드코딩 금지.
- `@motungi/core`·`@motungi/tokens`는 소스로 공유(`transpilePackages`).
- route handler: `app/api/geo`(NAVER reverse-geocoding 프록시), `app/api/neighborhoods`. 시크릿은 프록시 뒤에.
- dev 포트 **3000**.

## 스킬 라우팅 (SSOT: `@../../.claude/rules/workflow/skill-routing.md`)
- 컴포넌트·훅·서버/클라 경계 → **react-patterns**
- 피드·카드 UI·상태·성능 → **frontend-patterns** · 빌드/Turbopack → **nextjs-turbopack**
- 테스트 → **react-testing**(컴포넌트/훅) · **e2e-testing**(Playwright 플로우)
- route handler 설계 → **api-design**

## 디자인 작업 = 스킬 필수 (사용자 핵심 규칙)
- **제품 UI**(대시보드·폼·화면·컴포넌트) 손볼 때 → **`impeccable`** (제품 UI 필수. PostToolUse 훅으로도 자동 발동)
- 사용자 **플로우·IA·내비게이션·인터랙션·UX 카피·사용성** → **`ux`**
- **랜딩/마케팅** 페이지 → **`design-taste-frontend`**
- 비주얼 스타일·토큰은 `packages/tokens` + `DESIGN.md` 준수.
