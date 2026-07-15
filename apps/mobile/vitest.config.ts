import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * apps/mobile 테스트 설정 (순수 로직·store·데이터 변환 대상).
 *
 * ⚠️ RN 화면 컴포넌트 렌더는 대상 아님 — react-native/expo 모듈은 vitest(jsdom)에서
 *    실행 불가라 react-native-web 앨리어싱이 필요하다(별도 과제). 여기서는 store·lib·
 *    data 등 순수 로직만 테스트하고, RN/expo 의존은 각 테스트가 vi.mock으로 우회한다.
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
    },
  },
});
