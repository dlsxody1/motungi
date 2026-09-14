#!/usr/bin/env bash
# 순수 레이어 테스트 강제 — gate.sh가 돌린다.
#
# 왜: 로직을 컴포넌트에서 lib/·core로 내리는 게 이 규율의 목적인데, 내려놓고 테스트를
# 안 붙이면 "옮기기만 한 것"이 된다. 순수 함수는 테스트 비용이 가장 싼 자리이므로
# 여기서만 강제한다. 컴포넌트 테스트는 강제하지 않는다(react-testing 스킬의 판단 영역).
#
# 검사 대상: apps/web/src/lib/**.ts · packages/core/src/**.ts
# 각 파일에 짝이 되는 *.test.ts 가 있어야 한다.
#
# 면제(ALLOWLIST): 설정·상수·타입·재export 파일. 로직이 없어 단언할 게 없는 것들.
# ⚠️ 여기에 파일을 추가하는 건 "테스트를 안 쓰겠다"는 선언이다. 로직이 있으면 넣지 마라.
set -uo pipefail
cd "$(dirname "$0")/.."

ALLOWLIST=(
  # 설정/클라이언트 생성 — 부작용뿐이라 단위테스트 대상이 아니다
  "apps/web/src/lib/supabase.ts"
  # 상수 테이블(필터 라벨·카테고리 매핑). 값 자체가 명세라 테스트가 동어반복이 된다
  "apps/web/src/lib/explore-filters.ts"
  # 인메모리 레이트리밋 — 시간 의존이라 통합/route 테스트 쪽에서 커버
  "apps/web/src/lib/rate-limit.ts"
  # 재export 배럴 (하위 모듈은 각자 테스트를 갖는다)
  "packages/core/src/index.ts"
  "packages/core/src/adapters/index.ts"
  # 타입 선언만 (런타임 코드 없음)
  "packages/core/src/types.ts"
)

is_allowed() {
  local f="$1"
  for a in "${ALLOWLIST[@]}"; do
    [ "$f" = "$a" ] && return 0
  done
  return 1
}

MISSING=()
for dir in "apps/web/src/lib" "packages/core/src"; do
  [ -d "$dir" ] || continue
  while IFS= read -r f; do
    case "$f" in
      *.test.ts | *.test.tsx | *.d.ts) continue ;;
    esac
    is_allowed "$f" && continue
    [ -f "${f%.ts}.test.ts" ] && continue
    MISSING+=("$f")
  done < <(find "$dir" -name "*.ts" -type f | sort)
done

if [ "${#MISSING[@]}" -eq 0 ]; then
  echo "   순수 레이어 테스트: 누락 없음 (면제 ${#ALLOWLIST[@]}건)"
  exit 0
fi

echo "순수 레이어인데 테스트가 없다 — 옮기기만 하고 검증을 안 붙였다:"
for f in "${MISSING[@]}"; do
  echo "  ✗ $f  →  ${f%.ts}.test.ts 를 만들어라"
done
echo
echo "정말 테스트할 게 없는 설정/상수 파일이면 scripts/check-pure-tests.sh 의"
echo "ALLOWLIST에 사유와 함께 추가하라."
exit 1
