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
- **todo ≥ 2** → 아래 6단계(구현 모드)를 평소대로 진행한다. 그 밤은 **클러스터 1개**(1~3이슈)를 친다 — 아래 "클러스터 규칙".
- **todo < 2** → **이 밤은 audit 모드다. 구현하지 않는다.** 큐가 마르면 억지로 이슈를 짜내
  a11y·마이크로카피 같은 저가치 변경만 쌓이므로, 대신 **일감을 생성**한다:
  1. `origin/dev` 실코드를 8축으로 정적 감사한다: **a11y · perf · 보안 · 타입안전(noUncheckedIndexedAccess) · FSD/의존성 경계 · 테스트 커버리지 · UX 일관성(web↔mobile) · 데드코드**. (선례: `docs/nightly/nightly-2026-07-15.md` — 8축 병렬 감사가 M-005~M-019를 생성.)
  2. 각 finding을 **적대검증**(반증 시도)해 살아남은 것만 채택한다. 근거는 반드시 `file:line`.
  3. 채택 findings를 dedup·클러스터링해 **`backlog.yml`에 `M-NNN` 이슈로 등재**한다
     (`status: todo`, `priority` 부여, `scope`·`done_when`·`notes` 채움 — 기존 M-005~M-019 형식 그대로). id는 마지막 M-NNN 다음 번호.
  4. **audit 모드는 backlog.yml만 편집한다** — 제품 코드는 손대지 않는다. qa 게이트(typecheck·test)는 코드 무변경이라 자동 통과.
  5. report-only 야간 노트(무엇을 감사했고 몇 개 등재했는지)와 backlog.yml 변경을 dev에 push하고 STOP.
- **사람의 몫은 우선순위 조정뿐.** 등재는 밤이 한다(옛 "밤은 status만 갱신" 규칙은 이 게이트로 대체됨).

## 클러스터 규칙 — 밤은 1이슈가 아니라 **클러스터(1~3개)** 를 친다 (2026-08-05 변경)
옛 규칙("하룻밤 1이슈")은 폐기됐다. todo 19건이면 19밤이 걸리는 게 병목이었다.
- **씨앗**: priority 최상위 todo 1개(동순위면 id 오름차순).
- **묶는 기준은 priority가 아니라 `scope` 겹침이다.** 씨앗과 **실제 파일 또는 좁은 디렉토리**를 공유하는 todo를 더한다. 같은 파일 = 겹침. `apps/mobile` ↔ `apps/mobile`은 앱 전체라 겹침이 아니다.
- **상한 3개.** 초과분은 미루고 리포트에 적는다. 수를 채우려 낮은 priority를 끌어오지 마라.
- **폴백**: **파일 겹침 후보가 0개면**(씨앗 scope에 파일이 섞여 있든 없든 무관 — 걸린 게 없다는 사실이 기준) **같은 앱 + 같은 priority**인 todo를 id 오름차순 2개까지 더한다. 예: `M-030[packages/tokens, apps/web]`은 파일 겹침 0이라 같은 high·`apps/web`인 `M-034`와 묶인다. 리포트에 "파일 겹침 0 → 앱 단위 폴백"이라 밝히고, 그 이슈들의 `scope`를 실제 파일로 좁혀 백로그를 고쳐둔다.
- 폴백까지 해도 겹치는 게 없으면 1이슈 밤이고, 그것도 정상 결과다.
- 왜 scope인가: 같은 파일을 건드리는 이슈는 한 번에 고쳐진다. 둘 다 high라는 이유로 무관한 이슈를 묶으면 맥락 전환만 늘고 실패 시 폭발 반경이 커진다.

## push 규율 — **이슈 단위**다 (2026-08-05 변경)
클러스터는 통째로 push되지 않는다. 이슈마다 따로 선다.
- 구현은 **이슈당 1커밋**(독립 revert 가능해야 한다). 클러스터를 한 커밋으로 뭉치지 마라.
- qa 통과 이슈 → 그 커밋만 dev로. 실패 이슈 → **그 커밋만 revert**하고 통과분은 남긴다. 실패 이슈는 `status: todo`로 남아 다음 밤이 재시도한다.
- **최종 dev는 반드시 green이어야 한다.** revert 후 남은 트리로 typecheck·test를 **다시 돌려** 확인하고 push한다. 남은 것들이 함께 통과하지 못하면 클러스터 전체를 revert하고 report-only로 간다.
- 3건 중 2건만 나갔으면 그건 **성공**이다. 미룬 것을 리포트에 명시하라.

## 6단계 순서 (구현 모드)
planner(1, 클러스터 스펙) → architect(2, 계획 확정) → frontend-impl / backend-impl(3, 구현·이슈당 1커밋) → qa(4, 실행 검증=이슈별 push 게이트) → reviewer(5, 야간 리포트).

## 각 단계의 스킬은 `@.claude/rules/workflow/skill-routing.md`를 따른다.

## ⚠️ 실제 야간 동작은 이 문서가 아니라 클라우드 트리거가 결정
밤 동작의 진짜 출처는 **claude.ai 클라우드 트리거 프롬프트(`trig_013KmkrrdUit9DhPPHpq873y`)**다. 이 repo 문서·에이전트 .md를 바꿔도 **트리거를 함께 갱신하지 않으면 다음 밤에 반영되지 않는다**(RemoteTrigger update 필요). 로컬/수동 실행과 문서 정합용으로만 신뢰하라.
