# Security Policy — 항상 로드

시크릿·인증·외부연동의 불변 규칙. 위반은 곧 사고다. 상세 체크리스트는 `security-review` 스킬.

## 시크릿은 서버 전용 (절대 클라이언트 노출 금지)
- 외부 API 키·시크릿은 **서버에서만** 쓴다. `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` 접두어에 시크릿을 절대 넣지 마라.
- **`SUPABASE_SERVICE_ROLE_KEY`** 및 secret 키는 클라이언트 번들·모바일 앱·git에 절대 들어가면 안 된다.
- NAVER 시크릿은 **`/api/geo` 프록시 뒤**에 숨긴다(reverse-geocoding). 클라이언트에서 직접 네이버를 부르지 마라.
- `data.go.kr` 공유 키(`DATA_GO_KR_SERVICE_KEY`)는 **Decoding 값**을 저장하고 코드에서 `encodeURIComponent` 한다.

## Supabase 키 스킴
- **publishable / secret** 스킴을 쓴다 (레거시 anon / service_role 아님).
- publishable(=클라이언트 노출 가능)과 secret(=서버 전용)을 혼동하지 마라.
- 카카오는 **소셜 로그인 전용**(Supabase Auth 경유). 클라이언트에 카카오 시크릿을 두지 마라.

## 환경변수 파일
- `.env`는 gitignore됨 — **커밋 금지**. 커밋 대상은 `.env.example`뿐.
- 루트 `.env`가 단일 출처. `apps/web/.env`는 루트로의 심링크다.

## SQL / 외부입력
- 사용자·외부 입력이 섞인 SQL은 `safe-sql-execution` 스킬(proven authorship + SafeSqlFragment)로 안전하게 구성한다. 문자열 연결로 쿼리 만들지 마라.
- RLS(Row Level Security)를 신뢰하되, 서버 코드에서 secret 키로 RLS를 우회할 땐 입력 검증을 이중으로 한다.

## 커밋 위생
- diff에 시크릿·토큰·`.env`·CI 자격증명이 섞였는지 항상 확인한다. 파괴적 마이그레이션(DROP/데이터 삭제)은 금지.
