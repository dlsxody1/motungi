# 모퉁이(motungi) — 앱 레벨 UX 설계 & 감사

> **제품 한 줄:** "퇴근하고 뭐하지?" — 60초 진단 → **원픽** 동네 문화·여가 큐레이션.
> **플랫폼:** 웹(Next.js `apps/web`) + 모바일(Expo `apps/mobile`). `@motungi/tokens`·`@motungi/core` 공유, 화면 컴포넌트는 플랫폼별 중복 구현.
> **이 문서:** 앱 전체 UX 의사결정의 단일 진실 원천 + `.claude/skills/ux` 프레임워크 기준 감사 결과. 개별 화면은 `screens/*.md` 참조.

## 목차

| # | 섹션 |
|---|------|
| 1 | [정보 구조 (사이트맵)](#1-정보-구조-사이트맵) |
| 2 | [글로벌 내비게이션](#2-글로벌-내비게이션) |
| 3 | [공통 인터랙션 규칙](#3-공통-인터랙션-규칙) |
| 4 | [7가지 화면 상태 정책](#4-7가지-화면-상태-정책) |
| 5 | [접근성 기준선](#5-접근성-기준선) |
| 6 | [감사 결함 인벤토리 (심각도별)](#6-감사-결함-인벤토리-심각도별) |
| 7 | [화면 문서 링크](#7-화면-문서-링크) |

---

## 1. 정보 구조 (사이트맵)

핵심 JTBD: *"퇴근/주말에 우리 동네에서 부담 없이 할 만한 걸 고민 없이 하나 정하고 싶다."*
→ 검증 규칙: **핵심 콘텐츠(원픽 상세)까지 ≤3탭** (`information-architecture.md`).

```
/ (온보딩·랜딩)
├─ /location      A2 · 동네 설정 (집 앵커)
├─ /diagnosis     60초 3문항 진단
├─ /loading       A4 · 스코어링 전환
├─ /report        A5 · 동네 리포트 (원픽) ── [탭 홈]
│   └─ /opportunity?id=  A6 · 활동 상세 (외부 CTA)
├─ /explore       B1 · 전체 탐색 (검색·필터) ── [탭]
├─ /saved         A7 · 보관함 ── [탭]
└─ /my            D1 · 프로필·설정 ── [탭]
```

핵심 경로 탭 수: `/report → /opportunity` = 1탭 ✅. 최초 진입 `/ → location → diagnosis → loading → report` = 온보딩 플로우(설정 1회성). IA 원칙상 **원픽이 프론트도어**이며, 진단은 프론트도어에 도달하기 위한 최소 관문.

## 2. 글로벌 내비게이션

**모바일** — 하단 탭 4개: `홈(→/report)` · `탐색(/explore)` · `보관함(/saved)` · `마이(/my)`. 온보딩/설정/진단/상세는 탭 밖 스택.

**데스크탑(웹)** — 스티키 상단 내비 `TopNav`.
- `marketing` variant(랜딩): 검색 · 로그인 · 시작하기
- `app` variant(앱 내부): 동네 pill · 보관함 · 아바타
- `NAV_ITEMS`: 홈 · 탐색 · 동네 리포트 (~~청년정책~~ 제거 대상, §6-C3)

**내비 규칙:**
- 현재 위치는 항상 정확히 하이라이트한다(Von Restorff). 데스크탑 `/my`·`/saved`·`/opportunity`가 `active="explore"`를 넘기는 것은 결함(§6-M10).
- 모든 최상위 목적지는 내비에서 직접 도달 가능해야 한다. 데스크탑에서 보관함/마이 진입점 부재는 결함(§6-M10).

## 3. 공통 인터랙션 규칙

`interaction-patterns.md`의 피드백 선택표 기준으로 아래를 **앱 전역 컨벤션**으로 확정한다.

| 상황 | 패턴 | 금지 |
|------|------|------|
| 순간 확인(저장됨, 복사됨) | 인라인 상태 변경 + 토스트(2–4s) | `alert()` |
| 폼/입력 오류 | 필드 하단 인라인 메시지 | `alert()` |
| 네트워크 실패 | 화면 내 에러 상태 + 재시도 버튼 | 조용한 폴백만 |
| 미완성 기능 | 명시적 "출시 예정" 인라인 배지(비활성 이유 표기) | `alert("준비 중")`, 죽은 컨트롤 |
| 파괴적 액션 | 무엇이 일어날지 명시한 확인 | "정말요?" only |

**규칙:** `window.alert`/RN `Alert`는 위치·로그인·"준비 중" 어디서도 UI 피드백 수단으로 쓰지 않는다(§6-M8). 되돌릴 수 있는 액션(보관 토글 등)은 확인 없이 즉시 실행 + 실행취소 여지.

## 4. 7가지 화면 상태 정책

모든 데이터 화면은 7상태(empty·loading·loaded·error·partial·refresh·offline)를 설계하거나 **"불가능"으로 명시 문서화**한다(`interaction-patterns.md`).

| 화면 | empty | loading | error | 비고 |
|------|-------|---------|-------|------|
| report | ✅ 진단 유도 | ✅ /loading | ⚠️ 현재 구조상 불가 | `fetchOpportunities`가 항상 목업 폴백 → error 도달 불가 |
| explore | ✅ 1줄 | ⚠️ 동기 읽기 | ⚠️ 동일 | 카탈로그 비지 않음이 보장됨 |
| saved | ✅ 잘 설계됨 | ⚠️ 서버 pull | ⚠️ | 서버 동기화 실패는 조용히 무시 |
| opportunity | — | ⚠️ | ⚠️ | id 폴백 체인이 항상 1건 보장 |
| location | ✅ 검색결과 없음 | 부분(위치 조회) | ✅ 인라인(수정됨) | |

**정책 확정 (2026-07-08 감사 반영):**
- `fetchOpportunities()`는 Supabase 실패/미설정/0행 시 항상 `ALL_OPPORTUNITIES` 목업으로 폴백한다 → **현재 error/empty(카탈로그) 상태는 코드상 도달 불가**. 따라서 별도 error UI를 지금 만들지 않고 "불가능"으로 문서화한다(anti-pattern: 도달 불가 상태를 위한 투기적 UI 금지).
- **단, 이 '조용한 폴백'이 곧 설계 부채**다. Supabase 실데이터가 붙는 시점에 "실데이터 조회 실패 → 사용자에게 알리고 재시도" 경로를 명시적으로 추가할 것(그때 M9를 재오픈). 지금은 위치·로그인 실패의 `alert()`만 인라인으로 교체 완료(M8).

## 5. 접근성 기준선

`ergonomics.md` + `@motungi/tokens` 준수 기준(감사 대상 아님, 준수 여부만 검증).

- **히트 타겟** ≥ `MIN_HIT_TARGET = 44`px. 34–36px pill(모바일)은 재점검.
- **대비** 본문 4.5:1 / UI 3:1. 토큰 `neutral.muted #6b645a`는 본문 AA 통과, `faint`는 장식 전용.
- **색상 단독 지표 금지.** 카테고리/상태는 라벨·아이콘 병행.
- **포커스/키보드**(웹): 보관 토글이 `role="button"` span인 경우 포커스·키보드 핸들러 필수.
- **모션**: `.reveal` 등 스크롤 애니메이션은 `prefers-reduced-motion` 준수(웹 확인됨).

## 6. 감사 결함 인벤토리 (심각도별)

`design-process.md` Step 5 심각도 분류. 각 항목에 위반 인지 원칙을 인용.

### 🔴 Critical — 플로우 파괴 / 잘못된 정보
- **C1** 게스트 CTA가 진단 스킵(모바일 `index.tsx:49` → `/report`). *Goal Gradient·Jakob 위반* — 원픽 가치 제안 붕괴. → `/location` 라우팅.
- **C2** 잘못된 구 라벨(모바일 `location.tsx:129` "서울 마포구" 하드코딩, 성수/판교 오표기). *정보 정확성 위반.* → 동별 구 매핑.
- **C3** 내비 "청년정책"(웹 `web-shell.tsx:64`, 옛 일자리 어휘, `/explore` 오도). *IA 잘못된 라벨.* → 제거.
- **C4** side_job "참가비 +48만 원" 의미 충돌(`core/view.ts:75-88`). *일관성·명료성 위반.* → 라벨 분기.

### 🟠 Major — 죽은 컨트롤 / 신뢰 저하 / 상태 누락
- **M5** 죽은 지역 pill(모바일 `explore.tsx:48`, `onPress` 없음). *피드백 부재.* → 제거/연결.
- **M6** 하드코딩 목업("도윤"/"망원동", 웹 `web-shell.tsx:110-120`; "도윤" `data/opportunities.ts`). → 스토어 바인딩.
- **M7** 대표 원픽 CTA 영구 비활성(`ONE_PICK.ctaUrl:"#"`). → 실링크/교체.
- **M8** `alert()` 남용(위치·로그인·준비중). → 인라인/토스트(§3).
- **M9** explore/saved/detail 7상태 — 현재 목업 폴백으로 error/empty 도달 불가라 "불가능"으로 문서화(§4). 실데이터 연동 시 재오픈(설계 부채로 기록).
- **M10** 데스크탑 내비 하이라이트 오류 + 보관함/마이 진입점 부재. → active 정정 + 어포던스.
- **M11** 미완성 기능 정직화(하루 코스·알림 설정). → 출시 예정 인라인 상태.

### 🟡 Minor — 일관성 / 카피 잔재
- **m12** 탭 라벨/경로 불일치(`report` 경로 vs "홈" 라벨).
- **m13** 카피/주석 잔재(`globals.css` "긱·딜", `ui.tsx` "부업" JSDoc, `types.ts`/`view.ts` "벌이" 주석).
- **m14** 공유 프리미티브 미활용(모바일 인라인 StyleSheet 재구현).
- **m15** ad-hoc 타이포(웹 `text-[Npx]` 남발).

## 7. 화면 문서 링크

| 화면 | 파일 | 코드 |
|------|------|------|
| 온보딩/랜딩 | [screens/onboarding.md](screens/onboarding.md) | `/` |
| 동네 설정 | [screens/location.md](screens/location.md) | `/location` |
| 진단 | [screens/diagnosis.md](screens/diagnosis.md) | `/diagnosis` |
| 동네 리포트(원픽) | [screens/report.md](screens/report.md) | `/report` |
| 활동 상세 | [screens/opportunity.md](screens/opportunity.md) | `/opportunity` |
| 탐색 | [screens/explore.md](screens/explore.md) | `/explore` |
| 보관함 | [screens/saved.md](screens/saved.md) | `/saved` |
| 마이 | [screens/my.md](screens/my.md) | `/my` |
