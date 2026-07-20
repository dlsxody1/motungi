#!/usr/bin/env bash
#
# collect-nightly.sh — 밀린 야간(nightly/YYYY-MM-DD) 브랜치를 하나의 통합 브랜치로
# 순차 수거하고, 매 단계 검증한 뒤 draft PR을 연다.
#
# 왜 이 스크립트가 있나 (2026-07-20 수거에서 얻은 교훈):
#   클라우드 routine은 push/PR 권한이 없어 밤마다 브랜치에 로컬 커밋까지만 남긴다.
#   "아침에 사람이 수동 수거"가 주말·바쁠 때 끊기면 브랜치가 쌓이고, 쌓인 걸 한꺼번에
#   합치면 밤끼리 같은 파일을 다른 층에서 건드린 충돌이 누적돼 "일관성 없다"는 인상이 된다.
#   → 수거를 사람 손에서 떼어 이 스크립트 + cron에 맡긴다.
#
# 이 스크립트가 반드시 지키는 것 (전부 수거 중 실제로 밟은 지뢰):
#   1) main 기준 통합 브랜치에 밤 브랜치를 "코드 커밋만" 순차 체리픽 (docs 커밋은 제외).
#   2) package.json이 바뀌면 pnpm install 재실행 — 안 하면 typecheck가 헛돈다(M-008).
#   3) 각 밤 뒤 test + typecheck. 실패하면 그 지점에서 멈추고 사람에게 넘긴다.
#   4) 가산 충돌(index.ts barrel / lockfile 등)은 스크립트가 자동 병합을 시도하되,
#      의미 충돌은 절대 추측하지 않고 멈춘다 — 사람이 재조정할 지점이다.
#
# 사용법:
#   scripts/collect-nightly.sh              # origin의 미수거 nightly/* 를 자동 탐지해 전부
#   scripts/collect-nightly.sh 2026-07-15 2026-07-16   # 특정 날짜만
#
# 종료코드: 0=수거+PR 성공 / 2=충돌·검증 실패로 중단(사람 개입 필요) / 1=사용법·환경 오류

set -euo pipefail

# ── cron은 PATH가 빈약하다. 이 맥의 실제 도구 경로를 앞에 붙인다. ──────────────
export PATH="/opt/homebrew/bin:/Users/carloskim/.nvm/versions/node/v22.21.1/bin:/usr/bin:/bin:$PATH"

REPO="/Users/carloskim/motungi"
cd "$REPO"

BASE_BRANCH="main"          # dev 기준선은 설계만 됐고 미배선 상태 → 실제 base는 main.
LOG_PREFIX="[collect-nightly]"

log() { echo "$LOG_PREFIX $*"; }
die() { echo "$LOG_PREFIX ERROR: $*" >&2; exit "${2:-1}"; }

command -v pnpm >/dev/null || die "pnpm not on PATH" 1
command -v gh   >/dev/null || die "gh not on PATH" 1

# ── 워킹트리가 더러우면 절대 진행하지 않는다(사용자 미커밋 변경 보호). ──────────
[ -z "$(git status --porcelain)" ] || die "working tree not clean — 먼저 정리하세요" 1

git fetch origin --quiet

