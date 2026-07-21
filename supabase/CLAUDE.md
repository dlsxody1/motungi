# supabase — Postgres 마이그레이션 · Edge Functions

모퉁이의 데이터 계층. ORM이 아니라 **순수 SQL** 마이그레이션 + Deno Edge Functions. 상위 규칙은 루트 `CLAUDE.md`.

## 경계 규칙 (작업 시 자동 로드)
@../.claude/rules/languages/sql-migrations.md

## 이 디렉토리의 성격
- `migrations/NNNN_*.sql` — **순번 증가·추가만**. **기존 파일 수정 금지**(이미 적용됨). 파괴적 SQL 금지.
- `functions/ingest/` — Deno Edge Function. **실제 외부 적재 어댑터는 `functions/ingest/adapters.ts`** (core 어댑터 아님).
- `seed.sql`, `config.toml`. 동네 테이블은 서울 426동(0009/0010).
- 키 스킴: publishable / secret (레거시 anon/service_role 아님). `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용.

## 스킬 라우팅 (SSOT: `@../.claude/rules/workflow/skill-routing.md`)
- 마이그레이션 추가/백필/롤백 → **database-migrations**
- 스키마·쿼리·RLS·인덱스 → **postgres-patterns**
- 신뢰 안 되는 입력 SQL → **safe-sql-execution**
- Edge Function REST·외부소스 래핑 → **api-design**
- 인증·시크릿·입력처리·외부연동 작성 후 → **security-review**

## 주의
- RLS를 기본으로 건다. 무중단 스키마 변경: 추가 → 백필 → 코드 전환 → (나중) 제거.
- 외부 키: `DATA_GO_KR_SERVICE_KEY`는 Decoding 값 저장 + 코드에서 `encodeURIComponent`.
