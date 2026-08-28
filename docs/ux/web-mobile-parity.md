# 웹↔모바일 기능 대조표 (M-048)

> **목적:** M-048("앱↔웹 간극 정리")의 done_when 1번 산출물. `apps/web`에서 고친 것이 `apps/mobile`에
> 반영되지 않는 패턴을 화면 단위로 조사·분류한다. **이 문서 자체는 구현하지 않는다** — 누락 중
> 사용자가 막히는 항목만 개별 `M-NNN` 이슈로 등재했다(아래 "신규 등재 이슈" 절).
>
> **조사 범위:** 웹은 `apps/web/src/app/**` · `apps/web/src/components/**`, 모바일은
> `apps/mobile/app/**` · `apps/mobile/ui/**`. 공유 로직은 `packages/core`. 표의 모든 행은
> 실제 커밋 시점(dev HEAD `694a563`, 2026-08-12 야간)의 코드를 직접 읽고 확인했다 — 백로그
> 서술이 아니라 코드가 근거다.
>
> **판정 태그 4종:**
> | 태그 | 의미 |
> |---|---|
> | 🟢 **해소됨** | 예전엔 간극이었으나 이후 야간 파이프라인이 이미 고쳤다(커밋 인용) |
> | 🔵 **의도된 차이** | 플랫폼 특성상 다르게 구현하는 게 맞다(예: 데스크톱 사이드바, WebGL 폴백) |
> | 🔴 **누락(user-blocking)** | 사용자가 의도한 플로우를 못 타거나 잘못된 곳으로 빠진다 |
> | 🟡 **누락(연출·품질)** | 동작은 하지만 정보·비주얼이 웹보다 빈약하다(치명적이진 않음) |

---

## 0. 요약

| 구분 | 건수 |
|---|---|
| 🟢 해소됨 (과거 M-NNN이 이미 처리) | 6건 |
| 🔴 누락(user-blocking) → 신규 이슈 | 1건 (M-050) |
| 🟡 누락(연출·품질) → 신규 이슈 | 4건 (M-051~M-054) + 선택 1건 (M-055) |
| 🟡 누락(연출·품질) — 이번 밤 미등재(범위 밖 부가 발견) | 5건 (§8 참조) |
| 🔵 의도된 차이 | 다수 (표 내 표기) |

화면당 코드량 비교(모바일 대비 웹, 라인 수 기준 — 웹이 데스크톱+모바일 반응형을 한 파일에 담는
구조라 절대비교는 참고용):

| 화면 | 웹 (라인) | 모바일 (라인) |
|---|---:|---:|
| 홈/랜딩 | 85 (`app/page.tsx`) | 104 (`app/index.tsx`) |
| 진단 | 327 | 178 |
| 리포트 | 443 | 226 |
| 탐색 | 419 + `explore-card.tsx`/`explore-row.tsx`/`explore-skeleton.tsx` | 267 |
| 상세 | 560 (`opportunity-detail.tsx`) | 190 |
| 보관함 | 285 + `saved-card.tsx` | 179 |
| 위치 | 405 | 294 |

---

## 1. 홈/랜딩 (`/` · A1)

웹: `apps/web/src/app/page.tsx` (모바일 브레이크포인트 + `DesktopShell`+`WebLanding`).
모바일: `apps/mobile/app/index.tsx`.

| 항목 | 웹 | 모바일 | 판정 |
|---|---|---|---|
| 히어로 비주얼 | `HeroPosterStage`(3D 포스터링, WebGL 안 되면 캐러셀 폴백) | `HeroCarousel`(캐러셀 고정) | 🔵 의도된 차이 — 최소 히어로 건수 임계치(4건)는 두 플랫폼이 동일 상수로 맞춰져 있다(`page.tsx:47`, `index.tsx:18,35`) |
| 1차 CTA(`내 동네에서 찾기/골라받기`) | `/location` | `/location` | 파리티 일치 |
| **2차 CTA** | `/explore`("동네 활동 둘러보기") — `page.tsx:64-69`. 주석(`page.tsx:56`)에 "예전엔 /report로 가는 링크였는데, 진단을 건너뛴 폴백 리포트로 떨어졌다"고 명시 | **`/report`**("로그인 없이 바로 시작") — `index.tsx:75-77` | 🔴 **누락(user-blocking) — M-050 신규 등재.** 웹은 이미 이 정확한 버그를 고쳤다고 주석에 남겼는데 모바일은 그 옛 동작 그대로다. |
| "로그인 없이 바로 시작" 문구 | 링크가 아니라 안내 텍스트(`page.tsx:70-72`) | 실제 탭 가능한 고스트 버튼(위와 동일 요소) | 🔴 위와 동일 건(M-050 범위) — 웹은 문구와 CTA를 분리했는데 모바일은 문구 자체가 곧 오작동 CTA다 |

