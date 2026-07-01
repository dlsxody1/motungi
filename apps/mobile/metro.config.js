// Expo + pnpm 모노레포용 Metro 설정.
// 워크스페이스 루트를 감시하고, 심링크된 workspace 패키지를 해석한다.
const { getDefaultConfig } = require("expo/metro-config");
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

module.exports = config;