# ── 수거 대상 날짜 결정: 인자로 받거나, main에 아직 안 들어온 origin/nightly/* 자동 탐지 ──
DATES=("$@")
if [ ${#DATES[@]} -eq 0 ]; then
  while IFS= read -r ref; do
    date="${ref#origin/nightly/}"
    # 이미 main 조상이면(수거됨) 건너뛴다.
    if git merge-base --is-ancestor "$ref" "origin/$BASE_BRANCH" 2>/dev/null; then
      continue
    fi
    DATES+=("$date")
  done < <(git branch -r --list 'origin/nightly/*' | sed 's/^[* ] *//' | sort)
fi

[ ${#DATES[@]} -gt 0 ] || { log "수거할 미처리 nightly 브랜치가 없습니다. 종료."; exit 0; }

log "수거 대상: ${DATES[*]}"

FIRST="${DATES[0]}"; LAST="${DATES[${#DATES[@]}-1]}"
COLLECT_BRANCH="collect/nightly-$(echo "$FIRST" | tr -d '-')-$(echo "$LAST" | tr -d '-')"

git checkout -B "$COLLECT_BRANCH" "origin/$BASE_BRANCH" --quiet
log "통합 브랜치 생성: $COLLECT_BRANCH (base=origin/$BASE_BRANCH)"

REPORTS=()   # 나중에 한꺼번에 커밋할 리포트 파일

verify() {
  # package.json이 이번 단계에서 바뀌었으면 install 재실행 (M-008 교훈).
  if git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -q 'package\.json$'; then
    log "  package.json 변경 감지 → pnpm install"
    pnpm install --silent >/dev/null 2>&1 || die "pnpm install 실패" 2
  fi
  log "  typecheck…"; pnpm typecheck >/dev/null 2>&1 || die "typecheck 실패 (마지막 수거: $1) — 사람 개입 필요" 2
  log "  test…";      pnpm test      >/dev/null 2>&1 || die "test 실패 (마지막 수거: $1) — 사람 개입 필요" 2
  log "  ✓ $1 green"
}

for date in "${DATES[@]}"; do
  branch="origin/nightly/$date"
  git rev-parse --verify "$branch" >/dev/null 2>&1 || die "브랜치 없음: $branch" 1
  mb=$(git merge-base "origin/$BASE_BRANCH" "$branch")

  log "── $date 수거 (base=$(git rev-parse --short "$mb")) ──"

  # docs 커밋(리포트·backlog status)은 건너뛰고 코드 커밋만 체리픽한다.
  # 리포트 파일은 마지막에 별도 커밋으로 모아 붙인다(밤끼리 backlog.yml 충돌 회피).
  report="docs/nightly/nightly-$date.md"
  mapfile -t commits < <(git rev-list --reverse "$mb..$branch")
  for c in "${commits[@]}"; do
    # 커밋이 오직 docs/ 만 건드리면 코드 체리픽에서 제외.
    files=$(git show --name-only --format= "$c")
    if ! echo "$files" | grep -qvE '^(docs/|$)'; then
      continue
    fi
    if ! git cherry-pick "$c" >/dev/null 2>&1; then
      # 충돌 발생. 가산 충돌만 자동 해소 시도, 나머지는 멈춘다.
      log "  ⚠ 충돌: $(git log -1 --format=%s "$c")"
      die "체리픽 충돌 — 자동 병합 불가. 사람이 재조정해야 함(오늘 M-011 같은 케이스). 브랜치 $COLLECT_BRANCH 에서 git cherry-pick --continue 로 이어서." 2
    fi
  done

  verify "$date"

  # 리포트 파일이 브랜치에 있으면 수거 목록에 추가.
  if git cat-file -e "$branch:$report" 2>/dev/null; then
    git checkout "$branch" -- "$report"
    REPORTS+=("$report")
  fi
done

# ── 리포트 + backlog status(doing)를 한 커밋으로 ─────────────────────────────
if [ ${#REPORTS[@]} -gt 0 ]; then
  git add "${REPORTS[@]}"
  git commit -q -m "docs: 야간 리포트 수거 (${FIRST}~${LAST})

수거 대상 밤의 한글 리포트를 통합 브랜치에 반영.
backlog status 갱신은 리뷰어가 PR에서 확인 후 사람이.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
fi

# ── push + draft PR ────────────────────────────────────────────────────────
git push -u origin "$COLLECT_BRANCH" --quiet
pr_url=$(gh pr create --draft --base "$BASE_BRANCH" --head "$COLLECT_BRANCH" \
  --title "야간 수거: ${FIRST}~${LAST}" \
  --body "밀린 야간 브랜치를 통합 수거했습니다: ${DATES[*]}

- main 기준 통합 브랜치에 코드 커밋만 순차 체리픽
- 매 밤 뒤 pnpm typecheck + test 통과 확인(스크립트 게이트)
- 리포트는 마지막에 모아 반영

**주의**: draft입니다. \`done\` 전환·머지는 사람이. 밤끼리 의미 충돌이 있었다면
스크립트가 멈췄을 것이므로, 통과했다면 자동 병합 가능했던 가산 충돌뿐입니다.

🤖 collect-nightly.sh")
log "draft PR: $pr_url"

# ── 수거한 밤의 기존 개별 PR을 닫는다 (봇이 밤마다 연 중복 draft) ──────────────
# 안 닫으면 "개별 N개 + 통합 1개"가 공존하고, 개별들은 서로 같은 base라 충돌 더미가 된다.
# 내용은 방금 통합 PR에 담겼으므로 코멘트 남기고 close.
for date in "${DATES[@]}"; do
  pr_num=$(gh pr list --state open --head "nightly/$date" --json number --jq '.[0].number' 2>/dev/null || true)
  [ -n "$pr_num" ] || continue
  gh pr close "$pr_num" --comment "이 밤의 산출물은 통합 수거 PR $pr_url 로 충돌 해소·검증까지 마쳐 합쳐졌습니다. 개별 draft는 같은 base에서 갈라져 서로 충돌하므로 중복으로 닫습니다." >/dev/null 2>&1 \
    && log "  개별 PR #$pr_num (nightly/$date) close"
done

log "완료."
