# `@motungi/core` 공개 API 경계 (M-114)

`packages/core/src/index.ts`는 원래 11개(현재는 geo.ts가 추가돼 12개) 모듈을 전량
`export *`했다. 그 결과 core 내부에서만 쓰는 어댑터 파서·타입까지 패키지 공개 API
표면(`@motungi/core`에서 import 가능한 이름)에 올라갔고, 그게 "미사용 export를
실수로 다시 연다" 재발 패턴(M-038 → M-091 → M-093)의 뿌리였다
(`docs/audit/2026-09-11-state-management.md` 축 5).

2026-09-23 밤, `apps/web`·`apps/mobile` 전체를 `from "@motungi/core"` import/re-export
기준으로 전수조사해 `index.ts`를 명시적 재export로 바꿨다. 아래는 그 결과와, 특히
"양쪽이 다 안 쓰는" WEB_ONLY 부류를 어떻게 판정했는지의 기록이다.

## 실측 (2026-09-23, M-113 반영 후 — 감사 시점 2026-09-11의 수치와 다름)

| 분류 | 개수 |
|---|---|
| BOTH (web·mobile 둘 다 import/re-export) | 44 |
| WEB_ONLY (이번 밤 core에 남긴 것) | 9 |
| WEB_ONLY (core에서 web으로 내림 — gu-summary 계열) | 6 |
| MOBILE_ONLY | 1 (`Opportunity`) |
| **index.ts 공개 심볼 합계** | **54** |

(축 5 원 감사의 "44/18/4/75"와 숫자가 다른 건 그사이 M-107·M-109·M-111·M-113이 실제
코드를 바꿨기 때문이다 — 예를 들어 M-113이 `ReverseGeoResult`·`parseReverseGeoResponse`
등을 신설해 BOTH로 넣었다. **여기 적힌 44/9/6/1이 2026-09-23 시점의 정본이다.**)

## core에서 `apps/web`으로 내린 것 (6개) — "web 전용이라 core에 있을 이유가 없다"

`gu-summary.ts` 전체(`GU_MIN_ACTIVITIES`·`GuSummary`·`isSeoulGu`·`summarizeGu`·
`summarySentence`·`guFaqs`)를 `apps/web/src/lib/gu-summary.ts`로 옮겼다.

- 전량 SEO 구(區) 페이지(`/explore/[gu]`, 랜딩, 사이트맵) 전용이다 — mobile이 이 개념
  자체를 쓴 적이 없다(mobile엔 구 단위 페이지가 없다).
- core 내부의 다른 모듈도 이 파일을 참조하지 않는다(`export * from "./gu-summary"`와
  자기 테스트뿐이었다) — core 잔류 이유가 없었다.
- 이동 후 web의 `lib/`는 여전히 순수하다(react-web.md 규율) — 옮긴 파일이 import하는 건
  `@motungi/core`(`MockOpportunity`·`normalizeGu`)뿐이다.
- 콜로케이션 테스트(`gu-summary.test.ts`)도 함께 옮겨 `check-pure-tests.sh`가 계속
  강제한다(이번엔 `apps/web/src/lib/` 쪽에서).

## core에 남은 WEB_ONLY 9개 — 분류와 근거

