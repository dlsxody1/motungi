# 핸드오프 — 모퉁이 Corner (기획 피벗 이후)

> 최종 갱신: 2026-07-02. 이 문서 하나로 현재 상태·결정·남은 일을 이어받을 수 있게 한다.
> 관련 문서: 기획=`docs/PIVOT-afterwork.md` · 소스=`docs/DATA-SOURCES.md` · API=`docs/API-DESIGN.md`

---

## 0. 한 줄 요약

**모퉁이는 "퇴근하고 뭐하지?" — 서울/수도권 직장인에게 퇴근 후·주말 동네에서 할 만한 문화·여가·활동(+파트/단기 부업)을 60초 진단으로 원픽 큐레이션하는 앱.** 원래 "일자리·수익 중심" 기획에서 피벗했고, 코드 곳곳에 옛 기획 잔재(수익 카피·카테고리·메타데이터)가 남아 있어 전면 정리가 필요하다.

## 1. 왜 피벗했나 (맥락)

- 일자리 데이터 확보 실패: 워크넷 채용 목록/상세 API는 개인 이용 불가(민간 직업정보제공사업 신고 필요).
- 청년 지원금은 정부 사이트(온통청년·복지로)와 중복 → 차별화 축 아님.
- 모퉁이다움 = **동네**. "퇴근하고 뭐하지?"는 정부 포털이 못 답하는 질문.
- 문화·체육 공공데이터는 개인 즉시(자동승인) + **좌표 제공** → 이미 만든 거리 스코어링이 실제로 작동.

## 2. 현재 상태 (2026-07-02)

### 완료
- UI 레이아웃(웹 Next.js + 앱 Expo), 디자인 시스템(`@motungi/tokens`), 공용 프리미티브.
- DB 스키마 골격 `supabase/migrations/0001_init.sql`.
- 도메인 골격 `packages/core` (types·diagnosis·scoring, 어댑터 스캐폴드 + 테스트 21개 통과).
- **API 발급 완료**: data.go.kr 공용키(상권·두루누비·문화정보) + 서울 일자리(OA-13341) + Naver Cloud Maps(위치 역지오코딩).
- **Supabase 신규 키 체계 적용**: publishable/secret key로 웹·앱 클라이언트 코드 갱신 완료.
- **위치 역지오코딩 프록시 완료**: Naver Cloud Maps Reverse Geocoding 서버 프록시 `apps/web/src/app/api/geo/route.ts`(좌표→행정동). Client Secret은 서버 전용.
- **적재 Edge Function + pg_cron 완료**: `supabase/functions/ingest` + 마이그레이션 `0007_cron_ingest_daily.sql`(일 1회). 현재 `seoul_culture`·`culture_info`·`trail` 배선.
- **어댑터 구현 완료**: `packages/core/src/adapters`에 `seoul-culture`·`culture-info`·`trail`·`sports-facility`·`seoul-jobs`(TDD).

### 옛 기획 잔재 정리 — 완료 (2026-07-03)
§3 인벤토리 전면 처리 완료:
- **core**: `OpportunityCategory`(culture/active/side_job/class/food/market)·`SourceKind`(6종)·`estimatedIncomeKrw→costKrw`·`timeWindow`·`UserAnchors` 신설. `diagnosis.ts` jobGroup/incomeGoal 제거→`interests` 신설(4→3문항). `scoring.ts` income→cost+time 가중치, fit=interests↔category 구현, 2앵커 min 거리. youth-policy 어댑터 제거, seoul-jobs 존치(side_job).
- **DB**: `0003_pivot_categories.sql`(enum 확장, estimated_income_krw→cost_krw, time_*_hour, profiles work 앵커), `seed.sql` 문화·여가로 교체.
- **UI**: web/mobile 목업 동기 교체, 전 화면(진단·리포트·상세·탐색·홈·랜딩·저장·쉘) 카피 전환. 모바일 온보딩 오타 수정. 메타데이터·PRODUCT·README 갱신.
- **검증**: core 테스트 18개 통과, web/mobile typecheck 통과. (§2의 "테스트 21개"는 실제 18개였음.)