## 2. 진단 (`/diagnosis` · A3)

웹: `apps/web/src/app/diagnosis/page.tsx`. 모바일: `apps/mobile/app/diagnosis.tsx`.

| 항목 | 웹 | 모바일 | 판정 |
|---|---|---|---|
| Q1(관심사) 다중선택 | 지원(`MULTI_SELECT_STEP`, 토글) | 지원(`diagnosis.tsx:48,78-89`) | 🟢 **해소됨 — M-049, 커밋 `adf4c02`.** 양쪽 다 `draftToAnswers`의 배열 입력을 받는다 |
| Q2(시간대)·Q3(에너지) 단일선택 | 단일선택 유지 | 단일선택 유지 | 파리티 일치(의도된 동일 동작) |
| 데스크톱 스텝 레일 완료 미리보기 | 있음(데스크톱 전용 좌측 레일) | 없음(모바일은 진행바만) | 🔵 의도된 차이 — 데스크톱 와이드 레이아웃 전용 요소 |

## 3. 리포트 (`/report` · A5)

웹: `apps/web/src/app/report/page.tsx`. 모바일: `apps/mobile/app/(tabs)/report.tsx`.

| 항목 | 웹 | 모바일 | 판정 |
|---|---|---|---|
| 원픽 히어로 이미지 | `Thumbnail`(`page.tsx:132-137`, 카테고리 톤 플레이스홀더 폴백) | 없음(텍스트 카드만, `report.tsx:73-96`) | 🟡 누락(연출·품질) — §8-1로 미등재 기록(범위 밖) |
| 마감 배지 | `formatDeadline` 칩(`page.tsx:79,141-145`) | 없음 | 🟡 누락(연출·품질) — §8-1 |
| 공유 버튼 | 있음(`onShare`, `page.tsx:81-87,224-228`) | 없음(상세 화면엔 있음 — `opportunity.tsx:69-73` — 리포트만 빠짐) | 🟡 누락(연출·품질) — §8-1 |
| 진단 요약 사이드바(칩) | 데스크톱 전용(`page.tsx:362-380`) | 없음 | 🔵 의도된 차이(데스크톱 와이드 레이아웃) |
| 로딩 상태 구분 | `useReportFallback` + `ReportSkeleton`(idle과 empty를 구분) | `catalog.slice(0,6)` 폴백만, idle 상태에 스켈레톤 없음 — `!onePick`일 때 `isError`만 갈라보고 idle이면 "아직 추천할 활동이 없어요"로 오독될 수 있음 | 🟡 누락(연출·품질) — §8-1, explore 스켈레톤 부재(M-054)와 같은 패턴이라 후속 밤에서 함께 볼 것 권고 |
| 빈/에러 상태 문구·재시도 | `ReportEmpty`(alert 구분, 재시도+탐색 이중 액션) | 동등 구조(`isError` 분기, 재시도+탐색 버튼) | 파리티 일치 |

## 4. 탐색 (`/explore` · B1)

웹: `apps/web/src/app/explore/page.tsx` + `explore-card.tsx`/`explore-row.tsx`/`explore-skeleton.tsx`.
모바일: `apps/mobile/app/(tabs)/explore.tsx`.

