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
