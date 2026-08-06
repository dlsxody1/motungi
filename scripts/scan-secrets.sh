#!/usr/bin/env bash
# 시크릿 스캔 — diff에 시크릿이 섞였는지 본다. 우리 security-policy.md의 자동 집행자.
#
# 패턴은 MoAI-ADK의 hardcoded-secret 클래스(internal/hook/security/patterns.go)를
# 우리 실제 위험으로 좁힌 것이다. 범용 스캐너를 흉내내지 않는다 —
# security-policy.md가 금지한 것만 정확히 잡는다.
#
# 사용: bash scripts/scan-secrets.sh [<base-ref>]
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="${1:-origin/dev}"
git rev-parse --verify --quiet "$BASE" >/dev/null || BASE="HEAD~1"

# 추가된 줄만 본다(기존 코드의 오탐을 끌고 오지 않는다). .env.example은 자리표시자라 제외.
ADDED=$(git diff "$BASE"...HEAD --unified=0 -- . ':(exclude).env.example' ':(exclude)scripts/scan-secrets.sh' \
  | grep -E '^\+' | grep -vE '^\+\+\+' || true)

[ -z "$ADDED" ] && { echo "   (diff 없음)"; exit 0; }

HITS=0
flag() {
  local label="$1" pattern="$2"
  local found
  # -e 로 넘겨야 '-----BEGIN' 처럼 -로 시작하는 패턴이 옵션으로 안 먹힌다.
  # -i 는 BSD grep이 (?i)를 모르므로 플래그로 준다.
  found=$(printf '%s\n' "$ADDED" | grep -niE -e "$pattern" || true)
  if [ -n "$found" ]; then
    echo "   ⚠️  $label"
    printf '%s\n' "$found" | head -5 | sed 's/^/       /'
    HITS=1
  fi
}

# 1. 클라이언트 노출 접두어에 시크릿 — security-policy.md 최우선 금지
flag "NEXT_PUBLIC_/EXPO_PUBLIC_ 에 시크릿" \
  '(NEXT_PUBLIC|EXPO_PUBLIC)_[A-Z_]*(SECRET|SERVICE_ROLE|PRIVATE|TOKEN|PASSWORD)'

# 2. service_role / secret 키 리터럴
flag "SERVICE_ROLE/SECRET_KEY 하드코딩" \
  '(SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY)[[:space:]]*[:=][[:space:]]*["'\''][^"'\'']+'

# 3. 실제 키 형태 (JWT / AWS / PEM)
flag "JWT 형태 리터럴" 'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}'
flag "AWS access key id" '\bAKIA[0-9A-Z]{16}\b'
flag "PEM private key"   '-----BEGIN [A-Z ]*PRIVATE KEY-----'

# 4. 일반 자격증명 대입 (env 참조·빈 문자열·자리표시자는 제외)
flag "하드코딩된 자격증명" \
  '(api[_-]?key|password|client[_-]?secret)[[:space:]]*[:=][[:space:]]*["'\''][^"'\''$<{]{8,}'

# 5. .env 커밋
if git diff "$BASE"...HEAD --name-only | grep -qE '(^|/)\.env$|(^|/)\.env\.(local|production)$'; then
  echo "   ⚠️  .env 파일이 diff에 있다 (커밋 금지)"
  HITS=1
fi

if [ "$HITS" -eq 0 ]; then
  echo "   (시크릿 패턴 없음)"
  exit 0
fi
echo "   → security-policy.md 위반 가능. 오탐이면 리포트에 사유를 남겨라."
exit 1
