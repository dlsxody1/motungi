# 데이터 소스 & 연동 워크플로우

> 모퉁이 Corner의 목업 → 실데이터 전환 계획.
> 현재 상태: UI(웹/앱), 스키마(마이그레이션 0001~0007), 도메인 타입·스코어링·어댑터 골격(`packages/core`), 위치 역지오코딩 프록시(`apps/web/src/app/api/geo/route.ts`), 적재 Edge Function(`supabase/functions/ingest`) + pg_cron(0007) 완료.
> 남은 것: sports_facility·seoul_jobs 발급 응답으로 `Raw*` 필드 확정 후 배선, 목업→Supabase select 읽기 전환.

확정 기획 (2026-07-02, docs/PIVOT-afterwork.md):

- 컨셉 = **"퇴근하고 뭐하지?"** — 동네 문화·여가·활동 큐레이션 (일자리→피벗)
- 지역 = **서울/수도권 먼저**
- 위치 역지오코딩 → **Naver Cloud Maps Reverse Geocoding** (서버 프록시 경유)
- 적재 → **Supabase Edge Function + pg_cron** (secret key·외부 키는 서버 시크릿)
- 모든 API **개인 자동승인 + 좌표 제공** 검증 완료 → 기존 haversine 거리 스코어링 즉시 작동

---

## 1. 필요한 API 목록

| # | 용도(category) | 소스(`SourceKind`) | API | 발급처 | 승인 | 좌표 |
|---|------|-----|-----|--------|------|------|
| 1 | 좌표→행정동 (위치) | — | **Naver Cloud Maps Reverse Geocoding** | console.ncloud.com | 즉시 | ○ |
| 2 | **공연·전시·문화행사** `culture` | `seoul_culture` | **서울시 문화행사 정보** (OA-15486) ★1순위 | data.seoul.go.kr | 즉시 | ○ |
| 3 | 공연·전시(전국) `culture` | `culture_info` | **한눈에보는문화정보** (15138937) | data.go.kr | 자동승인 | ○ |
| 4 | 운동·산책·시설 `active` | `sports_facility` | **공공체육시설 상세** (15107764) | data.go.kr | 자동승인 | ○ |
| 5 | 걷기길·둘레길 `active` | `trail` | **두루누비/등산로** (15101974·15057232) | data.go.kr | 자동승인 | ○ (GPX) |
| 6 | 밥집·카페(보조) `food` | `commercial_area` | 소상공인 상가(상권)정보 | data.go.kr | 승인대기 | ○ |
| — | DB/적재 인프라 | — | Supabase (이미 사용 중) | supabase.com | — | — |

> **1순위 = 서울시 문화행사(OA-15486)**. 응답 필드가 `Opportunity`와 거의 1:1:
> `분류→category` · `공연/행사명→title` · `장소·위/경도→location` · `시작/종료일→기간·deadline` · `유무료·이용요금→estimatedIncomeKrw(0=무료)` · `홈페이지→ctaUrl` · `자치구→dongName`. **매일 1회 갱신 · 공공누리 1유형(상업 이용 가능)**.

> **class(원데이 클래스)**는 별도 공공 API가 약함 → 초기엔 문화행사 중 체험/교육 분류로 커버하고, 유료 클래스는 사용자 제보·제휴로 축적(광고 지점).

---

## 2. 발급 체크리스트

각 항목을 발급받아 아래 환경변수(§4)에 채운다. **☐ = 아직, ✅ = 완료**로 관리.

