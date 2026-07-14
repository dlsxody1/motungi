# TypeScript 7.0 전환 계획 (motungi)

> 작성: 2026-07-09 · 경로: **보수 경로** (typecheck만 7.0 검증 채널로, 빌드/에디터는 무손상)
> **검증 완료: 2026-07-09** — 실제 전환·회귀 테스트 결과는 맨 아래 [검증 결과](#검증-결과-2026-07-09-실측) 참조.

## TL;DR (검증 후 확정)

- **core / tokens → TS 7.0.2 전환 완료.** typecheck·test 전부 통과. 소스 수정 0건.
- **web(Next 15) · mobile(Expo 52) → TS 5.7.3 유지.** 둘 다 **임베디드 툴링이 TS를 JS API로 소비**하는데, 7.0.2 stub 패키지는 `{version, versionMajorMinor}`만 export → `ts.sys`·`readConfigFile` 등 부재.
  - web: `next build`(webpack)가 `@/*` alias 해석 실패 → 빌드 깨짐.
  - mobile: `expo start`가 `evaluateTsConfig`에서 `ts.sys.getCurrentDirectory` 읽다 크래시(2026-07-10 실측). **`tsc --noEmit`은 통과했지만 dev 서버는 안 뜬다** — typecheck만으로 검증하면 놓친다.
- 구성: core/tokens `^7.0.2`, web·mobile은 `5.7.3` 핀 + root `pnpm.overrides["@motungi/web>typescript"]`·`["@motungi/mobile>typescript"]="5.7.3"`.
- **교훈:** 임베디드 툴링(Next/Expo/Metro/ESLint 파서)을 쓰는 패키지는 `tsc` 통과 ≠ 전환 가능. TS를 라이브러리로 import하는 소비자가 있으면 dev/build까지 실제로 돌려봐야 한다. Next·Expo가 TS 7.0 JS API를 지원하면 그때 override 제거하고 승격.

## 배경: 실제 배포 상태 (2026-07 기준, npm 확인 완료)

- `typescript@latest` = **7.0.2** — 정식 배포됨. **`tsc` 명령이 이미 Go native**.
- `typescript@6.0.0-beta` — 6.x 호환 라인 (임베디드 언어 툴링용).
- `@typescript/native-preview` = `7.0.0-dev.*` — 초기 프리뷰. 정식 배포로 **더 이상 주 경로 아님**.

**핵심:** TS 7.0은 언어가 아니라 **컴파일러 구현(Go 포트)** 변경. 타입 시스템 동일 → **소스 코드 수정 0건**.
별도 `tsgo` 바이너리로 갈아끼울 필요 없이 **`typescript` 버전만 올리면 `tsc`가 native로 동작**.

## motungi 위험 항목 점검 (전부 통과 ✅)

| TS 7.0 breaking change | motungi 현재 상태 | 판정 |
|---|---|---|
| `target: es5` 제거 | `target: "ES2022"` (tsconfig.base) | ✅ |
| `module: amd/umd/systemjs/none` 제거 | 전부 `esnext` | ✅ |
| 구식 `moduleResolution: classic/node10` 제거 | 전부 `bundler` (mobile은 Expo node10을 이미 override) | ✅ |
| `rootDir` 명시 | core·tokens에 이미 명시 | ✅ |
| `downlevelIteration` 미지원 | 미사용 | ✅ |

## 전환 대상 (typecheck 4곳)

| 패키지 | typecheck 스크립트 | 전환 순서 | 비고 |
|---|---|---|---|
| `packages/tokens` | `tsc --noEmit` | 1 (먼저) | 의존성 없음, 가장 안전 |
| `packages/core` | `tsc --noEmit` | 2 | vitest 포함, 순수 로직 |
| `apps/mobile` | `tsc --noEmit` | 3 | ~~Expo/Metro 무관~~ → **틀림**: `expo start`가 TS JS API 소비 → 7.0.2에서 크래시. mobile은 5.7.3 유지 |
| `apps/web` | `tsc --noEmit` | 4 (마지막) | **주의**: Next 플러그인 `.next/types/**` 호환성 검증 필수 |

> 빌드 파이프라인(`turbo run build`) 자체는 무손상. 단 `next build`·`expo start`는 TS JS API를 소비하므로 web·mobile은 5.7.3에 남겨 override로 격리.

---

## 실행 단계

### Phase 1 — 브랜치
```bash
git checkout -b chore/typescript-7-migration
```

### Phase 2 — 점진적 typecheck 검증 (버전 bump 전, 로컬)
root에 7.0을 임시로 깔고 패키지별로 순서대로 검증:
```bash
pnpm add -Dw typescript@7   # root(workspace)에 7.0 hoisting
pnpm --filter @motungi/tokens typecheck   # 1
pnpm --filter @motungi/core   typecheck   # 2
pnpm --filter @motungi/mobile typecheck   # 3
pnpm --filter @motungi/web    typecheck   # 4 (.next/types 에러 여부 관찰)
```
- **1~3 통과 & 4도 통과** → Phase 3 (전면 bump)
- **4(web)만 실패** (`.next/types` 관련) → web은 typescript 5.x 유지하는 **split 구성**으로 (아래 "web 폴백")

### Phase 3 — 버전 bump 확정
pnpm 워크스페이스라 hoisting되지만, 명시적 일관성을 위해 5개 `package.json`의
`"typescript": "^5.7.3"` → `"^7.0.0"` 갱신 후:
```bash
pnpm install --frozen-lockfile=false
pnpm typecheck   # turbo run typecheck 전체
pnpm test
pnpm build       # 회귀 없는지 최종 확인
```

### Phase 4 — CI 안전망 (선택)
`.github/workflows/ci.yml`의 `pnpm typecheck`가 자동으로 7.0을 탐.
불안하면 5.x tsc와 7.0을 **병렬 잡**으로 한동안 이중 검증 후 5.x 제거.

---

## web 폴백 (Phase 2에서 web만 실패할 경우)

Next 플러그인이 만드는 `.next/types/**`를 7.0이 못 읽으면, **web만 5.x 고정**:
```jsonc
// apps/web/package.json — devDependencies
"typescript": "5.7.3"   // ^ 제거해 5.x 핀 고정
```
```jsonc
// pnpm 워크스페이스 root package.json
"pnpm": {
  "overrides": {
    "@motungi/web>typescript": "5.7.3",
    "@motungi/mobile>typescript": "5.7.3"
  }
}
```
core/tokens/mobile은 7.0, web만 5.x → 안전하게 부분 전환. Next이 7.0 툴링을 완전 지원하면 그때 web도 승격.

---

## 롤백

버전 bump만 있으므로 롤백은 1줄:
```bash
git checkout main -- '**/package.json' pnpm-lock.yaml && pnpm install
```

## 체크리스트

- [x] Phase 1: 브랜치 생성 (`chore/typescript-7-migration`)
- [x] Phase 2-1: tokens typecheck (7.0) 통과
- [x] Phase 2-2: core typecheck (7.0) 통과 *(vitest 미설치 사전 이슈 → `pnpm install`로 해결, 7.0 무관)*
- [x] Phase 2-3: mobile typecheck (7.0) 통과
- [x] Phase 2-4: web typecheck (7.0) 통과 *(단 `import "./globals.css"` TS2882 → `globals.d.ts` 추가로 해결, 5.x에서도 나던 사전 이슈)*
- [x] Phase 3: 버전 bump + 회귀 → **web build만 실패 → web 폴백 채택**
- [ ] Phase 4: CI 통과 확인 (커밋/푸시 후)
- [x] 에디터(VSCode) TS 버전: web은 5.7.3 유지가 안전

---

## 검증 결과 (2026-07-09 실측)

### 최종 통과 회귀
| 태스크 | 구성 | 결과 |
|---|---|---|
| `pnpm typecheck` | core/tokens/mobile=7.0.2, web=5.7.3 | ✅ 4/4 통과 |
| `pnpm test` (core, 61 tests) | 7.0.2 | ✅ 통과 |
| `pnpm build` (web) | web=5.7.3 | ✅ 통과 |

### 핵심 발견: web은 7.0으로 못 올림 (Next 15 비호환)
- `next build`(webpack)를 **web=7.0.2**로 돌리면 `@/components/web-shell`, `@/store/useAppStore` 등 `@/*` **경로 alias를 webpack이 해석 실패** → `Module not found`. 파일·export는 전부 정상 존재.
- **web=5.7.3**으로 핀 고정하면 동일 코드로 빌드 성공. → 원인은 코드가 아니라 **Next 15의 TS 통합 레이어가 TS 7.0 native와 아직 비호환**.
- 이는 발표 블로그가 명시한 *"임베디드 언어/툴링은 당분간 6.0 계열에 의존"* 케이스. Next이 7.0 지원 릴리스를 내면 web도 승격.

### 파생 정리 (7.0과 무관하지만 이번에 발견·해결)
1. **`packages/core` vitest 미설치** — 워크스페이스 설치 누락. `pnpm install`로 해결.
2. **`import "./globals.css"` TS2882** — CSS side-effect import 타입 선언 부재(main에도 잠재). `apps/web/globals.d.ts`에 `declare module "*.css";` 추가로 해결. tsc 단독 typecheck에 필요.

### 적용된 구성 (커밋 대상)
```jsonc
// root package.json
"pnpm": { "overrides": { "@motungi/web>typescript": "5.7.3", "@motungi/mobile>typescript": "5.7.3" } }
```
| 위치 | typescript |
|---|---|
| root, packages/core, packages/tokens | `^7.0.2` |
| apps/web, apps/mobile | `5.7.3` (핀 고정 + override) |
| 신규 | `apps/web/globals.d.ts` |
