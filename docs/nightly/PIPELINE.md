# 야간 파이프라인 브랜치 모델

> 왜 이 문서가 있나: 2026-07-10~13 야간 루틴이 매일 밤 `origin/main`에서 새 브랜치를
> 갈라내는 바람에, 서로를 모르는 밤들이 같은 파일(vitest 인프라·lockfile 등)을 중복
> 생성해 머지 충돌을 냈다(draft #6·#7). 2026-07-14 통합 정리 후 `dev` 기준선 모델로 전환.

## 핵심 규칙

```
main   ← 사람만 머지 (dev를 주기적으로 리뷰 후 승격)
 ↑
dev    ← 밤 작업의 통합 기준선. 매일 밤 여기서 갈라지고, 여기로 draft PR을 연다.
 ↑
nightly/YYYY-MM-DD  ← 그날 밤 작업 브랜치. origin/dev에서 생성.
```

1. **매일 밤 작업 브랜치는 `origin/dev`에서 갈라낸다** — `main`이 아니다.
   ```
   git fetch origin && git checkout -B nightly/YYYY-MM-DD origin/dev
   ```
2. **draft PR은 `dev`를 대상으로 연다** — `gh pr create --draft --base dev`.
3. **계획(planner)은 최신 `dev` 기준으로 세운다.** 어젯밤 산출물이 dev에 이미 있으므로
   오늘 밤이 같은 걸 중복 생성하지 않는다. backlog가 stale할 수 있으니 `origin/dev`의
   실제 코드로 `done_when` 충족 여부를 먼저 확인한다.
4. **에이전트는 절대 `main`·`dev`에 직접 커밋/머지하지 않는다.** `dev → main` 승격은
   오직 사람이 한다.

## 왜 dev 단일 기준선인가
- **밤끼리 충돌 원천 차단**: 어젯밤 인프라가 dev에 반영돼 있어 오늘 밤이 다시 안 만든다.
- **계획이 최신 상태 위에서**: "이미 됐네"를 매번 재발견하는 stale 문제 감소.
- **main 안전판 유지**: main은 사람 승인으로만 움직인다.

## 사람이 할 일 (아침)
- `dev`의 쌓인 draft PR들을 리뷰 → 좋으면 `dev`에 머지.
- 주기적으로 `dev → main` PR을 열어 승격.
- 이슈가 완료되면 `docs/backlog/backlog.yml`에서 `status: done`으로.
