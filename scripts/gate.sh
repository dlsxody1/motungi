#!/usr/bin/env bash
# 야간 push 게이트 — qa가 이걸 돌린다. 통과해야 dev에 올라간다.
#
# TRUST 5(MoAI-ADK) 중 우리가 실제로 강제하는 것만 검사한다:
#   T(Tested)    pnpm test           — 이미 게이트였음
#   R(Readable)  pnpm lint           — 스크립트는 있었지만 게이트 밖이었다 (이번에 편입)
#   S(Secured)   시크릿 스캔          — reviewer 눈으로만 보던 것 (이번에 자동화)
#   + typecheck  — 이미 게이트였음
#
# 커버리지 85% 같은 수치 게이트는 일부러 넣지 않았다. 밤이 자율로 도는데 숫자를 게이트로
# 걸면 숫자를 채우는 게 목적이 되고, expect(true).toBe(true) 류가 쌓인다.
#
# 사용: bash scripts/gate.sh [<base-ref>]
#   base-ref 없으면 origin/dev 대비 diff를 스캔한다.
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="${1:-origin/dev}"
FAIL=0
declare -a FAILED

run() {
  local label="$1"; shift
  echo "── $label"
  if "$@"; then
    echo "   ✅ $label"
  else
    echo "   ❌ $label"
    FAILED+=("$label")
    FAIL=1
  fi
}

run "typecheck" pnpm typecheck
run "test"      pnpm test
run "lint"      pnpm lint
run "secrets"   bash scripts/scan-secrets.sh "$BASE"

echo
if [ "$FAIL" -eq 0 ]; then
  echo "GATE: PASS — push 허용"
else
  echo "GATE: FAIL (${FAILED[*]}) — push 금지"
fi
exit "$FAIL"