| 심볼 | 소속 모듈 | 분류 | 근거 |
|---|---|---|---|
| `MockOpportunity` | `catalog.ts` | **구조적으로 이미 BOTH** | `rowToMock`이 만들고 `CatalogResult.data`가 이 타입이다. mobile은 이름을 직접 import하지 않지만 `CatalogResult`·`fetchOpportunities` 반환값을 통해 구조적으로 이 타입에 의존한다(TS는 구조적 타이핑이라 이름 import 없이도 성립). **"mobile 미사용"이 아니라 "mobile이 이름을 부를 필요가 없을 뿐"** — core 잔류가 맞다. |
| `GeoPoint` | `types.ts` | **구조적으로 이미 BOTH** | 위와 같은 이유. `RadiusFetch`·`NeighborhoodPick`·`UserAnchors` 등 BOTH 타입 다수가 구조에 포함한다. mobile의 `useEnsureCatalog.ts`가 `RadiusFetch`를 쓰는 순간 이미 `GeoPoint`에 의존한다. |
| `POPULAR_NEIGHBORHOODS` | `catalog.ts` | mobile이 **아직 안 쓰는 것** | 진입 UX용 기본 동네 칩 — mobile도 동네 선택 화면이 있으니 잠재 재사용 대상이다. 다만 지금 mobile 화면이 이 기본값을 쓰는지는 이번 조사 범위 밖이라 단정하지 않는다. |
| `CATEGORY_LABEL` | `view.ts` | mobile이 **아직 안 쓰는 것(구조적으로는 이미 BOTH)** | mobile 화면들(`explore.tsx`·`saved.tsx`·`report.tsx`·`opportunity.tsx`)은 `item.categoryLabel`(= `rowToMock`이 이미 `CATEGORY_LABEL`로 채운 필드)을 읽기만 해서 이름을 직접 import할 필요가 없다. 즉 `MockOpportunity`와 같은 부류 — 데이터를 통해 이미 양쪽이 쓴다. |
| `normalizeGu` | `view.ts` | mobile이 **아직 안 쓰는 것** | 구 표기 정규화. mobile엔 구 단위 개념(랜딩 히어로 캐러셀·구 페이지)이 아직 없어 쓸 자리가 없다. web 전용 기능(캐러셀 M-xxx, `/explore/[gu]`)이 core 함수를 쓰는 정상 형태 — core 잔류가 맞다. |
| `diagnosisSummaryChips` | `view.ts` | mobile이 **아직 안 쓰는 것** | 리포트 화면의 진단 요약 칩(`apps/web/src/app/report/page.tsx`). mobile `report.tsx`도 진단 리포트 화면이 있어 잠재 재사용 대상이지만, 현재 mobile 리포트는 이 칩 UI 자체가 없다(UX 차이 — 두 리포트 화면이 완전히 같은 정보를 보여주지 않는다). |
| `isOpportunityCategory` | `database.types.ts` | mobile이 **아직 안 쓰는 것** | 타입가드. web의 `/api/why-reasons` route가 외부 입력(카테고리 문자열) 검증에 쓴다. mobile엔 그런 외부 입력 경로가 없다 — 범용 유틸이라 core 잔류가 맞다. |
| `parseGpxPoints` | `adapters/util.ts` | mobile이 **아직 안 쓰는 것** | web의 `/api/trail-route` route가 두루누비 GPX XML을 파싱할 때 쓴다. mobile도 산책로 미리보기가 있다(M-052) — `useTrailRoute` 훅 쌍은 M-108에서 "서버상태 전략 결정 후"로 미뤄둔 영역이라, GPX 파싱 공유 여부도 그 결정에 종속된다. 지금 당기지 않는다. |
| `buildWhyReasonsPrompt` | `view.ts` | **web 전용 — 후보(이번 밤엔 안 옮김)** | LLM 프롬프트 빌더로, web의 `/api/why-reasons` route(서버 전용)에서만 호출된다. mobile의 `useWhyReasons.ts`는 이 함수를 부르지 않고 **web 오리진의 `/api/why-reasons`를 호출**한다(주석: "웹 오리진의 /api/why-reasons가"). 즉 mobile은 앞으로도 이 함수를 직접 부를 계획이 없어 보인다 — `gu-summary`와 같은 사유로 `apps/web`으로 내리는 게 맞을 가능성이 높다. **다만 `WhyReasonsPromptInput` 타입은 BOTH**(양쪽 훅이 뷰 타입으로 참조)라 분리 작업이 gu-summary보다 손이 간다(타입은 core, 함수는 web으로 갈라야 함) — 이번 밤 스코프(M-114)는 index.ts 재export + gu-summary 이동까지였고, 이 이동은 범위를 넘어 **다음 밤 후보로 남긴다**. |

## MOBILE_ONLY 1개

- `Opportunity`(`types.ts`) — mobile의 `saved.tsx`가 `Opportunity & {...}` 형태로 직접
  확장해 쓴다. web은 `MockOpportunity`(이미 `Opportunity`를 확장한 완성형)만 쓰고
  베이스 타입을 직접 부르지 않는다. 둘 다 core 잔류가 맞다(BOTH의 기반 타입).

## 후속 후보 (이번 밤 스코프 밖)

- `buildWhyReasonsPrompt`를 `apps/web`으로 내리기(위 표 참조) — `WhyReasonsPromptInput`과의
  분리가 필요해 별도 이슈로 다루는 게 낫다.
- `POPULAR_NEIGHBORHOODS`·`diagnosisSummaryChips`·`parseGpxPoints`는 "mobile이 아직
  안 쓴다"이지 "web 전용"이 아니다 — mobile이 해당 기능을 만들 때 자연히 BOTH로
  전환될 자리이므로 지금 옮기지 않는다(옮겼다가 mobile 작업 때 다시 올려야 하면
  왕복 비용만 든다).
