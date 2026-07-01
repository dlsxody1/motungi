// 루트 flat config.
// TS/TSX/JSX 는 각 앱(apps/web 등)의 자체 lint 설정에서 처리한다.
// 루트에서는 워크스페이스의 순수 .js 설정 파일만 최소한으로 검사한다.
import js from '@eslint/js';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/.expo/**',
      '**/out/**',
      '**/*.tsbuildinfo',
      // TS/TSX/JSX 는 앱별 도구가 담당 (루트에는 TS 파서 미설치)
      '**/*.ts',
      '**/*.tsx',
      '**/*.jsx',
      '**/*.d.ts',
    ],
  },
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        module: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
];
