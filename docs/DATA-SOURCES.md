# 데이터 소스 & 연동 워크플로우

> 모퉁이 Corner의 목업 → 실데이터 전환 계획.
> 현재 상태: UI(웹/앱), 스키마(`supabase/migrations/0001_init.sql`), 도메인 타입·스코어링 골격(`packages/core`) 완료.
> 남은 것: 아래 소스에서 데이터를 받아 `opportunities` 테이블을 채우는 파이프라인.

확정 기획 (2026-07-02, docs/PIVOT-afterwork.md):

- 컨셉 = **"퇴근하고 뭐하지?"** — 동네 문화·여가·활동 큐레이션 (일자리→피벗)
- 지역 = **서울/수도권 먼저**
- 위치 역지오코딩 → **Kakao Local** (실시간)
- 적재 → **Supabase Edge Function + Cron** (secret key·외부 키는 서버 시크릿)
- 모든 API **개인 자동승인 + 좌표 제공** 검증 완료 → 기존 haversine 거리 스코어링 즉시 작동

---

## 1. 필요한 API 목록

| # | 용도(category) | 소스(`SourceKind`) | API | 발급처 | 승인 | 좌표 |
|---|------|-----|-----|--------|------|------|
| 1 | 좌표→행정동 (위치) | — | **Kakao Local `coord2regioncode`** | developers.kakao.com | 즉시 | ○ |
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

### ☐ Kakao Local (위치)
1. https://developers.kakao.com → 로그인 → **내 애플리케이션 → 애플리케이션 추가**
2. 앱 생성 후 **REST API 키** 복사 → `KAKAO_REST_API_KEY`
3. **카카오 로그인/지도 활성화 불필요** — Local API는 REST 키만으로 호출 가능
4. (선택) 플랫폼 등록에 배포 도메인 추가
- 즉시 발급 · 무료 · 일 100,000 호출

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

### ☐ 온통청년 (청년정책)
1. https://www.youthcenter.go.kr → 오픈API 신청/문의
2. 발급받은 apiKey → `YOUTH_POLICY_API_KEY`
- 지역·연령 파라미터로 필터, 응답에 마감일·지원금액 포함

### ☐ Supabase (인프라 — 대부분 준비됨)
1. 프로젝트 대시보드 → Settings → API Keys (신규 키 체계)
2. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (클라 노출 OK — 이미 코드에서 사용)
3. **`SUPABASE_SECRET_KEY`** — 배치 적재 전용, **절대 클라이언트/NEXT_PUBLIC_ 금지**

### ⏸ 쿠팡파트너스 (보류)
- 사업자 등록·심사·정산 계정 필요. 초기엔 어드민 수동 입력으로 대체. API 붙일 시점에 별도 진행.

---

## 3. 데이터 흐름

```
[Kakao Local]  좌표 → 행정동(admCode, dongName)      ← 클라/서버 요청 시점
                          │
                          ▼
[서울시 일자리]    ─┐   일자리 카드 본체
[data.go.kr 상권]  ─┤   근거 맥락(summary 강화)
[온통청년 정책]    ─┼─► Edge Function 어댑터 ─► core Opportunity 정규화
[제휴(수동)]       ─┘        (Cron 주기 적재)         │
                                                      ▼
                                    Supabase  public.opportunities  (upsert)
                                                      │
                   publishable key로 읽기 (RLS: 공개 select) ─► 웹/앱 큐레이션
                                                      │
                                        packages/core scoring → 원픽 1~3개
```

- 각 어댑터의 책임: 외부 응답 → `Opportunity`(`packages/core/src/types.ts`)로 매핑 후 `upsert (source, external_id)`.
- 위치는 요청 시점에 Kakao로 행정동 산출 → 스코어링의 거리/지역 필터 입력.

---

## 4. 환경변수 (스키마)

**서버 전용** (Supabase Edge Function 시크릿 / `.env.local` — 클라 노출 금지):
```bash
KAKAO_REST_API_KEY=
SEOUL_OPENAPI_KEY=        # 서울시 일자리플러스센터 (개인 즉시 발급)
DATA_GO_KR_SERVICE_KEY=   # 소상공인 상권정보 (활용신청 승인 대기)
YOUTH_POLICY_API_KEY=     # 온통청년
SUPABASE_SECRET_KEY=
# COUPANG_ACCESS_KEY=   # 보류
# COUPANG_SECRET_KEY=   # 보류
```

> 발급 난이도: **즉시(개인)** — Kakao·서울시·온통청년·Supabase. **승인 대기** — 소상공인 상권(data.go.kr 활용신청). **불가(개인)** — 워크넷 목록/상세.

**클라이언트 공개 가능** (`apps/web/.env.local`, 이미 사용 중):
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

> Kakao 역지오코딩을 클라에서 직접 호출하면 REST 키가 노출된다 → **Edge Function/Route Handler로 프록시**하고 키는 서버에만 둔다.

---

## 5. 구현 워크플로우 (순서)

발급 대기(상권 API 승인)를 감안한 실행 순서.

1. **[선행] 발급** — Kakao·서울시·온통청년 즉시 발급 + Supabase secret key 확보. 상권 API만 활용신청(승인 대기).
2. **위치 계층** — Kakao 역지오코딩 프록시(Edge Function or Route Handler) → `{admCode, dongName, point}` 반환. `location/page.tsx`의 "현재 위치로 찾기" 연결.
3. **어댑터 골격** — ✅ `packages/core/src/adapters`에 `normalizeSeoulJob`/`normalizeYouthPolicy` 추가 완료(TDD). 발급 후 `Raw*`의 TODO 필드명만 실제 응답으로 확정.
4. **적재 Edge Function** — 서울시 → `seoul_jobs`, 온통청년 → `youth_policy` upsert(둘 다 승인 불필요, 먼저 착수). 상권은 승인 후 `commercial_area` 추가.
5. **Cron** — Supabase Scheduled Function으로 일 1회(예: 06:00 KST) 적재.
6. **읽기 전환** — 웹/앱의 `data/opportunities.ts` 목업을 Supabase select로 교체, `pickTop`에 실데이터 투입.
7. **스코어링 재보정** — `scoring.ts`의 `fit` 스텁을 진단↔카테고리 매핑 테이블로 대체(§실데이터 확인 후).
8. **신뢰 표기** — 각 카드 `sourceLabel`(출처·갱신일) 실제 값으로 채움(DESIGN §8 준수).

> 다음 착수점: **2번(Kakao 위치 프록시)** — 발급 즉시 가능하고 나머지 파이프의 입력이 됨.
