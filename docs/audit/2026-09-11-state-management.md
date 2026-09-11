# 전수조사 — 상태관리 · 중복 · core 경계 · 디자인 간극

> 조사일 2026-09-11 · 대상 `apps/web`(89 파일) · `apps/mobile`(34 파일) · `packages/core`
> 다음 세션 작업용. 수치는 전부 실측이고 근거는 `file:line`으로 달았다.

---

## TL;DR — 한 문장

**web은 서버 상태를 TanStack Query로 옮겼는데 mobile은 그대로 `useEffect`+Zustand에 남아 있고,
그 둘이 `packages/core`의 스토어 하나를 공유하면서 web은 쓰지 않는 슬라이스(`catalog`)를
mobile만 쓰는 기형이 됐다.** 여기에 web 안에도 표준을 벗어난 훅이 하나 남아 있다
(`useNeighborhoodSearch` — 코드베이스에서 유일하게 `AbortController`를 손으로 관리).

중복 파일도 같은 뿌리다 — web↔mobile 동명 파일 17쌍은 **바이트 단위로 같은 건 0건**이지만
같은 이름·같은 export·같은 계약인데 구현이 따로 살고, mobile 코드 5곳이 스스로
"웹과 같다 / react-query가 없어서 손으로 짠다"고 적어 두었다.

**core도 이름값을 못 하고 있다** — export 141개 중 web·mobile이 **둘 다 쓰는 건 44개(31%)**뿐이고,
`index.ts`가 전량 `export *` 라 내부 구현(어댑터 파서 등)까지 공개 API로 새어 나간다.

**디자인도 갈라져 있다** — 색·간격은 토큰을 공유하는데, **타이포는 mobile이 토큰을 import하지
않고 손으로 다시 써서 7개 역할 중 6개가 어긋난다.** 그런데 코드 주석은 "웹 스케일과 맞춤"이라고
적혀 있다. M-104(mobile 검색 주석이 "웹과 동일"이라 적혀 있었지만 사실이 아니었던 것)와
**완전히 같은 사고 유형**이다.

우선순위: **① mobile 서버상태 결정(가장 큼) → ② useNeighborhoodSearch(가장 쉬움)
→ ③ 중복·core 경계·디자인(독립적, 먼저 해도 됨) → ④ 나머지**

---

## 축 1 — TanStack Query를 써야 하는데 안 쓰는 것

### 1-A. `useNeighborhoodSearch` — web 표준에서 이탈한 유일한 훅 🔴

[apps/web/src/hooks/useNeighborhoodSearch.ts](../../apps/web/src/hooks/useNeighborhoodSearch.ts)

| 근거 | 실측 |
|---|---|
| web 훅 8개 중 `useQuery` 사용 | **6개** |
| **web 훅** 중 `AbortController`를 손으로 관리 | **이 파일 하나뿐** |
| 이 훅의 `useEffect` | **3개** (검색 요청 · IME 유예 · 취소) |

> 참고: `AbortController` 자체는 코드베이스에 5곳 있다 — route handler 1곳(`api/why-reasons`,
> 서버라 무관)과 **mobile 3곳**(`useWhyReasons`·`useTrailRoute`·`location.tsx`).
> mobile 것들은 TanStack이 없어서 수동인 게 당연하다(축 1-B). 즉 **"TanStack이 있는데도
> 손으로 관리하는 곳"은 이 훅 하나**다.