### 진행 중 / 미완
- `sports_facility`·`seoul_jobs` 어댑터 ingest 배선(매퍼는 있으나 발급 응답으로 `Raw*` 확정 후 게이팅 해제).
- 목업→Supabase select 읽기 전환(`data/opportunities.ts` → DB).
- 주소만 있는 소스(일자리)의 주소→좌표 지오코딩.

## 3. 바꿔야 할 것 인벤토리 (옛 기획 잔재)

> ✅ **해소 완료 (2026-07-15).** 아래 표는 피벗 당시의 히스토리 기록이다. 이후 재스캔 결과
> 사용자 노출 카피·도메인 값·메타데이터는 모두 새 컨셉(문화·여가)으로 이관됐다.
> 남아 있던 마지막 잔재는 모바일 StyleSheet 키 이름(`income*`)뿐이었고 2026-07-15에
> `cost*`로 리네임(웹과 통일, `apps/mobile/{app/(tabs)/report.tsx,app/opportunity.tsx,app/(tabs)/explore.tsx,app/(tabs)/saved.tsx}`)했다.
> `side_job`/"부업" 라벨은 §4에서 유지 카테고리이므로 잔재 아님. mobile typecheck 통과.
>
> 원문(참고용):
> 전수 스캔 결과. 옛 기획("수익·부업·지원금 중심")이 코드/카피/메타에 박혀 있음.
> 심각도: 🔴 CRITICAL(기획 코어) · 🟠 HIGH(UI 노출) · 🟡 MEDIUM(문서·메타).

### 3-1. 도메인 값 (packages/core) — 🔴 여기부터

| 위치 | 현재 | 바꿀 방향 |
|---|---|---|
| `types.ts:6-12` `OpportunityCategory` | side_job / subsidy / gig_deal / class_talent / space_used | → `culture` `active` `side_job` `class` `food` `market` (§4) |
| `types.ts:21-25` `SourceKind` | seoul_jobs / youth_policy / commercial_area / affiliate_feed | → seoul_culture / culture_info / sports_facility / trail / seoul_jobs / commercial_area |
| `types.ts:48-50` `estimatedIncomeKrw` | "예상 수익(월)". 여가엔 **지출**이지 수익 아님 | → `costKrw`(0=무료) 로 의미 전환. 부업만 income 성격 |
| `diagnosis.ts:19-27` `IncomeGoal` | "목표 월 수익" under_30~over_100 | → **예산대**(free/cheap/any) 로 교체 |
| `diagnosis.ts` `jobGroup` | 본업 직군 | → 관심 카테고리 선호로 교체 검토 |
| `scoring.ts:10-35` | `income` 가중치 20% + `INCOME_GOAL_TARGET_KRW` | → `cost`(무료 가점) + `time`(신규) 로 재설계. **2앵커 거리**(§4) |

> ⚠️ `incomeGoal`/`income`은 scoring.ts 전체에 녹아있음 — 제거 시 스코어링 재작성 동반.

### 3-2. 목업 데이터 — 🟠 (모든 화면이 참조, 한 번에 교체)

| 위치 | 현재 | 비고 |
|---|---|---|
| `apps/web/src/data/opportunities.ts:25-52` `ONE_PICK` | "동네 카페 바리스타 파트", `incomeLabel:"+48만 원"`, `incomeNote:"에어팟 프로 2개"` | culture/active 예시로 재작성 |
| `…:127-133` `CATEGORY_LABELS` | 부업/지원금/긱·딜/클래스·재능/공간·중고 | 새 카테고리 라벨로 |
| `apps/mobile/data/opportunities.ts:25-52` | 웹과 동일(부업·수익) | 웹과 동시 교체 |

### 3-3. UX 라이팅 (화면별) — 🔴🟠

**진단** (🔴 코어):
- `apps/web/src/app/diagnosis/page.tsx:38` — Q2 "**부업에 쓸 수 있는** 시간은?" → "퇴근 후·주말 언제?"
- `…:61-71` — Q4 "**얼마를 벌고 싶으세요?**" (under_30~over_100, "제대로 사이드잡") → 예산/관심 문항
- `apps/mobile/app/diagnosis.tsx:26,47-56` — 동일 (Q4 "얼마를 벌고 싶으세요?")

