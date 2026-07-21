# 모퉁이(motungi) — 프로젝트 규칙

"퇴근하고 뭐하지?" — 서울/수도권 직장인 대상 60초 진단 → 1픽 **동네 문화·여가 큐레이션** 앱. pnpm + turbo 모노레포, TypeScript, Supabase.

## 항상 로드되는 규칙
아래는 모든 작업에 적용된다. 반드시 준수.
- @.claude/rules/core/constitution.md
- @.claude/rules/core/security-policy.md
- @.claude/rules/workflow/nightly-pipeline.md
- @.claude/rules/workflow/skill-routing.md

## 모노레포 지도 (작업 경계별 규칙은 하위 CLAUDE.md + languages 룰)
| 경계 | 스택 | 하위 규칙 |
|---|---|---|
| `apps/web` | Next.js 15 / React 19 / DOM | `apps/web/CLAUDE.md` |
| `apps/mobile` | Expo 52 / React 18 / RN | `apps/mobile/CLAUDE.md` |
| `packages/core` | 순수 도메인 로직 | `packages/core/CLAUDE.md` |
| `packages/tokens` | 디자인 토큰(Twilight Rose) | `DESIGN.md` |
| `supabase/` | Postgres SQL · Edge Functions | `supabase/CLAUDE.md` |

작업 중인 파일 경로에 맞는 `languages/*` 룰(`react-web`/`react-native`/`core-logic`/`sql-migrations`)이 `paths` glob으로 자동 로드된다.

## 권위 있는 출처 (내용은 여기서 확인 — 복붙 금지)
- 제품/피벗 배경: `docs/HANDOFF.md`, `docs/PIVOT-afterwork.md`, `PRODUCT.md`
- 야간 파이프라인: `docs/nightly/PIPELINE.md` (+ 트리거 `trig_013Kmkrr…`는 repo 밖)
- 비주얼 시스템·토큰: `DESIGN.md`
- 백로그: `docs/backlog/backlog.yml` (사람만 이슈 추가, 밤은 status만 갱신)

## 자주 쓰는 명령
```
pnpm dev        # turbo dev (web은 3000)
pnpm typecheck  # 전체 워크스페이스
pnpm test       # vitest
pnpm build
```

## 핵심 함정 (자세히는 각 룰 파일)
- 시크릿은 **서버 전용** — `NEXT_PUBLIC_*`/`EXPO_PUBLIC_*`에 절대 금지, `SUPABASE_SERVICE_ROLE_KEY` 클라이언트 노출 금지.
- **React 19(web) ≠ React 18(mobile)** — DOM 패턴을 RN에 넣지 마라.
- 마이그레이션은 **추가만**, 기존 파일 수정·파괴적 SQL 금지.
- 실제 적재 어댑터는 `supabase/functions/ingest/adapters.ts` (core 어댑터 아님).
- **디자인 작업 = 스킬 필수**: 제품 UI→`impeccable`, 플로우/IA→`ux`, 랜딩→`design-taste-frontend`.
