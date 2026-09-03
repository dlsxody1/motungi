---
description: 변경사항을 커밋하고 dev에 push (인자에 pr 붙이면 dev→main PR까지)
allowed-tools: Bash(git:*), Bash(gh:*), Bash(bash scripts/gate.sh), Read, Grep
---

현재 변경사항을 커밋한다. 인자: $ARGUMENTS

## 규칙

- **브랜치는 `dev`다.** main에 직접 커밋 금지. 다른 브랜치면 멈추고 물어본다.
- **`bash scripts/gate.sh` 통과해야 push.** (typecheck·test·lint·시크릿 스캔)
  실패하면 커밋만 하고 push하지 않는다 — 무엇이 깨졌는지 실제 출력을 보여준다.
- **관련 없는 파일을 끌어오지 마라.** `git add -A` 금지. 이번 작업의 파일만 스테이징하고,
  뺀 파일이 있으면 무엇을 왜 뺐는지 밝힌다.
- 논리적으로 독립된 변경이 섞여 있으면 **커밋을 나눈다**(개별 revert 가능해야 한다).

## 커밋 메시지

`type(scope): 무엇을 왜` — 한글. type은 feat·fix·perf·refactor·docs·test·chore.

본문은 **왜**를 쓴다. "무엇을 했다"는 diff가 이미 말한다.
증상 → 원인 → 고친 방식 → 남는 트레이드오프. 없으면 제목 한 줄로 끝낸다.

끝에 붙인다:
```
Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

## 절차

1. `git status --short` + `git diff` + `git log --oneline -5`로 실제 변경을 파악한다.
   diff를 읽지 않고 메시지를 쓰지 마라.
2. 브랜치 확인(`dev`가 아니면 STOP).
3. 해당 파일만 `git add` → 커밋.
4. `bash scripts/gate.sh` → PASS면 `git push origin dev`. FAIL이면 push 생략하고 보고.
5. **인자에 `pr`이 있으면** — PR을 열기 **전에** main을 dev로 되받는다(아래 "충돌 재발 방지").
   `git fetch origin && git log --oneline origin/dev..origin/main`이 비어 있지 않으면
   **머지가 먼저다**. 그 다음에 PR을 연다:
   `gh pr create --base main --head dev`.
   이미 열린 dev→main PR이 있으면(`gh pr list --base main --head dev`) 새로 만들지 말고
   그 URL을 알려준다. 본문은 커밋들을 묶어 **무엇이 바뀌었고 왜인지**로 쓰고 끝에 붙인다:
   ```
   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   ```
   PR은 열기만 한다 — **머지하지 마라**. dev→main 승격은 사람 몫이다.
6. 커밋 해시·push 여부·PR URL을 짧게 보고한다.

## 충돌 재발 방지 — main을 dev로 되받아라

**main은 squash merge를 쓴다.** PR이 머지되면 main엔 커밋 1개가 새로 생기는데 dev는 그걸
모른다. 되받지 않으면 merge-base가 계속 뒤로 밀리고, **같은 변경이 양쪽에 다른 형태로 남아**
다음 PR이 충돌한다. 코드 문제가 아니라 브랜치 운영에서 누적되는 문제다.
(선례: PR #21 — 스쿼시 4건이 안 돌아와 merge-base가 `a6cd315`까지 밀렸고 충돌 5건이 났다.)

PR을 열기 전, 그리고 PR이 머지된 직후 한 번씩:
```
git fetch origin
git log --oneline origin/dev..origin/main   # 비어 있으면 할 일 없음
git merge origin/main                        # 비어 있지 않으면 되받는다
```

충돌이 나면:
- **자동 해결 금지.** `-X ours/theirs`로 뭉개지 마라 — 어느 쪽이 최신인지는 파일마다 다르다.
- 충돌 파일마다 **양쪽 diff를 읽고** 판단한다. 보통 dev가 나중이지만(main은 이미 머지된
  옛 스냅샷), 그 사이 main에 핫픽스가 들어갔다면 아니다. 근거 없이 한쪽을 고르지 마라.
- 머지 커밋 **전에** `bash scripts/gate.sh`를 돌린다. 충돌 해결은 컴파일되는 코드를
  만들어내지 못할 수 있다 — 합쳐놓고 안 돌려보면 깨진 트리를 push하게 된다.
- 머지 커밋 메시지에 **파일별로 어느 쪽을 왜 채택했는지** 적는다. 나중에 "왜 이 코드가
  사라졌지"를 추적할 유일한 단서다.
