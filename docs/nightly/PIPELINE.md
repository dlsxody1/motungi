# 야간 파이프라인 브랜치 모델

> 왜 이 문서가 있나:
> - 2026-07-10~13: 밤마다 `origin/main`에서 새 브랜치를 갈라내 서로를 모르는 밤들이 같은
>   파일(vitest 인프라·lockfile)을 중복 생성 → 머지 충돌(draft #6·#7).
> - 2026-07-14: `dev` 기준선 모델을 설계했으나 **클라우드 트리거엔 미배선** — 문서는 dev를
>   말하는데 실제 밤은 계속 main에서 `nightly/날짜`를 파고 main으로 PR을 열었다.
> - 2026-07-20: 밀린 밤 5개(#11~#15)가 전부 같은 base에서 갈라진 충돌 더미가 됨을 확인.
>   트리거 프롬프트를 실제로 고치고 **dev 직접 커밋(트렁크) 모델**로 전환.

## 핵심 규칙 (현행)

```
main   ← 사람만 승격. dev → main PR을 사람이 주기적으로 열고 머지.
 ↑
dev    ← 밤 작업의 단일 트렁크. 밤은 여기에 직접 커밋·push 한다. 브랜치·PR 없음.
```

1. **밤은 브랜치를 파지 않는다.** 매일 밤 `git fetch origin && git checkout -B dev origin/dev`
   로 최신 dev를 받아 **그 위에 직접 커밋**한다.
2. **밤은 PR을 열지 않는다.** 산출물은 `git push origin dev` 그 자체다.
3. **qa가 PUSH 게이트다.** `pnpm typecheck` + `pnpm test`가 깨끗이 통과해야만 dev에 push.
   실패 시 코드 revert, report-only 야간 노트만 push하고 STOP. **깨진 커밋은 dev에 못 간다.**
4. **계획(planner)은 최신 `origin/dev` 기준.** 어젯밤 산출물이 이미 dev에 있으므로 오늘 밤이
   같은 걸 중복 생성하지 않는다. backlog가 stale할 수 있으니 dev 실코드로 충족 여부 먼저 확인.
5. **밤은 절대 main에 손대지 않고, PR을 열거나 dev→main 승격을 하지 않는다.** 승격은 사람만.

## 0단계 — 백로그 게이트 (planner보다 먼저 판정)

밤은 시작하자마자 `docs/backlog/backlog.yml`의 `status: todo` 개수를 센다.

- **todo ≥ 2** → 위 6단계 구현 모드를 평소대로 진행한다(하룻밤 1이슈).
- **todo < 2** → **그 밤은 audit 모드다. 구현하지 않고 일감을 생성한다.**
  `origin/dev` 실코드를 8축(a11y·perf·보안·타입안전·FSD 경계·테스트 커버리지·UX 패리티·데드코드)으로
  정적 감사 → 적대검증 통과분만 → `backlog.yml`에 `M-NNN`으로 등재(`status: todo`) → report-only
  야간 노트와 함께 push하고 STOP. **제품 코드는 안 건드린다.** 상세는
  `.claude/rules/workflow/nightly-pipeline.md` 0단계.

> **왜 이 절이 뒤늦게 여기 생겼나 (2026-07-31):** 트리거 프롬프트엔 2026-07-22부터 audit 게이트가
> 들어 있었는데도 7/23~7/30 **9일 연속 "report-only, 등재 0건"** 으로 헛돌았다. 원인은 트리거가
> "먼저 읽으라"고 지정한 repo 문서들이 **정반대**를 말하고 있었기 때문 — `planner.md`의
> "todo가 없으면 종료"와 `CLAUDE.md`의 "밤은 status만 갱신, 신규 이슈 추가 권한 없음". 밤은
> repo 문서를 따랐다. 교훈: **트리거만 고치면 안 된다. 트리거가 읽는 repo 문서가 트리거와
> 모순되면 밤은 repo를 따른다.** (M-024)

## 왜 dev 직접 커밋(트렁크)인가
- **밤끼리 충돌 원천 차단**: 매일 같은 최신 dev 위에 쌓으므로, 어제 것을 모른 채 stale base에서
  다시 만드는 일이 없다. (오늘 M-008↔M-011 층-간 충돌 같은 게 애초에 안 생긴다.)
- **PR 더미 제거**: 밤마다 개별 draft PR이 안 생긴다. 사람은 dev→main 승격 PR **하나만** 본다.
- **main 안전판 유지**: main은 사람 승인으로만 움직인다.

## 사람이 할 일 (아침 / 주기적으로)
- `dev`의 밤 커밋을 확인 (git log origin/dev). qa 게이트를 통과한 것만 올라와 있다.
- 좋으면 **dev → main PR을 열어 승격**하고 머지. 이슈 완료 시 `docs/backlog/backlog.yml`에서
  `status: done`으로.
- dev가 오래 안 올라가면 밤들이 dev에 계속 쌓이므로, 주기적으로(주 1~2회) 승격을 권장.

## 트리거 (repo 밖 — 잊지 말 것)
밤 동작을 결정하는 것은 이 문서가 아니라 **claude.ai 클라우드 트리거 프롬프트 본문**
(`trig_013KmkrrdUit9DhPPHpq873y`)이다. 이 문서를 바꿔도 트리거를 함께 바꾸지 않으면 다음 밤에
반영되지 않는다. 2026-07-20에 트리거를 위 dev-트렁크 모델로 갱신했다(RemoteTrigger update).