**리포트** (🟠):
- `apps/web/src/app/report/page.tsx:67,196` — "**예상 월 수입**" 박스(대형 강조) → 제거/재설계
- `…:269` — "합산 잠재 수입", `…:109-110` — "이거 다 하면 1년에 얼마? / 정책+부업+딜 합산 시뮬"
- `apps/mobile/app/(tabs)/report.tsx:47-53,91-92` — 동일

**기회 상세** (🟠):
- `apps/web/src/app/opportunity/page.tsx:19-23` WHY — "주말 오전 단타임 **근무**", "이력서 없이 **지원**"
- `…:56-64` — "예상 월 수입 / 시급 12,000원 × 주 8시간 × 4.3주" 계산식
- `apps/mobile/app/opportunity.tsx:34-41` — 동일

**탐색** (🟠):
- `apps/web/src/app/explore/page.tsx:18-27` — FILTERS `["전체","부업","지원금","긱·딜","클래스·재능"]`, CATEGORIES "동네 기반 부업" 등
- `apps/mobile/app/(tabs)/explore.tsx:9` — 동일 FILTERS

**홈/랜딩** (🟡 중립적이나 "기회" 톤):
- `apps/web/src/app/page.tsx:28-49` — "기회가 있다", "잡을 수 있는 기회"
- `apps/mobile/app/index.tsx:29-41` — 동일 + TEASERS "인근샵 60초면"
- `apps/web/src/components/web-landing.tsx:20,40-45,81,109-129` — "수백 개 **공고**", CATEGORIES 부업/지원금, "부업·지원금·긱을 60초 만에", "동네 부업" 히어로, "예상 월 수입", "청년 월세 지원"

**위치** (✅ 양호): `location/page.tsx:33-38` 중립적 — 수정 불필요.

### 3-4. 메타데이터 / SEO — 🟡

| 위치 | 현재 | 바꿀 방향 |
|---|---|---|
| `apps/web/src/app/layout.tsx:7` metadata.description | "내 동네 모퉁이에, 기회가 있다 — 하이퍼로컬 **기회 내비게이션**" | "퇴근 후·주말 동네 문화·여가 큐레이션" |
| `package.json:5` description | "하이퍼로컬 × 개인화 **기회 큐레이션**" | 새 컨셉으로 |
| `apps/mobile/app.json` | name/slug 중립적 ✅ | description 필드 없음 — 필요시 추가 |

### 3-5. 문서 — 🟡 (코드 확정 후 마지막에)

| 위치 | 현재 | 비고 |
|---|---|---|
| `PRODUCT.md:9,11,15` | "부업·지원금·긱·딜·클래스·공간", "기회 큐레이션"(반복) | job-to-be-done "오늘 뭘 할지"는 유지 가능 |
| `README.md:4-7` | "기회 큐레이션", 옛 카테고리 나열 | 소개 문구 피벗 반영 |
| `DESIGN.md` | 시각 시스템 전담, 옛 기획 언어 없음 ✅ | 수정 불필요 |

## 4. 새 도메인 스펙 (목표 상태)

### 카테고리 (`OpportunityCategory` 재정의)
`culture`(공연·전시) · `active`(운동·산책) · `side_job`(퇴근후 파트/단기) — 주력.
`class` · `food` · `market` — 보조.

### 소스 (`SourceKind`)
`seoul_culture` · `culture_info` · `sports_facility` · `trail` · `seoul_jobs` · `commercial_area`.

### 진단 (`DiagnosisAnswers`) — 여가 맥락으로 재해석
- `timeSlot`(평일저녁/주말/유연) — 유지.
- `energy`(방전/보통/활동형) — 유지, 활동 강도로.
- `jobGroup` → 관심사/카테고리 선호로 교체 검토.
- `incomeGoal` → **예산대(무료/저렴/상관없음)**로 의미 교체.