### ✅ Naver Cloud Maps Reverse Geocoding (위치)
1. https://console.ncloud.com → **AI·NAVER API → Application 등록** → Maps(Reverse Geocoding) 이용 설정
2. 발급된 **Client ID / Client Secret** → `NAVER_MAP_CLIENT_ID` / `NAVER_MAP_Client_SECRET` (서버 전용)
3. 요청 헤더 `x-ncp-apigw-api-key-id` / `x-ncp-apigw-api-key`로 호출
4. ✅ **서버 프록시 구현 완료** — `apps/web/src/app/api/geo/route.ts`(Next.js Route Handler). 모바일/웹 클라는 좌표만 넘기고 이 프록시(`EXPO_PUBLIC_WEB_ORIGIN`)를 경유
- 즉시 발급 · 무료 티어 제공
- 참고: **Kakao는 소셜 로그인 전용**(Supabase Auth 등록, `signInWithOAuth({provider:"kakao"})`) — 위치/역지오코딩에는 사용하지 않는다.

### ☐ 서울시 일자리플러스센터 채용정보 (서울 열린데이터광장)
1. https://data.seoul.go.kr → **회원가입 → 마이페이지 → 인증키 신청** (개인 즉시 발급, 무료)
2. 발급 인증키 → `SEOUL_OPENAPI_KEY`
3. 데이터셋: OA-13341 (일자리플러스센터 채용정보), 공공누리 1유형(출처표기 시 상업 이용 가능)
4. 필터: 근무지역·직종·임금 등 / 응답: 회사명·급여·근무지역·주소·채용URL·마감일·고용형태
   → `Opportunity`의 `location`/`ctaUrl`/`deadline`/`estimatedIncomeKrw`로 매핑 (어댑터 `normalizeSeoulJob`)
- ✅ **개인 즉시 발급** (워크넷과 달리 승인 대기·사업자 불필요)
- 어댑터가 **고용형태=파트/단기/시간제**만 카드로 채택(풀타임 제외)
- ⚠️ 정확한 응답 필드명은 발급 후 실제 응답 1건으로 확정 → `RawSeoulJob`의 TODO 필드명 교체

### ☐ 소상공인 상가정보 (data.go.kr)
1. https://www.data.go.kr 회원가입 → "소상공인시장진흥공단_상가(상권)정보" 검색
2. **활용신청** → 승인 대기(영업일 1~2일) → 승인 후 **일반 인증키(Encoding/Decoding)** 발급
3. Decoding 키를 `DATA_GO_KR_SERVICE_KEY`에 저장
- ⚠️ 승인 대기 있음 — **가장 먼저 신청**
- 일 트래픽 제한(신청 시 상향 가능)

> **온통청년(youth_policy) 소스는 제거됨.** 청년 지원금은 정부 포털(온통청년·복지로)과 중복이라 차별화 축이 아니라고 판단해 피벗 과정에서 도메인·어댑터·env에서 모두 뺐다. 현재 `SourceKind`는 `seoul_culture · culture_info · sports_facility · trail · seoul_jobs · commercial_area` 6종뿐이며 `YOUTH_POLICY_API_KEY`/`normalizeYouthPolicy`는 코드에 존재하지 않는다.

### ☐ Supabase (인프라 — 대부분 준비됨)
1. 프로젝트 대시보드 → Settings → API Keys (신규 키 체계)
2. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (클라 노출 OK — 이미 코드에서 사용)
3. **`SUPABASE_SECRET_KEY`** — 배치 적재 전용, **절대 클라이언트/NEXT_PUBLIC_ 금지**

### ⏸ 쿠팡파트너스 (보류)
- 사업자 등록·심사·정산 계정 필요. 초기엔 어드민 수동 입력으로 대체. API 붙일 시점에 별도 진행.

---

## 3. 데이터 흐름

```
[Naver Reverse Geo]  좌표 → 행정동(admCode, dongName)  ← 클라/서버 요청 시점 (서버 프록시)
                          │
                          ▼
[서울시 문화행사]  ─┐   문화 카드 본체
[문화정보(전국)]   ─┤   여가 카드
[두루누비 걷기길]  ─┼─► Edge Function 어댑터 ─► core Opportunity 정규화
[data.go.kr 상권]  ─┘        (pg_cron 주기 적재)         │
                                                      ▼
                                    Supabase  public.opportunities  (upsert)
                                                      │
                   publishable key로 읽기 (RLS: 공개 select) ─► 웹/앱 큐레이션
                                                      │
                                        packages/core scoring → 원픽 1~3개
```

