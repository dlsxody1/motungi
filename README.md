# 모퉁이 Corner

> 내 동네 모퉁이에, 기회가 있다.
> 2030 직장인을 위한 하이퍼로컬 × 개인화 기회 큐레이션.

위치 + 60초 진단(4문항)을 입력받아, 흩어진 동네 단위 기회(부업·지원금·긱·딜·클래스·공간)를
규칙 기반 스코어링으로 **딱 1~3개**만 추천한다. 기획서 v1.0 기준 스캐폴딩.

## 스택 (무료 티어 우선, §9)

| 레이어 | 선택 |
| --- | --- |
| 웹 | Next.js (App Router) · Vercel |
| 앱 | Expo (React Native) · expo-router |
| 공유 코드 | TypeScript 모노레포 · pnpm + Turborepo |
| 백엔드/Auth/DB | Supabase (Postgres + PostGIS + Auth) |
| 파이프라인 | GitHub Actions 크론 → 공공데이터 적재 |

## 구조

```
motungi/
├─ apps/
│  ├─ web/              Next.js 웹 (진입점·SSR·공유 카드)
│  └─ mobile/           Expo 앱 (알림·저장 리텐션)
├─ packages/
│  ├─ core/             공용 도메인: 진단 스키마·스코어링·타입
│  └─ tokens/           디자인 토큰 (자리만 — 값 미정)
├─ supabase/            config.toml · migrations · seed
└─ .github/workflows/   ci · 데이터 적재(cron, 미활성)
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
- [x] 웹/앱 공용 패키지 (진단·스코어링 v0 스텁)
- [x] Supabase 스키마 골격 (opportunities · profiles · saved, RLS)
- [ ] 데이터 소스 어댑터 (§7) · 스코어링 규칙 v1
- [ ] 디자인/UI (별도 단계)

> 페르소나·수익 추정치는 예시 더미이며 실데이터로 재보정 전제(§11).
