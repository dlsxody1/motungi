---
paths:
  - "apps/mobile/**/*.tsx"
  - "apps/mobile/**/*.ts"
---

# apps/mobile — Expo / React 18 (React Native)

`apps/mobile` 파일 작업 시에만 로드된다. 여기는 **React Native**다 — `apps/web`(React 19 DOM)와 **다른 컨텍스트**다.

## 스택
- Expo ~52, **expo-router** ~4, React Native 0.76, **React 18.3**(웹은 19 — 혼동 금지), Zustand, async-storage.
- expo-location / expo-auth-session / expo-crypto / expo-web-browser / expo-linear-gradient / react-native-svg.
- 화면은 `app/`(expo-router 파일 라우팅), `(tabs)/` 그룹. UI는 `ui/`(components/icons/theme), 로직은 `lib/`.

## 규율 (DOM ≠ RN)
- HTML 태그(`div`/`button`) 대신 `View`/`Text`/`Pressable`. CSS 대신 `StyleSheet`/토큰.
- `apps/web`의 훅·컴포넌트를 그대로 복사하지 마라. 로직 공유는 `packages/core`(순수)로.
- 시각 토큰은 `ui/theme.ts` = `@motungi/tokens`(Twilight Rose)와 동일 팔레트. `DESIGN.md` 참조.
- 시크릿 절대 `EXPO_PUBLIC_*`에 넣지 마라(`@.claude/rules/core/security-policy.md`).

## 스킬 (도메인 라우팅)
- RN 화면·상태·성능·카드 UI·토큰 → **frontend-patterns** (React Native 섹션)
- 컴포넌트·훅 테스트 → **react-testing** / 순수 로직 TDD → **tdd-workflow**
- **UI 디자인·정돈·감사 → `impeccable`(제품 UI 필수)** · 플로우/IA/인터랙션/UX카피 → `ux`