| 항목 | 웹 | 모바일 | 판정 |
|---|---|---|---|
| 지역(구) 필터 | `select`(사이드바, `page.tsx:348-360`) | `Chip` 가로 스크롤(`explore.tsx:187-199`) | 🟢 **해소됨 — M-032, 커밋 `fec028b`.** UI 형태는 다르지만(의도된 차이) 기능은 동등 |
| 정렬(추천/거리/마감임박) | `select`(`page.tsx:295-306`) | `Chip` 3종(`explore.tsx:172-184`) | 🟢 해소됨 — M-032, 동일 커밋 |
| 난이도(낮음만 보기) | checkbox(`page.tsx:367-382`) | `Chip` 토글(`explore.tsx:183`) | 🟢 해소됨 — M-032, 동일 커밋 |
| 로딩 스켈레톤 | `ExploreRowSkeleton`/`ExploreCardSkeleton`, `catalogStatus === "idle"`일 때만 노출(`page.tsx:246-264`, `explore-skeleton.tsx`) | 없음 — `ListEmptyComponent`가 `catalogStatus`의 error/unconfigured만 구분하고 idle(로딩 중)은 그냥 "아직 등록된 활동이 없어요"로 표시됨(`explore.tsx:215-223`) | 🟡 **누락(연출·품질) — M-054 신규 등재.** 로딩 중에 "없음"으로 잘못 읽히는 실제 웹 M-042의 재발 패턴 |
| 활동 썸네일 이미지 | `Thumbnail`(카드: `explore-card.tsx:25-32`, 행: 웹은 모바일 뷰포트도 카드형 `ExploreRow`에 이미지 없음 — 웹 자체는 데스크톱 카드만 이미지) | 없음(`ActivityItem`, `explore.tsx:24-47`에 `Image` 컴포넌트 0건) | 🟡 **누락(연출·품질) — M-051 신규 등재**(상세 화면과 함께) |
| 검색(제목·요약) | 디바운스 150ms + IME 안전 다중 훅(`useNeighborhoodSearch`류와 별개, `ExploreSearch` 컴포넌트) | 즉시 반영(`explore.tsx:160-162`, 디바운스 없음) | 🔵 의도된 차이 — 로컬 클라 필터라 네트워크 요청이 없어 IME 폭주(M-047류) 리스크 자체가 없음. 다만 대량 리스트에서 매 타건마다 필터 재계산은 성능 후보(이번 문서 범위 밖) |

## 5. 기회 상세 (`/opportunity/[id]` · A6)

웹: `apps/web/src/components/opportunity-detail.tsx`. 모바일: `apps/mobile/app/opportunity.tsx`.

| 항목 | 웹 | 모바일 | 판정 |
|---|---|---|---|
| 대표 이미지 배너 | `Thumbnail`(모바일뷰 `163-169`, 데스크톱 `320-326`) | 없음(전체 파일에 이미지 관련 컴포넌트 0건) | 🟡 **누락(연출·품질) — M-051 신규 등재** |
| 위치 지도·산책로 폴리라인 | `VenueMap` + `useTrailRoute`(트레일 소스일 때만 경로 요청, `234-245`/`368-381`) | 없음(`react-native-maps` 등 지도 의존성 자체가 없음, `apps/mobile/package.json` 확인) | 🟡 **누락(연출·품질) — M-052 신규 등재.** (사람 의견: 하이퍼로컬 제품 특성상 우선순위 재고 여지) |
| 마감 D-day·출처 | `deadlineLabel()`+`DdayPill`+`sourceLabel` `dl` 블록(`211-230`/`430-449`) | 없음 — `o.meta` 3칸만 표시(`opportunity.tsx:120-128`), `deadlineLabel`/`timeRangeLabel` 미사용 | 🟡 **누락(연출·품질) — M-053 신규 등재** |
| "왜 나에게 맞을까요" 근거 | `useWhyReasons` 훅 — 규칙기반 즉시 렌더 후 LLM 산문으로 교체(`apps/web/src/hooks/useWhyReasons.ts`, M-044) | `whyReasons()` 규칙기반 직접 호출, LLM 경로 없음(`opportunity.tsx:12,66`) | 🟡 **누락(연출·품질) — M-055 신규 등재(선택, GEMINI_API_KEY 제약)** |
| "주말 나들이" 배지 | `isWeekendOuting(o)`(`172-176`/`329-333`) | 없음 | 🟡 누락(연출·품질) — §8-2로 미등재 기록 |
| 북마크 접근성 라벨 | `aria-label`(저장/저장취소) | `accessibilityLabel`(동일) | 🟢 **해소됨 — M-031, 커밋 `f5f800c`** |
| 공유하기 | 있음(카카오 공유, `onShare`) | 있음(`RNShare`, `onShare`) | 파리티 일치 |
| 크로스셀(탐색 유도 카드) | 데스크톱 전용(`489-501`) | 없음 | 🔵 의도된 차이(데스크톱 와이드 레이아웃) |

