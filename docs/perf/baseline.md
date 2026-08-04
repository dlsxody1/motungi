# 성능 베이스라인 — Phase 0 기준선

> **이 문서의 목적:** 이후 모든 최적화의 "before" 숫자. 여기 없는 수치는 나중에 개선을 주장할 수 없다.
> 측정일 **2026-08-03**, 커밋 `ab9089d` 기준(Phase 0 계측 도입 직후, Phase 1~3 착수 전).
> 재측정: `pnpm build` · `ANALYZE=true pnpm --filter @motungi/web build`

## 측정 환경

| 항목 | 값 |
|---|---|
| 머신 | darwin 24.6.0 (Apple Silicon) |
| Node | v22.21.1 · pnpm 9.15.0 · turbo 2.10.2 |
| Next.js | 15.x (webpack, **Turbopack 아님** — dev 스크립트에 `--turbo` 없음) |
| 데이터 | opportunities 약 519행 |

## 빌드 시간

| 시나리오 | 시간 |
|---|---|
| 콜드 빌드 (`.next`·`.turbo` 삭제 후) | **17.3s** |
| 웜 빌드 (turbo 캐시 적중) | **11.7s** |
| 컴파일 단독 (`✓ Compiled`) | 3.8s |

turbo remote cache는 쓰지 않는다(솔로 개발이라 로컬 캐시로 충분).

## 라우트별 번들 (First Load JS)

```
Route (app)                                 Size  First Load JS
┌ ○ /                                    4.63 kB         185 kB
├ ○ /_not-found                            992 B         103 kB
├ ƒ /api/geo                               138 B         102 kB
├ ƒ /api/neighborhoods                     138 B         102 kB
├ ƒ /api/trail-route                       138 B         102 kB
├ ƒ /api/vitals                            138 B         102 kB
├ ○ /auth/callback                         844 B         164 kB
├ ○ /diagnosis                           2.94 kB         186 kB
├ ○ /explore                             12.3 kB         195 kB   ← 최대
├ ○ /loading                             1.92 kB         176 kB
├ ○ /location                            3.75 kB         186 kB
├ ○ /my                                  2.99 kB         186 kB
├ ○ /onboarding                            138 B         102 kB
├ ○ /opportunity                         7.79 kB         190 kB
├ ○ /report                              4.89 kB         188 kB
└ ○ /saved                               2.97 kB         186 kB
+ First Load JS shared by all             102 kB
  ├ chunks/4557610a…                     54.2 kB
  ├ chunks/785-778584…                   45.8 kB
  └ other shared chunks                  2.05 kB
```

**읽는 법**
- **공유 청크 102 kB가 바닥값** — 어느 라우트를 열어도 이만큼은 받는다. 라우트 고유분보다 이쪽이 크다.
- **`/explore` 195 kB가 최대** — 고유분 12.3 kB(가상화 + 필터/정렬 로직). 화면 복잡도를 감안하면 이상치는 아니다.
- `three`(~150 kB)는 이미 `next/dynamic`(`ssr: false`)으로 분리돼 초기 번들 밖이다 — 위 표에 안 잡히는 이유.
- `○`(static) 16개 / `ƒ`(dynamic) 4개. 동적은 전부 Route Handler다. **`/`를 포함한 페이지 전부가 prerender된다.**

## Core Web Vitals

**아직 표본 없음.** Phase 0에서 수집 경로만 깔았다:
- [components/web-vitals.tsx](../../apps/web/src/components/web-vitals.tsx) — `next/web-vitals`의 `useReportWebVitals`, sendBeacon 전송
- [app/api/vitals/route.ts](../../apps/web/src/app/api/vitals/route.ts) — 검증 후 서버 로그 (테스트 9케이스)

신규 의존성 0(Next 내장), 번들 영향 0(`/` 185 kB 변동 없음).

| 지표 | p75 (before) | 목표 | 비고 |
|---|---|---|---|
| LCP | ___ | | Pretendard CDN 블로킹 제거(Phase 2a) 효과가 여기 잡힌다 |
| INP | ___ | | |
| CLS | ___ | | |
| FCP | ___ | | |
| TTFB | ___ | | 카탈로그 서버화(Phase 2b) 효과 |

> 채우는 법: `pnpm dev` 후 각 라우트를 실제로 열고 서버 로그의 `[vitals]` 라인을 모은다.
> 합성지표만으론 INP가 안 잡히므로 실제 클릭·스크롤을 해야 한다.

## 네트워크 (Phase 2 대상)

