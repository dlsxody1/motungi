# 상태관리 전수조사 — TanStack Query · useEffect · 전역상태 결합도

> 조사일 2026-09-11 · 대상 `apps/web`(89 파일) · `apps/mobile`(34 파일) · `packages/core`
> 다음 세션 작업용. 수치는 전부 실측이고 근거는 `file:line`으로 달았다.

---

## TL;DR — 한 문장

**web은 서버 상태를 TanStack Query로 옮겼는데 mobile은 그대로 `useEffect`+Zustand에 남아 있고,
그 둘이 `packages/core`의 스토어 하나를 공유하면서 web은 쓰지 않는 슬라이스(`catalog`)를
mobile만 쓰는 기형이 됐다.** 여기에 web 안에도 표준을 벗어난 훅이 하나 남아 있다
(`useNeighborhoodSearch` — 코드베이스에서 유일하게 `AbortController`를 손으로 관리).

우선순위: **① mobile catalog(가장 큼) → ② useNeighborhoodSearch(가장 쉬움) → ③ 나머지**

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

### 4단계 — 작은 것들
- `?? "우리 동네"` 5곳 통합
- `results` 슬라이스가 정말 전역이어야 하는지 재검토
- prop 12~13개를 뷰모델로 묶을지 검토

---

## 이 문서가 답하지 않는 것

- **mobile에 TanStack을 도입해야 하는가** — RN 환경 비용을 재보지 않았다. 2단계에서 결정할 일.
- **`results`를 어디로 옮길지** — 로딩→리포트 전달이 URL·라우터 state로 되는지 안 봤다.
- 성능 실측 — 이 조사는 정적 분석이다. 실제 리렌더 비용은 `render-isolation.test.tsx`가
  재는 범위 밖(프로덕션 프로파일링)이다.