## 6. 보관함/북마크 (`/saved` · A7)

웹: `apps/web/src/app/saved/page.tsx` + `saved-card.tsx`. 모바일: `apps/mobile/app/(tabs)/saved.tsx`.

| 항목 | 웹 | 모바일 | 판정 |
|---|---|---|---|
| 카탈로그 창 밖 저장 id 해소 | `useSavedOpportunities`(단건 조회) | `useSavedOpportunities`(RN 재구현, `apps/mobile/hooks`) | 🟢 **해소됨 — M-045, 커밋 `291e0e8`** |
| 로딩/에러/빈 상태 구분 + 재시도 | 3분기 + `retry()` | 3분기 + `retry()`(`saved.tsx:113-140`) | 🟢 **해소됨 — M-046, 커밋 `381f54c`** |
| 저장 항목 썸네일 이미지 | `SavedCard`에 `Thumbnail`/`imageUrl` 사용 | 없음(`SavedItem`, 텍스트만) | 🟡 누락(연출·품질) — §8-3으로 미등재 기록(향후 M-051류 확장 후보) |
| 개수 라벨 로딩/에러 시 은닉 | 렌더 자체를 스킵 | 동일(`status !== "loading" && status !== "error"`일 때만 렌더) | 파리티 일치 |

## 7. 위치 설정 (`/location` · A2)

웹: `apps/web/src/app/location/page.tsx`. 모바일: `apps/mobile/app/location.tsx`.

| 항목 | 웹 | 모바일 | 판정 |
|---|---|---|---|
| 한글 IME 조합 중 요청 방지 | `onCompositionStart/End` + 2글자 최소 + `AbortController` | 2글자 최소(`MIN_QUERY_LEN`) + `AbortController`(RN엔 조합 이벤트가 없어 최소글자+취소로 대체) | 🟢 **해소됨 — M-047, 커밋 `ebaeb27`.** 구현 방식은 다르나(의도된 차이) 목표 동작은 동등 |
| 위치 권한 요청 전 설명 단계 | `<dialog>` 프라이밍(거부 상태 세분화 안내, `runGeolocation` 분리) | 없음 — `requestForegroundPermissionsAsync()` 바로 호출, 거부/보류 상태 구분 없이 동일 문구 | 🟡 누락(연출·품질) — §8-4로 미등재 기록 |
| 인기 동네 칩 | 동일 데이터(`POPULAR_NEIGHBORHOODS`) | 동일 | 파리티 일치 |

---

## 8. 추가로 발견된 공백 — 이번 밤 미등재 (범위 밖)

architect가 확정한 신규 이슈는 M-050~M-055(§9)로 한정했다. 조사 중 그 외에도 몇 가지 작은 간극이
더 나왔으나, 클러스터 상한(1이슈 클러스터라 오늘 밤은 M-048 하나)과 "조사·분류용" 범위를 지키기
위해 **아래는 이슈로 등재하지 않고 기록만 남긴다.** 다음 밤(특히 audit 모드)이 채택 여부를 판단할
후보로 남겨둔다.

1. **리포트 화면 이미지·마감배지·공유 부재** (§3) — M-051(탐색·상세 이미지)과 성격이 같아 향후
   스코프를 `apps/mobile/app/(tabs)/report.tsx`까지 넓히는 후속 이슈 후보. 리포트의 idle 로딩 상태가
   "추천할 활동이 없어요"로 오독될 수 있는 부분은 과거 웹의 M-042(loading.tsx 부재)와 같은 패턴이라
   우선순위를 조금 더 줘도 될 수 있음.
