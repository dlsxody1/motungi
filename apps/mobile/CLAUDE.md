# apps/mobile — Expo 52 / React 18 (React Native)

모퉁이 모바일앱. **React Native**다 — `apps/web`(React 19 DOM)와 **다른 컨텍스트**. 웹 훅·컴포넌트를 복사하지 마라. 상위 규칙은 루트 `CLAUDE.md`.

## 경계 규칙 (작업 시 자동 로드)
@../../.claude/rules/languages/react-native.md

## 이 앱의 성격
- expo-router 파일 라우팅(`app/`, `(tabs)/` 그룹). React **18.3**(웹은 19 — 혼동 금지), RN 0.76.
- UI는 `ui/`(components/icons/theme), 로직은 `lib/`, 상태는 `store/`(Zustand).
- `View`/`Text`/`Pressable` + `StyleSheet`/토큰. HTML 태그·CSS 없음.
- 로직 공유는 웹과의 복붙이 아니라 `packages/core`(순수) 경유.
- 시각 토큰: `ui/theme.ts` = `@motungi/tokens`(Twilight Rose) 동일 팔레트.

## 스킬 라우팅 (SSOT: `@../../.claude/rules/workflow/skill-routing.md`)
- RN 화면·상태·성능·카드 UI → **frontend-patterns**(React Native 섹션)
- 컴포넌트·훅 테스트 → **react-testing** · 순수 로직 → **tdd-workflow**

## 디자인 작업 = 스킬 필수 (사용자 핵심 규칙)
- **제품 UI** 디자인·정돈·감사 → **`impeccable`** (제품 UI 필수)
- 사용자 **플로우·IA·인터랙션·UX 카피·사용성** → **`ux`**
- 비주얼 토큰은 `packages/tokens` + `DESIGN.md` 준수. (RN 화면 이미지 레퍼런스가 필요하면 `imagegen-frontend-mobile`.)