### 스코어링 (2축 = 큐레이션 뼈대)
- 공간: `Location` → `UserAnchors{home, work}`, 거리는 두 앵커 중 min.
- 시간: 퇴근후 18~22시 겹침 가점 + `timeSlot` 결합.
- 가중치: fit · distance(2앵커) · time(신규) · difficulty · cost.

## 5. 환경변수 / 시크릿

`.env.example` 참고. 요지:
- data.go.kr 3종 = 공용 키 `DATA_GO_KR_SERVICE_KEY`(Decoding, 서버 전용).
- 서울 일자리 = `SEOUL_OPENAPI_KEY`(서버 전용).
- Naver Cloud Maps(위치 역지오코딩) = `NAVER_MAP_CLIENT_ID` + `NAVER_MAP_Client_SECRET`(서버 전용, 발급 완료).
- Supabase = `NEXT_PUBLIC_/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(공개) + `SUPABASE_SECRET_KEY`(서버 전용).
- **원칙**: 외부 API 키·secret은 Edge Function 시크릿으로만. 클라는 publishable 읽기만.

## 6. 다음 작업 순서 (권장)

**정리 순서 원칙**: 도메인 값(타입) → 목업 데이터 → UX 카피 → 메타데이터 → 문서.
아래로 갈수록 위 계층에 의존하므로 이 순서를 지켜야 일관성이 안 깨진다. 카테고리 라벨·진단 문항·필터는 서로 연결돼 있어 한 곳 고치면 전체 재검증 필요.

1. **core 도메인 재정의** (🔴) — `OpportunityCategory`·`SourceKind`·`IncomeGoal→예산`·`estimatedIncomeKrw→costKrw`. 타입이 먼저 서야 나머지가 컴파일로 강제됨.
2. **스코어링 전환** — `income`→`cost`+`time` 가중치, `Location`→`UserAnchors{home,work}`(2앵커 min), 시간축 가점. TDD로 기존 21개 테스트 갱신.
3. **스키마 마이그레이션 `0002`** — `source_kind`/`opportunity_category` enum에 새 값 추가.
4. **목업 데이터 교체** (🟠) — web/mobile `opportunities.ts` 동시 (culture/active 예시).
5. **UX 카피 교체** (🟠) — 진단 Q2/Q4 → 리포트 "월 수입" → 상세 "근무/지원" → 탐색 필터 → 랜딩.
6. **메타데이터·문서** (🟡) — layout metadata, package.json, PRODUCT/README.
7. **인프라 잇기** — ✅ Naver 위치 프록시 · ✅ 적재 Edge Function + pg_cron(seoul_culture·culture_info·trail) 완료. 남은 것: 발급 응답으로 미배선 어댑터(`sports_facility`·`seoul_jobs`) `Raw*` 확정·배선 → 목업→Supabase select 전환.

## 7. 알아둘 함정

- **Supabase 신규 키 체계**: anon/service_role(레거시)이 아니라 **publishable/secret**를 쓴다. 코드(`apps/*/lib/supabase.ts`)·`.env`·문서 모두 이미 신규 체계로 통일됨 — 레거시 명칭으로 되돌리지 말 것.
- **`.env`는 gitignore됨**(실제 키 로컬 전용). 커밋되는 건 `.env.example`뿐.
- **data.go.kr 키 1개 공용**: 상권·두루누비·문화정보가 같은 `DATA_GO_KR_SERVICE_KEY`. Decoding 값을 넣고 코드에서 `encodeURIComponent`.
- **외부 키·secret은 서버 전용**: `NEXT_PUBLIC_`/`EXPO_PUBLIC_` 절대 금지. Naver Reverse Geocoding도 서버 프록시(`api/geo/route.ts`) 경유해 Client Secret을 감춘다. (Kakao는 소셜 로그인 전용 — Supabase Auth Providers에 등록, `signInWithOAuth({provider:"kakao"})`만 호출.)
- **어댑터 `Raw*` 필드명은 추정값 + TODO**: 발급 응답 1건 받아 확정해야 실동작. 필드명만 갈아끼우면 되도록 계약은 고정돼 있음.
