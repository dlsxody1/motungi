// core lint — 순수 도메인 로직이므로 UI 런타임 import를 금지한다(헌법: core는 순수, 부작용 격리).
import tsParser from "@typescript-eslint/parser";

export default [
  { ignores: ["**/node_modules/**"] },
  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    languageOptions: { parser: tsParser },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "core는 순수 로직이다 — React를 쓰지 마라." },
            { name: "react-native", message: "core는 순수 로직이다 — React Native를 쓰지 마라." },
            { name: "react-dom", message: "core는 순수 로직이다 — react-dom을 쓰지 마라." },
          ],
          patterns: [
            { group: ["react/*", "react-native/*", "react-dom/*"], message: "core는 UI 런타임을 모른다." },
            { group: ["next", "next/*"], message: "core는 Next를 모른다." },
          ],
        },
      ],
    },
  },
];
