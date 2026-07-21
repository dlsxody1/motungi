---
paths:
  - "supabase/**/*.sql"
  - "supabase/functions/**/*.ts"
---

# supabase — Postgres 마이그레이션 · Edge Functions

`supabase/` 작업 시에만 로드된다. ORM이 아니라 **순수 SQL** 마이그레이션이다.

## 마이그레이션 규율
- 파일은 `supabase/migrations/NNNN_*.sql`, **순번 증가·추가만**. **기존 마이그레이션 파일 수정 금지**(이미 적용됨).
- **파괴적 SQL 금지**: DROP TABLE/COLUMN·데이터 삭제·비가역 변경 금지. 스키마 변경은 additive + 백필로.
- 무중단(zero-downtime) 전략: 컬럼 추가→백필→코드 전환→(나중에) 제거 순.
- 인덱스·데이터타입·안티패턴은 **postgres-patterns** 스킬. RLS(Row Level Security)를 기본으로 건다.

## Edge Functions (Deno)
- `supabase/functions/`는 Deno 런타임. 시크릿은 서버 전용(`@.claude/rules/core/security-policy.md`).
- 외부 데이터 적재(ingest)의 **실제 어댑터는 `supabase/functions/ingest/adapters.ts`**다 (`packages/core`의 어댑터 아님 — 혼동 주의).
- 사용자·외부 입력 SQL은 **safe-sql-execution**(proven authorship / SafeSqlFragment)로 구성.

## 스킬 (도메인 라우팅)
- 마이그레이션 추가/백필/롤백 → **database-migrations**
- 스키마·쿼리·RLS·인덱스 최적화 → **postgres-patterns**
- 신뢰 안 되는 입력 SQL → **safe-sql-execution**
- Edge Function REST/외부소스 래핑 → **api-design**
- 인증·시크릿·입력 처리 작성 후 → **security-review**