- 각 어댑터의 책임: 외부 응답 → `Opportunity`(`packages/core/src/types.ts`)로 매핑 후 `upsert (source, external_id)`.
- 위치는 요청 시점에 Naver Reverse Geocoding 서버 프록시로 행정동 산출 → 스코어링의 거리/지역 필터 입력.

---

## 4. 환경변수 (스키마)

**서버 전용** (Supabase Edge Function 시크릿 / `.env.local` — 클라 노출 금지):
```bash
NAVER_MAP_CLIENT_ID=      # Naver Cloud Maps Reverse Geocoding
NAVER_MAP_Client_SECRET=  # Naver Cloud Maps Reverse Geocoding
SEOUL_OPENAPI_KEY=        # 서울시 문화행사·일자리플러스센터 (개인 즉시 발급)
DATA_GO_KR_SERVICE_KEY=   # 문화정보·두루누비·체육시설·소상공인 상권정보 (일부 활용신청 승인 대기)
SUPABASE_SECRET_KEY=
# COUPANG_ACCESS_KEY=   # 보류
# COUPANG_SECRET_KEY=   # 보류
```

> 발급 난이도: **즉시(개인)** — Naver Cloud Maps·서울시·Supabase. **승인 대기** — 소상공인 상권(data.go.kr 활용신청). **불가(개인)** — 워크넷 목록/상세.

**클라이언트 공개 가능** (`apps/web/.env.local`, 이미 사용 중):
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

> Naver Reverse Geocoding을 클라에서 직접 호출하면 Client Secret이 노출된다 → **Route Handler로 프록시**(`apps/web/src/app/api/geo/route.ts`)하고 키는 서버에만 둔다.

---

## 5. 구현 워크플로우 (순서)

발급 대기(상권 API 승인)를 감안한 실행 순서.

1. **[선행] 발급** — ✅ 서울시·Naver Cloud Maps 즉시 발급 + Supabase secret key 확보. 상권 API만 활용신청(승인 대기).
2. **위치 계층** — ✅ Naver Reverse Geocoding 프록시(`apps/web/src/app/api/geo/route.ts`) → `{admCode, dongName, point}` 반환. `location/page.tsx`의 "현재 위치로 찾기" 연결.
3. **어댑터 골격** — ✅ `packages/core/src/adapters`에 `seoul-culture`/`culture-info`/`trail`/`sports-facility`/`seoul-jobs` 구현 완료(TDD). 발급 대기 소스는 `Raw*`의 TODO 필드명만 실제 응답으로 확정.
4. **적재 Edge Function** — ✅ `supabase/functions/ingest` 구현. 현재 `seoul_culture`·`culture_info`·`trail` 배선. `sports_facility`·`seoul_jobs`는 매퍼는 있으나 `Raw*` 미확정(발급 대기)이라 미배선(게이팅). 상권은 승인 후 `commercial_area` 추가.
5. **Cron** — ✅ pg_cron으로 일 1회 적재(마이그레이션 `0007_cron_ingest_daily.sql`).
6. **읽기 전환** — 웹/앱의 `data/opportunities.ts` 목업을 Supabase select로 교체, `pickTop`에 실데이터 투입.
7. **스코어링 재보정** — `scoring.ts`의 `fit` 스텁을 진단↔카테고리 매핑 테이블로 대체(§실데이터 확인 후).
8. **신뢰 표기** — 각 카드 `sourceLabel`(출처·갱신일) 실제 값으로 채움(DESIGN §8 준수).

> 다음 착수점: **6번(목업→Supabase select 읽기 전환)** — 적재·위치 프록시는 완료됐고, 발급 대기 소스(sports_facility·seoul_jobs) 배선과 읽기 전환이 남았다.