2. **상세 화면 "주말 나들이" 배지 부재**(`isWeekendOuting`, §5) — M-053(마감·출처)에 자연스럽게
   묶일 수 있는 아주 작은 항목. 별도 이슈로 쪼갤 만큼 크지 않다고 판단해 미등재.
3. **보관함 카드 썸네일 이미지 부재**(§6) — M-051과 동일 패턴(이미지 렌더 자체가 모바일에 없음).
   M-051의 `done_when`을 만족시키는 과정에서 공용 컴포넌트/패턴이 나오면 같이 처리하는 게 효율적일
   수 있어, 지금 별도 이슈로 만들지 않고 M-051 작업자가 참고하도록 여기 남긴다.
4. **위치 화면 권한 프라이밍 다이얼로그 부재**(§7) — 네이티브 권한 모델이 웹과 근본적으로 달라(OS
   시스템 다이얼로그가 이미 있음) 의도된 차이에 더 가깝다는 반론도 가능하다. 다만 웹처럼 "거부 시
   되돌릴 수 없다"는 사전 안내가 없어 사용자가 영구 거부 상태에 빠질 수 있다는 점은 실제 공백이다.
   판단이 갈리므로 사람이 우선순위를 정할 때 같이 봐 주길 권한다.
5. **탐색 화면 검색 디바운스 부재**(§4) — 로컬 필터라 네트워크 리스크는 없지만, 대형 카탈로그에서
   매 타건마다 `list` useMemo가 재계산되는 성능 이슈 후보. UX가 아니라 perf 축 감사 대상이라 이
   문서의 스코프(UX 패리티) 밖으로 보고 여기 기록만 남긴다.

---

## 9. 신규 등재 이슈 (backlog.yml)

아래 5건(+선택 1건)을 `docs/backlog/backlog.yml`에 `status: todo`로 등재했다. 상세 `scope`·
`done_when`·`notes`는 backlog.yml 본문 참조.

| id | 제목 | priority | 판정 |
|---|---|---|---|
| M-050 | 랜딩 2차 CTA가 웹과 달리 폴백 리포트(`/report`)로 빠짐 | medium | 🔴 user-blocking |
| M-051 | 모바일 탐색·상세 화면에 활동 이미지 렌더 없음 | medium | 🟡 연출·품질 |
| M-052 | 모바일 상세 화면에 위치 지도·산책로 폴리라인 없음 | medium | 🟡 연출·품질(사람 의견: 우선순위 재고 여지) |
| M-053 | 모바일 상세 화면에 마감 D-day·출처 미표시 | medium | 🟡 연출·품질 |
| M-054 | 모바일 탐색 화면에 로딩 스켈레톤 없음 | low | 🟡 연출·품질 |
| M-055 (선택) | 모바일 상세가 M-044 LLM 근거(`useWhyReasons`)를 소비하지 않음 | low | 🟡 연출·품질, GEMINI_API_KEY 미등록으로 종단 검증 불가 |

---

## 10. 재발 방지 방법 — "공유 로직으로 옮기기"만으로는 안 통한다

M-048의 원래 done_when 3번은 "한쪽만 고치고 넘어가는 것을 막을 방법(공유 로직은
`packages/core`로 등)"을 요구한다. 그런데 이번 조사에서 나온 가장 확실한 반증 사례가 바로
**공유 로직으로 옮겼는데도 안 먹힌 경우**다:

> `packages/core/src/view.ts`의 `deadlineLabel()`(193행)·`timeRangeLabel()`(180행)·
> `isWeekendOuting()`(243행)은 **이미 `packages/core`에 있다.** 순수 함수라 플랫폼 무관하고,
> 웹은 셋 다 쓴다(`opportunity-detail.tsx:26-29,124-126,172,329`). 그런데
> `apps/mobile` 전체에서 이 세 함수를 참조하는 코드는 **0건**이다(`grep -rn` 확인,
> 테스트 파일 포함 전무). 로직이 core에 있다는 사실 자체는 모바일이 그걸 실제로
> **불러다 쓰는지**와 아무 상관이 없다 — 함수가 거기 "존재"하는 것과 화면이 그걸
> "소비"하는 것은 별개의 사건이고, 후자를 강제하는 장치가 지금 파이프라인엔 없다.

