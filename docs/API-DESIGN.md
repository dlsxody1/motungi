# API 설계 — 데이터 적재 파이프라인

> 기획: "퇴근하고 뭐하지?" (docs/PIVOT-afterwork.md) · 소스 목록: (docs/DATA-SOURCES.md)
> 이 문서: 발급 완료된 API들을 **어떻게 호출하고 `Opportunity`로 정규화해 적재하는가**.
> 상태(2026-07-02): data.go.kr 3종 + 서울 일자리 발급 완료. Kakao·Supabase 미발급.

---

## 1. 환경변수 (.env)

| 변수 | 소스 | 노출 | 비고 |
|---|---|---|---|
| `DATA_GO_KR_SERVICE_KEY` | data.go.kr 공용(상권·두루누비·문화정보) | **서버 전용** | Decoding 키. 코드에서 `encodeURIComponent` |
| `SEOUL_OPENAPI_KEY` | 서울 열린데이터광장(일자리 OA-13341) | **서버 전용** | URL 경로에 삽입 |
| `KAKAO_REST_API_KEY` | Kakao Local(위치) | **서버 전용** | 역지오코딩 프록시 |
| `SUPABASE_SECRET_KEY` | Supabase | **서버 전용** | 배치 upsert |
| `NEXT_PUBLIC_SUPABASE_*` / `EXPO_PUBLIC_*` | Supabase | 공개 | 읽기(publishable) |

> **원칙**: 외부 API 키·secret key는 전부 **Edge Function 시크릿**으로만 둔다. `NEXT_PUBLIC_`/`EXPO_PUBLIC_` 접두어 절대 금지. 클라이언트는 Supabase publishable 읽기만.

---

## 2. 소스별 엔드포인트 & 호출

### 2-1. 서울시 문화행사 (culture) — 1순위
```
GET http://openapi.seoul.go.kr:8088/{SEOUL_OPENAPI_KEY}/json/culturalEventInfo/{START}/{END}/
```
- START/END: 페이지네이션(1-base, 최대 1000/req). 전체는 `list_total_count` 보고 순회.
- 응답: `분류 CODENAME` · `공연/행사명 TITLE` · `장소 PLACE` · `자치구 GUNAME` · `위경도 LOT/LAT` · `시작일 STRTDATE` · `종료일 END_DATE` · `유무료 IS_FREE` · `이용요금 USE_FEE` · `홈페이지 ORG_LINK` · `대표이미지 MAIN_IMG` · `행사시간 USE_TRGT/PLAYTIME`.
- ⚠️ 실제 서비스명(`culturalEventInfo`)·필드명은 발급 응답 1건으로 확정.

### 2-2. 서울시 일자리플러스센터 (side_job) — OA-13341
```
GET http://openapi.seoul.go.kr:8088/{SEOUL_OPENAPI_KEY}/json/GetJobInfo/{START}/{END}/
# 고용형태 필터(경로 파라미터): 계약직(시간제) = J01103
GET http://openapi.seoul.go.kr:8088/{SEOUL_OPENAPI_KEY}/json/GetJobInfo/{START}/{END}/J01103/
```
- 응답: `구인신청번호 JO_REQST_NO` · `구인등록번호 JO_REGIST_NO` · `기업명 CMPNY_NM` · `모집직종 JOBCODE_NM` · `고용형태 EMPLYM_STLE_CMMN_NM` · `근무예정지주소 WORK_PARAR_BASS_ADRES_CN` · `임금형태 HOPE_WAGE` · `접수마감 RCEPT_CLOS` · `상세URL 상세 링크` · `등록일 REG_DE`.
- **퇴근후 필터**: 어댑터가 고용형태=파트/시간제/단기만 채택(정규직 제외). 코드 `J01103`(계약직 시간제) 우선.
- ⚠️ 필드명은 명세서다운로드/응답으로 확정. XML/JSON 선택 가능(`/json/` 경로).