**이미 같은 판단을 내려놓고 적용만 안 했다.** [lib/query.tsx:9-12](../../apps/web/src/lib/query.tsx#L9-L12)의 주석:

> *"catalog를 Zustand에 두니 캐시 무효화·요청 취소·재시도를 전부 손으로 짜게 됐다
> (lastPointRef 수동 캐시키, cancelled 플래그, retry nonce). 전부 queryKey가 하는 일이다."*

그 교훈이 이 훅에는 오지 않았다. 지금 이 훅은 `results`·`searching` 상태를 직접 들고
`AbortController`로 경합을 막는데, 전부 `useQuery`가 하는 일이다.

**전환 비용이 거의 없다** — `queryFn: async ({ signal })`로 TanStack이 signal을 직접 주고,
[lib/geo.ts:45-48](../../apps/web/src/lib/geo.ts#L45-L48)의 `searchNeighborhoods(q, signal?)`가
이미 그 형태를 받는다. **인터페이스 변경 0건.**

**얻는 것**: 같은 검색어 재입력 시 캐시 히트(지금은 매번 재요청) · 상태 2개 제거 · 경합 처리 위임.

⚠️ **디바운스와 IME 보류는 그대로 둬야 한다.** 그건 서버 상태가 아니라 **입력 상태**다.
훅 주석([:44-55](../../apps/web/src/hooks/useNeighborhoodSearch.ts#L44-L55))이 서술하는 한글 IME 함정
(compositionend가 안 와서 결과가 영영 안 뜨던 문제)은 TanStack이 풀어주지 않는다.
`query` → `debouncedQuery`를 만들고 **그것만 queryKey에 넣는** 구조가 맞다.

### 1-B. mobile 훅 5개 전부 — 가장 큰 건 🔴

| 훅 | web | mobile |
|---|---|---|
| `useEnsureCatalog` | `useQuery` 2 | `useEffect` 2 |
| `useOpportunity` | `useQuery` 2 | `useEffect` 2 |
| `useSavedOpportunities` | `useQuery` 3 | `useEffect` 3 |
| `useTrailRoute` | `useQuery` 2 | `useEffect` 3 |
| `useWhyReasons` | `useQuery` 2 | `useEffect` 3 |

**mobile에는 `@tanstack/react-query`가 설치조차 돼 있지 않다**(`apps/mobile/package.json`).

이건 **이번에 고친 explore 검색 버그와 정확히 같은 구조**다 — 같은 이름의 훅이 두 앱에
따로 있고, 한쪽만 고치면 조용히 갈라진다(M-104 선례). 실제로 이미 갈라져 있다:
web `useOpportunity`는 `initial`(서버가 준 1건)을 받아 스켈레톤을 건너뛰는데
mobile은 그 인자가 없다.

⚠️ **RN 환경 판단이 필요하다.** TanStack Query 자체는 RN을 지원하지만,
포커스 관리(`AppState`)·온라인 감지(`NetInfo`)를 RN용으로 별도 배선해야 한다.
도입 여부는 다음 세션에서 **결정부터** 하고 들어가야 한다 — 조사 결과가 "도입해야 한다"까지는
말하지 않는다.

### 1-C. 나머지 수동 페칭 🟡

- [web/src/app/loading/page.tsx](../../apps/web/src/app/loading/page.tsx) — `useEffect` 2 + 스코어링 후 `setResults`
- [web/src/app/login/page.tsx](../../apps/web/src/app/login/page.tsx) — `useEffect` 2 (리다이렉트 성격, 서버상태 아님)

---

## 축 2 — `useEffect` 전수 (30파일)

useEffect 자체가 나쁜 게 아니다. **서버 상태를 다루는 effect만** 문제다.

### 분류

| 성격 | 판정 | 해당 |
|---|---|---|
| **서버 데이터 페칭** | 🔴 TanStack으로 | mobile 훅 5개, `useNeighborhoodSearch`, `useEnsureCatalog`(web은 일부) |
| **브라우저 이벤트 구독** | ✅ 정당 | `sunset-splash`(keydown) · `scroll-row-nav` · `venue-map` · `poster-ring`(rAF·리사이즈) |
| **디바운스 타이머** | ✅ 정당 | [explore-search.tsx](../../apps/web/src/components/explore-search.tsx) (150ms), `useNeighborhoodSearch`의 IME 유예 |
| **라우팅 부수효과** | ✅ 정당 | `login/page`(로그인 후 replace) · `auth/callback` |
| **URL 동기화** | ✅ 정당 | [explore/(list)/page.tsx](../../apps/web/src/app/explore/(list)/page.tsx) (q·cat 되쓰기) |
| **가상화/측정** | ✅ 정당 | `explore-list`(virtualizer) · `hero-carousel` |

**결론: 30개 중 손댈 것은 서버 페칭 계열뿐이고, 나머지는 그대로 두는 게 맞다.**
"useEffect를 없애자"가 목표가 되면 정당한 브라우저 연동까지 건드리게 된다.

---

## 축 3 — 전역상태 결합도 (사용자 지시: "결합도 높아질 것 같으면 전역상태 쓰라")

### 3-A. 🔴 `catalog` 슬라이스가 기형이다 — 가장 시급

[packages/core/src/store.ts:62-64,73,169](../../packages/core/src/store.ts#L62)에 `catalog`·`catalogStatus`·`setCatalog`가 있는데:

| | web | mobile |
|---|---|---|
| `s.catalog` 구독 | **0곳** | **4곳** (explore·report·saved·useOpportunity) |
| `setCatalog` 호출 | **0곳** | 1곳 (useEnsureCatalog) |

**web은 이미 TanStack으로 옮겼고**([useReportFallback.ts:27](../../apps/web/src/hooks/useReportFallback.ts#L27) 주석이
"예전엔 전역 catalog에 써넣었다"고 기록), core 스토어엔 잔재가 남아 mobile만 쓰고 있다.

즉 **core 공용 스토어에 한쪽 앱 전용 슬라이스가 들어 있는 상태**다.
mobile을 TanStack으로 옮기면 이 슬라이스는 통째로 삭제 대상이 된다.

### 3-B. ✅ 전역상태 사용은 대체로 적절하다

스토어 슬라이스별 성격 판정:

| 슬라이스 | 성격 | 판정 |
|---|---|---|
| `anchors`(집·직장 좌표) | 화면 5개 이상이 읽고 URL로 복원 불가 | ✅ 전역이 맞다 |
| `answers`(진단 답변) | 진단→로딩→리포트→탐색으로 흐름 | ✅ 전역이 맞다 |
| `savedIds` | 어느 화면에서든 토글, 영속 필요 | ✅ 전역이 맞다 |
| `user` | 앱 전체 | ✅ 전역이 맞다 |
| `results`(스코어링 결과) | 로딩→리포트 **한 번만** 전달 | 🟡 검토 — 사실상 화면 간 1회 전달용 |
| `catalog` | **서버 데이터** | 🔴 전역상태가 아니라 서버상태다 (3-A) |

**이번 리팩토링에서 구독 입도는 이미 고쳤다**(M-105) — `savedIds` 배열 통째 구독 2곳을
파생값(`.length`·`includes`)으로 좁혔고, 나머지 9곳은 배열 자체가 필요해 정당함을 확인했다.

### 3-C. 🟡 prop 개수가 많은 컴포넌트 — 하지만 이건 정상이다

| 컴포넌트 | props |
|---|---|
| `report-desktop` | 13 |
| `opportunity-detail-desktop` | 12 |
| `opportunity-detail-mobile` | 10 |

**전역상태로 옮기지 마라.** 이건 이번 리팩토링에서 **의도적으로 만든 구조**다 —
컨테이너가 스토어를 구독하고 memo된 트리에 값으로 내려보내야 렌더 격리가 성립한다.
자식이 직접 스토어를 구독하면 memo 경계가 무의미해진다(`render-isolation.test.tsx`가 실측 중).

다만 **prop이 늘어나는 게 정상인지**는 다음 세션에서 한 번 더 볼 값어치가 있다 —
12~13개는 "값 묶음(예: `deadline`+`timeText`+`hasLink`를 하나의 뷰모델로)"으로 줄일 여지가 있다.

### 3-D. 🟡 같은 폴백 문자열 11곳 중복

`?? "우리 동네"`가 **web 6곳 + mobile 5곳 = 11곳**에 각자 선언돼 있다.

```
web    explore/(list)/page · loading/page · report/page · saved/page
       opportunity-detail-desktop · opportunity-detail-mobile
mobile (tabs)/explore · (tabs)/report · (tabs)/saved · loading · opportunity
```

core로 올릴 후보(`displayDongName(anchors)`). 작아 보이지만 **11곳이면 갈라짐이 이미 시작될 만한
숫자**이고, 이번에 고친 M-104(검색 로직 복붙)와 정확히 같은 패턴의 씨앗이다.

---

## 축 4 — 중복 파일 / 중복 코드

### 4-A. 🔴 web↔mobile 동명 파일 17쌍 — 대부분 "의도된 중복"이지만 계약이 안 묶여 있다

| 파일 | web | mobile | 공통 export |
|---|---|---|---|
| `useOpportunity.ts` | 49줄 | 64줄 | `OpportunityLoadStatus`·`OpportunityView`·`useOpportunity` |
| `useSavedOpportunities.ts` | 69줄 | 81줄 | `SavedLoadStatus`·`SavedView`·`useSavedOpportunities` |
| `useWhyReasons.ts` | 75줄 | 84줄 | `WhyReasonsView`·`useWhyReasons` |
| `useTrailRoute.ts` | 36줄 | 59줄 | `useTrailRoute` |
| `useEnsureCatalog.ts` | 81줄 | 66줄 | `useEnsureCatalog` |
| `geo.ts` | 63줄 | 64줄 | `NeighborhoodSearchResult`·`ReverseGeoResult` |
| `auth.ts` | 117줄 | 125줄 | `initAuthListener` |

(그 외 `supabase.ts`·`useAppStore.ts`·`opportunities.ts`·`icons.tsx`·`thumbnail.tsx`·
`venue-map.tsx`·`hero-carousel.tsx`·`neighborhood-menu.tsx`·`explore-skeleton.tsx`·`loading.tsx`)

**바이트 단위로 같은 파일은 0건**(DOM ≠ RN이라 당연하다). 문제는 **같은 이름·같은 export·같은
계약인데 구현이 따로 산다**는 것이다. 헌법도 "로직 공유는 복붙이 아니라 core 경유"라고 못박고 있다.

**코드가 스스로 증언한다** — mobile 파일 5곳이 "웹과 같다"고 적어 뒀다:

```
hooks/useTrailRoute.ts:14   "모바일엔 react-query가 없으므로(useWhyReasons.ts와 동일한 제약)
                             plain useState/useEffect로 구현한다"
hooks/useWhyReasons.ts:21   "모바일엔 react-query가 없으므로(M-045 notes와 동일한 …)"
lib/geo.ts:40               "웹과 동일 엔드포인트를 오리진 경유로 호출"
ui/neighborhood-menu.tsx:2  "웹 neighborhood-menu.tsx와 같은 의도를 모바일에"
app/(tabs)/my.tsx:31        "개수를 실제 진입점에 붙인다(웹과 동일)"
```

즉 **제약을 인지하고 우회한 기록이 코드에 남아 있다.** 축 1-B(mobile TanStack)와 같은 뿌리다.

`geo.ts`의 실제 차이는 **RN 환경 차이뿐**이다(상대경로 `/api/geo` vs `EXPO_PUBLIC_WEB_ORIGIN`,
`reportError` 유무). 순수 파싱·타입은 동일하므로 **타입과 응답 파싱은 core로 올릴 수 있다**.

### 4-B. 🟡 web 내부 진짜 중복 — `itemListJsonLd` 2개 구현

| 위치 | 형태 |
|---|---|
| [lib/seo.ts:234](../../apps/web/src/lib/seo.ts#L234) | `export function itemListJsonLd(items, name)` — `safeJson` 사용, 빈 배열이면 `null` |
| [app/explore/[gu]/page.tsx:126](../../apps/web/src/app/explore/[gu]/page.tsx#L126) | `function itemListJsonLd(gu, items)` — **로컬 재정의**, `.replace(/</g, "\\u003c")` 직접 |

본문(`@context`·`@type`·`itemListElement` 조립)이 **동일**하고 차이는 `name` 조립과 빈 배열 처리뿐이다.
문제는 **이스케이프 규칙이 갈라진다는 것** — `safeJson`을 고쳐도 `[gu]` 쪽은 안 따라온다.
JSON-LD는 크롤러가 읽는 출력이라 조용히 갈라지면 색인에 영향이 간다.

→ `lib/seo.ts` 버전에 `name`을 인자로 넘겨 하나로 합치는 게 맞다(이미 그 시그니처다).

### 4-C. 🟡 미사용 export 3건 — 반복되는 패턴

| 심볼 | 실사용 | 판정 |
|---|---|---|
| `lib/explore-filters.ts → filterLabelOf` | 같은 파일의 `exploreHref`만 | export 제거, 모듈 내부로 |
| `lib/seo.ts → absoluteUrl` | **테스트만** | export 제거 검토 |
| `lib/supabase.ts → assertSupabase` | 테스트가 mock으로만, 실호출 0 | 제거 또는 실배선 확인 |
| `lib/rate-limit.ts → __resetRateLimitForTests` | route 테스트 2곳 | ✅ **정당** (이름이 용도를 밝힘) |

**이건 이 레포에서 반복되는 패턴이다** — M-038(scoring 4종) → M-091(아이콘 11개) →
M-093("M-038 export-과다개방 패턴 재발"). 개별 이슈로 또 잡기보다 **lint 룰로 막는 게 맞다**
(`eslint-plugin-unused-imports` 또는 `knip`). 그게 이번 규율 도입(M-098)의 연장선이다.

### 4-D. ✅ 중복이 아닌 것 (확인 완료)

- `icons.tsx` ↔ `landing-icons.tsx` — 겹치는 아이콘 **0개**. 제품 UI/랜딩 분리라 정당
- `error.tsx` ↔ `global-error.tsx` — Next.js 규약(라우트 에러 vs 루트 에러)
- 여러 `layout.tsx` — App Router 규약
- 테스트 헬퍼 동명 함수(`seed`·`makePick`·`makeClient`) — 파일 스코프라 정상

---

## 축 5 — `packages/core`가 "공통"이 아니다

### 5-A. 🔴 core export 141개 중 **양쪽이 쓰는 건 44개(31%)**

`packages/core/src/index.ts`는 11개 모듈을 **전량 `export *`** 한다. 그 결과:

| 분류 | 개수 | 비율 |
|---|---|---|
| **BOTH** (web·mobile 둘 다 사용) | **44** | 31% |
| WEB_ONLY | 18 | 13% |
| MOB_ONLY | 4 | 3% |
| 앱에서 미사용 | 75 | **53%** |

**"공통 로직 패키지"라면서 실제 공통은 3분의 1이다.**

⚠️ 미사용 75개는 **데드코드가 아니다.** 대부분 core 내부에서 쓰인다
(`stripHtml`·`parseXmlItems`·`parseShiftHours` 등 어댑터 파서, `SourceKind`·`TimeWindow` 등 내부 타입).
문제는 그것들이 **`export *` 때문에 전부 패키지 공개 API 표면에 올라가 있다**는 것이다.
내부 구현이 공개 API가 되면 앱이 실수로 의존할 수 있고, 실제로 그게 M-038 → M-091 → M-093
(export-과다개방 재발)의 뿌리다.

**WEB_ONLY 18개가 특히 문제다** — `nearestAnchorKm`·`normalizeGu`·`searchHaystack`·
`diagnosisSummaryChips`·`summarizeGu`·`guFaqs`·`parseGpxPoints` 등. 이건 두 가지 중 하나다:
1. **mobile이 아직 안 쓰는 것**(= 갈라짐의 예고. `searchHaystack`은 이번 M-104로 mobile도 쓰게 됨)
2. **web 전용인데 core에 있는 것**(= `gu-summary`는 SEO/구 페이지 전용이라 mobile에 영원히 불필요)

**둘을 구분하지 않으면 core가 계속 부풀고, "공통"이라는 이름만 남는다.**

### 5-B. 판단 — core를 없앨 게 아니라 **경계를 명시**해야 한다

지적하신 "core 폴더가 있을 필요가 없다"는 **현상 진단으로는 맞다**. 다만 처방은 삭제가 아니다:

- `scoring`·`diagnosis`·`genre`·`explore`·`view`의 핵심은 **실제로 양쪽이 쓴다**(BOTH 44개의 본체).
  이건 core가 있어야 할 이유 그 자체다 — 없애면 M-104(검색 갈라짐)가 전 영역에서 재발한다.
- 진짜 문제는 **공개 API와 내부 구현이 구분되지 않는 것**이다.

제안하는 방향(다음 세션에서 결정):
1. `index.ts`의 `export *`를 **명시적 재export로 바꾼다** — 공개 API를 의도적으로 고른다.
   내부 파서·타입은 `./adapters`처럼 서브경로로만 접근하게 두거나 아예 안 뺀다.
2. **web 전용 로직은 core에서 내린다** — `gu-summary`(SEO 구 페이지 전용)가 1순위 후보.
3. 남은 것을 "이건 왜 공통인가"로 한 줄씩 설명할 수 있어야 한다.

---

## 축 6 — 디자인 간극 (web ↔ mobile)

### 6-A. ✅ 색·간격·radius는 실제로 공유된다

`apps/mobile/ui/theme.ts`가 `@motungi/tokens`에서 `color`·`radius`·`space`를 import한다.
주석대로 **"웹과 100% 동일"**이 맞다.

### 6-B. 🔴 타이포는 "맞췄다"고 적혀 있지만 **7개 중 6개가 어긋난다**

`packages/tokens`는 `typography`를 export하는데 **mobile은 그걸 import하지 않고 손으로 다시 썼다**.
[apps/mobile/ui/theme.ts:47](../../apps/mobile/ui/theme.ts#L47)의 주석은
*"타이포 프리셋 — 웹 typography 스케일과 맞춤"*이라고 주장한다. 실측:

| 역할 | tokens(=web이 쓰는 값) | mobile 실제 | 간극 |
|---|---|---|---|
| display | 30 / 39 / tracking −0.02em | **32 / 40** / −0.6 | 크기 +2, 행간 +1 |
| heading1 | 22 / 30 / bold(700) | **24 / 31** / 800 | 크기 +2, weight +100 |
| heading2 | 19 / 27 / bold(700) | **21 / 28** / 800 | 크기 +2, weight +100 |
| headline | 17 / 24 / semibold(600) | 17 / 24 / **700** | weight +100 |
| body | 15 / 23 / regular | 15 / 23 / 400 | ✅ 일치 |
| label | 13 / 18 / medium(500) | 13 / 18 / **600** | weight +100 |
| caption | 11 / 16 / medium | **12** / 16 / 500 | 크기 +1 |

**주석이 사실과 다르다.** 이게 가장 위험한 형태다 — 코드를 읽는 사람은 "맞춰져 있다"고 믿고
넘어가므로 아무도 검증하지 않는다(M-104의 mobile explore 주석 *"웹 explore와 동일"*이
사실이 아니었던 것과 **완전히 같은 사고**다).

### 6-C. 🟡 그림자도 토큰 밖

`tokens`가 `shadow`를 export하는데 mobile은 `shadowColor: "#1c1a17"`·`shadowRadius: 16`을
하드코딩했다([theme.ts:65-69](../../apps/mobile/ui/theme.ts#L65)). RN은 `boxShadow`가 아니라
`shadowOffset`/`elevation`을 쓰므로 **형태 변환은 불가피**하지만, **값의 출처는 토큰이어야 한다**.

### 6-D. 판단 — 간극을 없앨지, 의도된 차이로 인정할지 먼저 정해야 한다

모바일 타이포가 큰 것 자체는 **정당할 수 있다**(작은 화면·먼 시청 거리·터치 타깃).
실제로 iOS HIG와 Material은 웹보다 큰 기본 크기를 권한다.

그래서 이건 "무조건 맞춰라"가 아니라 **둘 중 하나를 고르는 결정**이다:
1. **의도된 차이라면** → tokens에 `typography.mobile` 스케일을 추가하고 mobile이 그걸 import한다.
   주석의 "웹과 맞춤"을 "웹 대비 +2px 스케일"로 고친다. **값의 출처가 토큰이 된다.**
2. **의도가 아니었다면** → tokens의 `typography`를 그대로 import해 간극을 없앤다.

**어느 쪽이든 지금처럼 "맞췄다고 적어두고 실제로는 손으로 다시 쓴" 상태는 안 된다.**
`DESIGN.md`가 단일 출처라고 선언한 것과 실제 코드가 어긋나 있다.

---

## 다음 세션 작업 순서 (제안)

### 1단계 — `useNeighborhoodSearch` → TanStack (작고 명확)
- `query` → `debouncedQuery` 분리, queryKey는 `debouncedQuery`만
- IME 보류·유예 effect는 **그대로 유지**
- `queryKeys.neighborhoodSearch(q)` 추가
- 기존 `useNeighborhoodSearch.test.ts`(114줄)가 무수정 통과해야 한다
- 검증: 수정 전 실패하는 캐시 히트 테스트를 먼저 추가(Red 확인)

### 2단계 — mobile TanStack 도입 **여부 결정** (조사만으론 못 정함)
- 결정 항목: RN 배선 비용(`AppState` 포커스 · `NetInfo` 온라인) vs 두 앱이 계속 갈라지는 비용
- 도입한다면: `useOpportunity` 하나로 파일럿 → 나머지 4개
- 도입 안 한다면: 최소한 web/mobile 훅의 **동작 계약**을 테스트로 고정해야 한다(M-104 재발 방지)

### 3단계 — `catalog` 슬라이스 정리
- 2단계 결과에 종속. mobile이 TanStack으로 가면 core 스토어에서 슬라이스 삭제
- 안 가면 최소한 "이건 mobile 전용"이라고 core 스토어에 명시

### 4단계 — 중복 정리 (2단계와 독립, 먼저 해도 된다)
- `itemListJsonLd` 로컬 재정의 제거 → `lib/seo.ts` 하나로 (축 4-B, 이스케이프 갈라짐 방지)
- 미사용 export 3건 정리 + **lint 룰로 재발 차단** (축 4-C — M-038·M-091·M-093이 이미 같은 패턴)
- `geo.ts`의 타입·응답 파싱을 core로 (RN 차이는 오리진뿐)

### 5단계 — core 경계 명시 (축 5)
- `index.ts`의 `export *` → 명시적 재export. 공개 API를 의도적으로 고른다
- web 전용 로직을 core에서 내린다 (`gu-summary`가 1순위 — SEO 구 페이지 전용)
- WEB_ONLY 18개를 "mobile이 아직 안 쓰는 것" vs "web 전용" 으로 분류한다

### 6단계 — 디자인 간극 **결정** (축 6, 구현 전에 판단 필요)
- 모바일 타이포가 큰 게 **의도인지 아닌지**부터 정한다(작은 화면이라 정당할 수 있다)
- 의도라면 tokens에 `typography.mobile`을 추가하고 주석을 사실대로 고친다
- 아니라면 tokens의 `typography`를 그대로 import해 간극을 없앤다
- 어느 쪽이든 `shadow`도 값의 출처를 토큰으로 (RN 형태 변환은 불가피하되 값은 토큰에서)

### 7단계 — 작은 것들
- `?? "우리 동네"` 11곳 통합 (M-110)
- `results` 슬라이스가 정말 전역이어야 하는지 재검토
- prop 12~13개를 뷰모델로 묶을지 검토

---

## 이 문서가 답하지 않는 것

- **mobile에 TanStack을 도입해야 하는가** — RN 환경 비용을 재보지 않았다. 2단계에서 결정할 일.
- **`results`를 어디로 옮길지** — 로딩→리포트 전달이 URL·라우터 state로 되는지 안 봤다.
- 성능 실측 — 이 조사는 정적 분석이다. 실제 리렌더 비용은 `render-isolation.test.tsx`가
  재는 범위 밖(프로덕션 프로파일링)이다.
