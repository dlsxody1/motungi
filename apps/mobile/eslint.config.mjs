// mobile lint — 경계 규칙만 강제한다(스타일 규칙 없음). web의 .eslintrc.json과 같은 방향성:
// lib는 순수 레이어이고, DOM/Next 패턴은 RN에 들어오지 못한다.
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";

const parserOptions = {
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
};

const DOM_ONLY = [
  { name: "react-dom", message: "mobile은 React Native다 — react-dom은 웹 전용이다." },
];
const DOM_PATTERNS = [
  { group: ["react-dom/*"], message: "mobile은 React Native다 — react-dom은 웹 전용이다." },
  { group: ["next", "next/*"], message: "mobile은 Expo다 — next/*는 웹 전용이다." },
];

export default [
  { ignores: ["**/node_modules/**", ".expo/**", "assets/**", "expo-env.d.ts"] },
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    ...parserOptions,
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-restricted-imports": ["error", { paths: DOM_ONLY, patterns: DOM_PATTERNS }],
    },
  },
  {
    // lib/는 UI·훅·라우트를 모른다 (web의 src/lib 금지 존과 동일 방향).
    files: ["lib/**/*.{ts,tsx}"],
    ignores: ["lib/**/*.test.{ts,tsx}"],
    ...parserOptions,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: DOM_ONLY,
          patterns: [
            ...DOM_PATTERNS,
            {
              group: ["@/ui", "@/ui/*", "@/hooks", "@/hooks/*", "@/app", "@/app/*", "../ui", "../ui/*", "../hooks", "../hooks/*", "../app", "../app/*"],
              message: "lib은 순수해야 한다 — ui/hooks/app을 참조하지 마라. 위 계층이 lib을 부르는 방향이다.",
            },
          ],
        },
      ],
    },
  },
];