### 2-3. 한눈에보는문화정보 (culture, 전국) — data.go.kr
```
GET https://apis.data.go.kr/B553457/cultureinfo/{operation}?serviceKey={ENCODED}&numOfRows=&pageNo=&...
```
- serviceKey는 `encodeURIComponent(DATA_GO_KR_SERVICE_KEY)`.
- 응답: 공연/전시 목록 + 장소·좌표·기간·요금·썸네일·링크(XML).
- 서울 문화행사와 **중복 가능** → 적재 시 title+장소+기간 기준 dedup.

### 2-4. 두루누비 걷기길 (active) — data.go.kr
```
GET https://apis.data.go.kr/B551011/Durunubi/courseList?serviceKey={ENCODED}&...   # 코스 목록
GET https://apis.data.go.kr/B551011/Durunubi/routeList?serviceKey={ENCODED}&...    # 길(GPX) 목록
```
- 좌표는 GPX. 서울/수도권 코스만 필터해 `active` 카드로.

### 2-5. 소상공인 상권정보 (food, 보조) — data.go.kr
```
GET https://apis.data.go.kr/B553077/api/open/sdsc2/{operation}?serviceKey={ENCODED}&...
```
- 반경/업종(카페·음식) 필터로 `food` 후보 + `summary` 근거 맥락.

### 2-6. Kakao Local (위치) — 미발급
```
GET https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x={lng}&y={lat}
Header: Authorization: KakaoAK {KAKAO_REST_API_KEY}
```
- 요청 시점에 좌표→행정동(admCode/dongName). 주소만 있는 소스(일자리)는 좌표화에도 사용.

---

## 3. 정규화 계약 (→ core `Opportunity`)

각 소스 어댑터는 `packages/core/src/adapters`의 순수 함수. 공통 매핑:

| Opportunity 필드 | 문화행사 | 일자리 | 두루누비 |
|---|---|---|---|
| `title` | TITLE | 기업명+직종 | 코스명 |
| `category` | `culture` | `side_job`(파트/단기만) | `active` |
| `location.point` | LAT/LOT | 주소→Kakao 지오코딩 | GPX 시작점 |
| `location.dongName` | GUNAME | 주소 파싱 | 지역 |
| `estimatedIncomeKrw` | 0(무료)/USE_FEE | 임금 파싱 | — |
| `deadline` | END_DATE | 접수마감 | — |
| `ctaUrl` | ORG_LINK | 상세URL | 두루누비 링크 |
| `sourceLabel` | "서울시 문화행사" | "서울시 일자리플러스센터" | "두루누비" |
| (시간 메타) | 행사시간 → 시간축 가점 | 근무시간대 | — |

---

## 4. 적재 (Supabase Edge Function + Cron)

```
functions/ingest/index.ts
  ├─ fetchSeoulCulture()  → normalizeCulture()   → upsert
  ├─ fetchSeoulJobs(J01103)→ normalizeSeoulJob()  → geocode(Kakao) → upsert
  ├─ fetchCultureInfo()   → normalizeCultureInfo()→ dedup → upsert
  ├─ fetchDurunubi()      → normalizeTrail()      → upsert
  └─ fetchCommercial()    → (food 보조)           → upsert
```
- upsert 키: `opportunities (source, external_id)` unique (스키마 0001).
- Cron: 일 1회 06:00 KST (문화행사 매일 1회 갱신 주기에 맞춤).
- 지오코딩은 일자리처럼 좌표 없고 주소만 있는 소스에만(호출량 절약).
- 실패 격리: 소스별 try/catch — 한 소스 실패가 전체 적재를 막지 않게.

---

## 5. 스키마 반영 (마이그레이션 필요)

`source_kind` enum에 추가: `seoul_culture`, `culture_info`, `sports_facility`, `trail`, `seoul_jobs`.
`opportunity_category`에 추가: `culture`, `active` (기존 side_job/subsidy 등과 병존, 불필요 값 정리).
→ 다음 작업: `0002_pivot_source_category.sql`.

---

## 6. 다음 단계

1. Supabase URL/키 + Kakao REST 키 발급 → .env 채움.
2. 발급 응답 1건씩 받아 각 어댑터 `Raw*` 필드명 확정.
3. core 타입/스코어링 전환(2앵커·시간축) — docs/PIVOT-afterwork.md.
4. Edge Function 작성 + Cron.
5. 웹/앱 목업 → Supabase select 전환.