| 항목 | 현재 | 근거 |
|---|---|---|
| 카탈로그 요청 수 (앵커 있음) | 최대 **3회** | [useEnsureCatalog.ts](../../apps/web/src/hooks/useEnsureCatalog.ts) 반경 5→10→20km 순차 재조회 |
| 카탈로그 페이로드 (앵커 없음) | 300행 ≈ **200–350 kB** | `NO_ANCHOR_LIMIT = 300`, 브라우저에서 supabase-js 직접 호출 |
| 폰트 | jsdelivr CDN **render-blocking** | [layout.tsx](../../apps/web/src/app/layout.tsx) `<link rel="stylesheet">`, preconnect 없음 |
| `revalidate` 선언 | 페이지 **0개** | Route Handler는 `/api/trail-route`(86400s) 하나뿐 |

## Phase 0에서 고친 것 (계측 자체의 결함)

1. **CI가 빌드를 검증하지 않았다** — [ci.yml](../../.github/workflows/ci.yml)이 `typecheck`+`test`만 돌아, 프로덕션 빌드를 깨뜨린 커밋도 green으로 통과했다. `build`·`lint` 추가.
2. **CI가 `dev` 브랜치를 무시했다** — `push` 트리거가 `[main]`뿐이라 야간 파이프라인이 직접 커밋하는 `dev`에서 CI가 한 번도 안 돌았다. `[main, dev]`로 확장.
3. **`pnpm lint`가 `src/`를 건너뛰었다** — `next lint`에 `--dir`가 없어 실제 소스를 안 봤다. 같은 규칙 위반이 `build` 중에는 잡히는데 `lint`는 "✔ No ESLint warnings"를 냈다. `--dir src` 추가.
4. **Next가 워크스페이스 루트를 잘못 추론했다** — `~/pnpm-lock.yaml`(repo 밖)이 감지돼 빌드 트레이싱이 홈 디렉터리를 훑었다. `outputFileTracingRoot`로 모노레포 루트 고정.

> 1~3은 전부 **게이트가 있는 줄 알았는데 없던** 경우다. 계측을 깔면서 계측 자체의 구멍이 먼저 나왔다.

---

## Phase 1 — 코퍼스 실측 (2026-08-03)

자연어 검색의 전제는 "색인할 산문"이다. 임베딩을 붙이기 전에 **코퍼스가 실제로 있는지부터 측정**했고, 결과가 계획을 바꿨다.

### API 응답 실측 (배포 전, 실제 호출)

| 소스 | 산문 필드 | fill rate | 비고 |
|---|---|---|---|
| trail (두루누비) | `crsSummary`·`crsContents`·`crsTourInfo` | **100%** (100건 표본) | 중앙값 104·97·115자. **목록 응답에 포함 → 추가 호출 0회** |
| seoul_culture | `PROGRAM` / `PLAYER` / `ETC_DESC` | **14% / 11% / 3%** (300건 표본) | 필드는 있으나 대부분 빈 값 |
| culture_info | **없음** | **0%** | 목록 응답 12필드 전부 메타데이터 |

**culture_info를 채우려면** `detail2`를 seq당 1회 = 약 1,200회 추가 호출이 필요하다. 실제로 시도했더니 **50회 연속 호출에서 `LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR`**가 떴다. → 별도 백필 배치 이슈로 분리(재시도·이어받기·호출간격 필요).

### 적재 후 실측 (Edge Function v6, 553행 upsert)

| 소스 | 행수 | description 보유 | 평균 길이 |
|---|---|---|---|
| seoul_culture | 273 | 35 (12.8%) | 135자 (최대 934) |
| culture_info | 142 | 0 (0%) | — |
| trail | 30 | 19 (63.3%) | 304자 (최대 597) |
| **전체** | **445** | **54 (12.1%)** | |

> trail 63%의 정체: 이번 적재로 갱신된 19행은 **100%** description을 갖는다. 나머지 11행은 수도권 필터에 안 걸려 재적재되지 않은 stale 행(마지막 fetch 2026-07-13~23)이다. 매핑 결함이 아니다.

### 이 숫자가 바꾼 결정

계획서는 "40% 미만이면 검색이 약해지므로 설명 생성에 무게를 옮긴다"고 미리 정해뒀다. **12%는 그 조건에 명확히 해당한다.**

- ❌ **검색형 RAG를 주력으로 두지 않는다** — 445행 중 391행이 색인 대상에서 빠지면, 결과가 부실할 때 "데이터가 없어서"인지 "알고리즘이 나빠서"인지 구분할 수 없다.
- ✅ **설명 생성을 주력으로** — `scoring.ts`의 `breakdown`(거리·비용·시간·난이도)을 입력으로 쓰므로 **445행 전부에 동작**한다. description 유무와 무관.
- ✅ trail 19행 + seoul 35행 = 54행은 코퍼스가 실하다(평균 200자+). 검색은 이 위에서 보조로.

**측정하지 않고 pgvector를 붙였다면** 445행짜리 벡터 인덱스 중 391행이 `"강동구 · 강동아트센터 · 콘서트"` 같은 breadcrumb였을 것이다.
