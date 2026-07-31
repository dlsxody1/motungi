# 야간 파이프라인 — dev 직접 커밋(트렁크) 모델 · 항상 로드

야간 6-에이전트 파이프라인의 불변 규칙. 권위 있는 상세는 `docs/nightly/PIPELINE.md`.

## 브랜치 모델 (현행, 2026-07-20~)
```
main   ← 사람만 승격. dev → main PR을 사람이 주기적으로 열고 머지.
 ↑
dev    ← 밤 작업의 단일 트렁크. 밤은 여기에 직접 커밋·push. 브랜치·PR 없음.
```
1. **밤은 브랜치를 파지 않는다.** `git fetch origin && git checkout -B dev origin/dev`로 최신 dev를 받아 **그 위에 직접 커밋**한다. (옛 `nightly/YYYY-MM-DD` 브랜치 모델은 폐기됨.)
2. **밤은 PR을 열지 않는다.** 산출물은 `git push origin dev` 그 자체다.
3. **qa가 PUSH 게이트다.** `pnpm typecheck` + `pnpm test`가 깨끗이 통과해야만 push. 실패 시 코드 revert, report-only 야간 노트만 push하고 STOP. **깨진 커밋은 dev에 못 간다.**
4. **planner는 최신 `origin/dev` 기준.** 어젯밤 산출물이 이미 dev에 있으므로 중복 생성 금지. backlog가 stale할 수 있으니 dev 실코드로 `done_when` 충족 여부 먼저 확인.
5. **밤은 절대 main에 손대지 않는다.** dev→main 승격은 사람만.

## 0단계 — 백로그 게이트 (planner 실행 전 매 밤 판정)
밤은 시작하자마자 `docs/backlog/backlog.yml`의 `status: todo` 개수를 센다.
- **todo ≥ 2** → 아래 6단계(구현 모드)를 평소대로 진행한다.
- **todo < 2** → **이 밤은 audit 모드다. 구현하지 않는다.** 큐가 마르면 억지로 이슈를 짜내
  a11y·마이크로카피 같은 저가치 변경만 쌓이므로, 대신 **일감을 생성**한다:
  1. `origin/dev` 실코드를 8축으로 정적 감사한다: **a11y · perf · 보안 · 타입안전(noUncheckedIndexedAccess) · FSD/의존성 경계 · 테스트 커버리지 · UX 일관성(web↔mobile) · 데드코드**. (선례: `docs/nightly/nightly-2026-07-15.md` — 8축 병렬 감사가 M-005~M-019를 생성.)
  2. 각 finding을 **적대검증**(반증 시도)해 살아남은 것만 채택한다. 근거는 반드시 `file:line`.
  3. 채택 findings를 dedup·클러스터링해 **`backlog.yml`에 `M-NNN` 이슈로 등재**한다
     (`status: todo`, `priority` 부여, `scope`·`done_when`·`notes` 채움 — 기존 M-005~M-019 형식 그대로). id는 마지막 M-NNN 다음 번호.
  4. **audit 모드는 backlog.yml만 편집한다** — 제품 코드는 손대지 않는다. qa 게이트(typecheck·test)는 코드 무변경이라 자동 통과.
  5. report-only 야간 노트(무엇을 감사했고 몇 개 등재했는지)와 backlog.yml 변경을 dev에 push하고 STOP.
- **사람의 몫은 우선순위 조정뿐.** 등재는 밤이 한다(옛 "밤은 status만 갱신" 규칙은 이 게이트로 대체됨).

## 6단계 순서 (구현 모드)
planner(1, 스펙) → architect(2, 계획 확정) → frontend-impl / backend-impl(3, 구현) → qa(4, 실행 검증=push 게이트) → reviewer(5, 야간 리포트).

## 각 단계의 스킬은 `@.claude/rules/workflow/skill-routing.md`를 따른다.

## ⚠️ 실제 야간 동작은 이 문서가 아니라 클라우드 트리거가 결정
밤 동작의 진짜 출처는 **claude.ai 클라우드 트리거 프롬프트(`trig_013KmkrrdUit9DhPPHpq873y`)**다. 이 repo 문서·에이전트 .md를 바꿔도 **트리거를 함께 갱신하지 않으면 다음 밤에 반영되지 않는다**(RemoteTrigger update 필요). 로컬/수동 실행과 문서 정합용으로만 신뢰하라.
