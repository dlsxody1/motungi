import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * apps/web 테스트 설정.
 * Next.js는 SWC로 빌드되지만, 테스트는 vitest(esbuild) 위에서 jsdom 환경으로 돈다.
 * `@/*` alias는 tsconfig.json의 paths와 동일하게 맞춘다.
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
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