같은 논리가 `useWhyReasons`(웹 전용 훅, M-055)에도 적용된다 — 근거 생성 로직의 핵심(
`buildWhyReasonsPrompt`, `scoreOpportunity`의 breakdown)은 이미 core에 있는데, 그걸 페이지에
연결하는 **훅**은 웹에만 있다. "로직을 core로 옮겨라"는 필요조건이지 충분조건이 아니다.

### 제안: 소비 여부를 커밋 단위에서 강제로 확인한다

숫자 커버리지 게이트를 새로 걸자는 게 아니다(`nightly-pipeline.md`가 이미 이런 종류의 게이트를
의도적으로 피한다 — "숫자를 채우는 게 목적이 되고 무의미한 테스트가 쌓인다"). 대신 **리뷰
체크리스트 한 줄 + 이 문서를 살아있는 산출물로 유지하는 규칙**을 제안한다.

1. **`frontend-impl.md`의 완료 정의(Definition of Done)에 다음 항목을 추가한다:**
   > "이번 커밋이 `apps/web`에서 `packages/core`의 새 export를 도입해 소비했다면, 같은 클러스터
   > 안에 `apps/mobile` 소비 계획(같은 밤 구현 또는 짝지어진 `M-NNN` 신규 등재)이 있는지 확인한다.
   > 없다면 이유를 커밋 메시지 또는 backlog notes에 남긴다(예: RN에 해당 UI 패턴이 없음 — 의도된
   > 차이)."
   이건 "core로 옮겨라"가 아니라 **"옮긴 뒤 모바일이 실제로 부르는지 확인해라"**를 강제한다 —
   지금 빠진 바로 그 단계다.

2. **`nightly-pipeline.md`의 reviewer 단계(6단계 순서의 5번)에 한 줄을 추가한다:**
   > "이번 클러스터가 `packages/core`에 새 export를 추가했는데 `apps/web`만 참조하고
   > `apps/mobile`에서 0건이면, 자동으로 낮은 priority의 `M-NNN`(`apps/mobile` 소비 검토)을
   > 백로그에 등재한다." — 이건 `grep -c "함수이름" apps/mobile`이 0인지 확인하는 한 줄짜리
   > 기계적 체크라 사람 판단을 대신하지 않으면서도, 이번처럼 "이미 core에 있는데 아무도
   > 안 불렀다"가 몇 주씩 조용히 방치되는 걸 막는다.

3. **이 문서(`docs/ux/web-mobile-parity.md`)를 일회성 감사가 아니라 살아있는 산출물로 못박는다.**
   웹 전용 UI 커밋(예: `opportunity-detail.tsx`, `explore-card.tsx` 등 이 문서의 "웹" 열에 인용된
   파일)이 변경되는 밤에는, architect가 계획을 확정하기 전에 이 문서에서 해당 화면의 표를 훑어
   "이 변경이 표의 어떤 행과 관련 있는가"를 확인하고, 관련 있으면 표를 갱신한다(새 간극이면
   추가, 해소했으면 🟢로 갱신). `nightly-pipeline.md` 0단계(백로그 게이트)에 이 확인을 한 줄
   추가하는 것으로 충분하다 — 매번 전체 화면을 새로 감사하라는 게 아니라, **건드린 파일이 이미
   표에 있으면 표를 같이 고치라**는 요구다.

4. **왜 "실측 grep 한 줄"을 제안하는가:** 이번 조사에서 실제로 쓴 방법이 이거다 —
   `grep -rn "deadlineLabel\|timeRangeLabel\|isWeekendOuting" apps/mobile`이 빈 결과를 내는 순간
   간극이 확정됐다. 사람의 판단(우선순위·의도된 차이 여부)은 여전히 필요하지만, "간극이
   존재하는가"라는 사실 확인 자체는 기계적으로 충분히 잡아낼 수 있다는 뜻이다. 이 문서의 재발
   방지책은 그 기계적 확인을 **한 번의 감사가 아니라 매 커밋의 습관**으로 만드는 데 있다.
