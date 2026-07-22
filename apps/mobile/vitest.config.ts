import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * apps/mobile 테스트 설정 (순수 로직·store·데이터 변환 + RN 화면 스모크 렌더).
 *
 * RN 화면 컴포넌트도 이제 테스트 대상이다 — `react-native` → `react-native-web` 앨리어싱으로
 * jsdom에서 렌더 가능하게 하고, react-native-svg·react-native-safe-area-context 같은
 * 네이티브 전용 라이브러리는 vitest.setup.ts에서 전역 vi.mock으로 우회한다. expo-router 등
 * 나머지 네이티브/expo 의존은 각 테스트가 개별 vi.mock으로 우회한다.
 * `@/*` alias는 tsconfig.json paths(`@/* → ./*`)와 동일하게 맞춘다.
 */
export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "react-native": "react-native-web",
    },
  },
});
