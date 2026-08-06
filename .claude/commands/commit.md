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
5. **인자에 `pr`이 있으면** dev→main PR을 연다:
   `gh pr create --base main --head dev`.
   이미 열린 dev→main PR이 있으면(`gh pr list --base main --head dev`) 새로 만들지 말고
   그 URL을 알려준다. 본문은 커밋들을 묶어 **무엇이 바뀌었고 왜인지**로 쓰고 끝에 붙인다:
   ```
   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   ```
   PR은 열기만 한다 — **머지하지 마라**. dev→main 승격은 사람 몫이다.
6. 커밋 해시·push 여부·PR URL을 짧게 보고한다.
