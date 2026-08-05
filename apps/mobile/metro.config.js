// Expo + pnpm 모노레포용 Metro 설정.
// 워크스페이스 루트를 감시하고, 심링크된 workspace 패키지를 해석한다.
const { getDefaultConfig } = require("expo/metro-config");
const exclusionList = require("metro-config/src/defaults/exclusionList");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1) 워크스페이스 전체를 감시 (공용 packages/* 변경 감지)
config.watchFolders = [workspaceRoot];

// 2) 앱 → 루트 순으로 node_modules 탐색 (pnpm isolated 대응)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3) workspace 패키지의 exports("./src/index.ts") 해석 활성화
config.resolver.unstable_enablePackageExports = true;

// 3-1) web 번들에서도 "react-native" export 조건을 우선한다.
//      exports 해석이 켜지면 web은 react-native 조건을 빼고 "import"(ESM)로 떨어지는데,
//      zustand의 esm/middleware.mjs는 devtools에서 `import.meta.env`를 쓴다. Metro는 이를
//      클래식 스크립트로 싣기 때문에 "Cannot use 'import.meta' outside a module"로 번들 전체가
//      죽는다(화면이 백지). zustand는 react-native 조건에 동일 기능의 CJS 빌드를 제공하므로
//      조건만 앞세우면 해결된다. 네이티브는 원래 이 조건을 타서 영향 없음.
config.resolver.unstable_conditionNames = ["react-native", "require", "default"];

// 4) 테스트 파일은 번들에서 제외.
//    expo-router는 app/ 아래 모든 파일을 라우트로 등록하므로
//    app/**/*.test.tsx가 vitest→chai까지 끌고 들어와 번들이 깨진다.
config.resolver.blockList = exclusionList([/.*\.test\.[jt]sx?$/]);

// 5) supabase-js가 optional로 import하는 @opentelemetry/api를 빈 모듈로.
//    web 번들만 index.mjs를 타서 이 import를 만난다(네이티브는 index.cjs).
//    설치돼 있지 않으면 supabase가 null로 폴백하는 코드라 stub이면 충분.
config.resolver.resolveRequest = (context, moduleName, platform) =>
  moduleName === "@opentelemetry/api"
    ? { type: "empty" }
    : context.resolveRequest(context, moduleName, platform);

module.exports = config;
