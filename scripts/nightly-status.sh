#!/usr/bin/env bash
#
# nightly-status.sh — dev-트렁크 모델의 아침 확인 스크립트.
#
# 밤 routine은 이제 origin/dev에 직접 커밋한다(브랜치·PR 없음, docs/nightly/PIPELINE.md).
# 이 스크립트는 매일 아침 cron으로 돌며:
#   1) dev가 main보다 앞서 있으면(= 밤 산출물이 쌓임) 요약을 로그에 남긴다.
#   2) 승격은 사람만 한다 — 자동 머지하지 않는다(안전). dev→main PR을 열 준비만 알린다.
#   3) 혹시 밤이 옛 모델로 회귀해 nightly/* 브랜치를 남겼으면 경고한다(레거시 collect 필요 신호).
#
# 종료코드: 0=정상(승격 대기 유무 무관) / 1=환경 오류

set -euo pipefail
export PATH="/opt/homebrew/bin:/Users/carloskim/.nvm/versions/node/v22.21.1/bin:/usr/bin:/bin:$PATH"

REPO="/Users/carloskim/motungi"
cd "$REPO"
P="[nightly-status]"
log() { echo "$P $*"; }

command -v git >/dev/null || { echo "$P ERROR: git 없음" >&2; exit 1; }

git fetch origin --quiet

ahead=$(git rev-list --count origin/main..origin/dev 2>/dev/null || echo 0)
ts="$(git log -1 --format='%ci' origin/dev 2>/dev/null || echo '?')"

log "=== $(date '+%Y-%m-%d %H:%M') ==="
if [ "$ahead" -gt 0 ]; then
  log "dev가 main보다 $ahead 커밋 앞섬 (마지막 dev 커밋: $ts). 승격 대기 중:"
  git log --oneline origin/main..origin/dev | sed "s/^/$P   /"
  log "→ 승격하려면: gh pr create --base main --head dev --title 'promote dev → main' && (리뷰 후) gh pr merge"
else
  log "dev == main. 밤 산출물 없음(또는 이미 승격됨)."
fi

# 옛 모델 회귀 감지: nightly/* 원격 브랜치가 남아있으면 알린다.
stale=$(git branch -r --list 'origin/nightly/*' | sed 's/^[* ] *//')
if [ -n "$stale" ]; then
  log "⚠ nightly/* 브랜치 잔존 — 밤이 옛 브랜치 모델로 회귀했을 수 있음. 확인 필요:"
  echo "$stale" | sed "s/^/$P   /"
  log "  (레거시 수거가 필요하면 scripts/collect-nightly.sh)"
fi

exit 0
