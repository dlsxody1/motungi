# 모퉁이 Corner

> 퇴근하고 뭐하지?
> 2030 직장인을 위한 하이퍼로컬 × 개인화 문화·여가 큐레이션.

위치(집·회사) + 60초 진단(3문항: 관심사·시간대·에너지)을 입력받아, 흩어진 동네 단위 활동
(문화·공연 · 운동·산책 · 먹거리·마켓 · 클래스 · 퇴근후 부업)을
규칙 기반 스코어링으로 **딱 1~3개**만 추천한다. 기획 피벗 반영(docs/PIVOT-afterwork.md).

## 스택 (무료 티어 우선)

| 레이어 | 선택 |
| --- | --- |
| 웹 | Next.js (App Router) · Vercel |
| 앱 | Expo (React Native) · expo-router |
| 공유 코드 | TypeScript 모노레포 · pnpm + Turborepo |
| 백엔드/Auth/DB | Supabase (Postgres + PostGIS + Auth) |
| 파이프라인 | Supabase Edge Function(`ingest`) + pg_cron(0007) → 공공데이터 적재 |

## 구조

```
motungi/
├─ apps/
│  ├─ web/              Next.js 웹 (진입점·SSR·공유 카드)
│  └─ mobile/           Expo 앱 (알림·저장 리텐션)
├─ packages/
│  ├─ core/             공용 도메인: 진단 스키마·스코어링·타입
│  └─ tokens/           디자인 토큰 (자리만 — 값 미정)
├─ supabase/            config.toml · migrations(0001~0007) · functions/ingest · seed
└─ .github/workflows/   ci (ingest.yml은 `if: false` 죽은 스캐폴드 — 실제 적재는 Supabase Edge Function + pg_cron)
```

웹·앱은 `@motungi/core`(진단·스코어링)와 `@motungi/tokens`를 공유한다.

## 시작하기

```bash
pnpm install

# 환경변수
cp .env.example .env   # Supabase 키 등 채우기

# 웹
pnpm dev:web           # http://localhost:3000

# 앱
pnpm dev:mobile        # Expo dev server

# 검증
pnpm typecheck
pnpm test
```

## Supabase (로컬)

`supabase/` 에 스키마·설정 준비됨. 로컬 실행은 Docker + Supabase CLI 필요:

```bash
# brew install supabase/tap/supabase
supabase start
supabase db reset      # migrations + seed 적용
```

## 상태

- [x] 모노레포 스캐폴딩 (pnpm + turbo)
- [x] 웹/앱 공용 패키지 (진단·스코어링 — cost/time 가중치·2앵커 거리)
- [x] Supabase 스키마 (opportunities · profiles · saved, RLS · geom 트리거 · cron, 0001~0007)
- [x] 데이터 소스 어댑터 (seoul-culture · culture-info · trail · sports-facility · seoul-jobs)
- [x] 위치 역지오코딩 프록시 (Naver Cloud Maps, `apps/web/src/app/api/geo/route.ts`)
- [x] 적재 Edge Function + pg_cron (seoul_culture · culture_info · trail 배선)
- [x] 디자인/UI (웹·앱 전 화면)
- [ ] 미배선 소스(sports_facility · seoul_jobs) 발급 응답으로 `Raw*` 확정 후 배선
- [ ] 목업 → Supabase select 읽기 전환

> 페르소나·비용/거리 추정치는 예시 더미이며 실데이터로 재보정 전제.
