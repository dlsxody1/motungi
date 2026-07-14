# 이력서 매핑 — 모퉁이(Corner)에서 FE 8축 실증하기

> 목적: "구현했다"가 아니라 **"시니어가 보는 축에서 의사결정을 했다"**를 이 프로젝트로 증명한다.
> 키워드 8축 원본: `~/.claude` memory `resume-keywords-fe`. 이 문서는 그 축을 motungi 현 자산에 매핑한 것.
> 관통 규칙: **문제 인식 → 대안 비교 → 의사결정(트레이드오프) → 구현 → 계측/검증**. 이력서엔 최소 문제·의사결정·검증 3개가 보여야 한다.

---

## A. 지금 당장 쓸 수 있는 것 (자산 = 실제 구현됨)

각 항목은 "근거 코드 → 이력서 문장 초안" 형식. 문장은 그대로 쓰기보단 수치를 채워 다듬을 것.

### 축1·2 — 아키텍처 / 모듈 경계 ✅
- **근거**: `packages/core`가 React/Next 의존 0으로 web(Next15)·mobile(Expo52) 양쪽에서 동일 import. types→diagnosis→scoring→adapters→view 단방향 배럴 export.
- **문장 초안**: "web/mobile 간 도메인 로직 중복을 제거하기 위해 플랫폼 독립 코어 패키지(`@motungi/core`)를 분리, 의존성 방향을 core→app 단방향으로 강제(core는 UI 프레임워크 의존 0). 진단·스코어링 로직 변경이 한 곳 수정으로 양 플랫폼에 반영."
- **주의**: "FSD 적용"이라고 쓰면 과장(레이어 경계 규칙 없음). "도메인 코어 공유 패턴"이 정확.

### 축3·4 — 비동기 / 에러 처리 ✅
- **근거**: `data/opportunities.ts`가 throw 대신 `CatalogStatus` union(`ok/empty/error/unconfigured`) 반환 → UI가 상태별 분기.
- **문장 초안**: "데이터 페칭 실패를 예외 throw가 아닌 상태 union으로 모델링(ok/empty/error/unconfigured)해, 빈 결과·설정 누락·네트워크 오류를 UI에서 별도 폴백으로 분기. try-catch 산발을 없애고 로딩·에러 UI를 상태 기반으로 일원화."

### 축4 — 배포 파이프라인 / 인프라 ✅ (트레이드오프 서사)
- **근거**: 스케줄 적재를 GitHub Action(`.github/workflows/ingest.yml`, `if:false`)에서 Supabase pg_cron(`migrations/0007`, `cron.schedule`+`net.http_post`+Vault 키 복호화)으로 이관. CI(`ci.yml`)는 typecheck+test 게이트로 실동작.
- **문장 초안**: "일일 적재 스케줄러를 GitHub Actions에서 Supabase pg_cron으로 이관 — Action 러너 콜드스타트/시크릿 노출/DB 왕복 대신, DB 인접 실행 + Vault 키 복호화로 지연·시크릿 표면을 축소. CI는 typecheck+단위테스트를 머지 게이트로 강제."

### 보안 — 시크릿 경계 설계 ✅ (강력)
- **근거**: 외부 키(NAVER/Kakao/data.go.kr)를 웹 `/api/geo` Route Handler로 프록시(입력 검증 + 502/503/404/400 세분화 + 24h revalidate), Supabase는 publishable/secret 키 체계.
- **문장 초안**: "외부 지오코딩/공공데이터 API 키를 클라이언트에 노출하지 않도록 Next Route Handler·Supabase Edge Function을 서버 프록시로 두고, 입력 검증과 상태코드 세분화(400/404/502/503) + 24h 캐시 revalidate를 적용."

### 축6 — 디자인 시스템 ✅
- **근거**: `packages/tokens`(148줄, 값 채워짐) — 8pt space·radius·WCAG AA 대비 주석 color·typography·`MIN_HIT_TARGET=44`. web(Tailwind v4)·mobile(theme.ts)이 단일 소스 참조.
- **문장 초안**: "디자인 토큰을 단일 패키지로 두고 web(Tailwind CSS 변수)·mobile(RN StyleSheet)에 동일 소스로 배포. 접근성 기준(WCAG AA 대비, 44pt 최소 터치 타깃)을 토큰 레벨에 못박아 플랫폼 간 시각 일관성 확보."
- **주의**: 공용 컴포넌트 라이브러리는 없음(앱별 프리미티브). "토큰 공유, 컴포넌트는 앱별"이 정확.

### 축7 — 데이터 정규화 어댑터 ✅
- **근거**: `packages/core/src/adapters/` 6종 — 외부 공공데이터 `Raw*` → 공용 `Opportunity` 타입 정규화, 각각 단위테스트. XML 경량 파서·수도권 필터·소스별 try/catch 격리.
- **문장 초안**: "서로 다른 6개 공공데이터 소스의 이질적 응답을 어댑터 패턴으로 단일 `Opportunity` 도메인 타입으로 정규화, 소스별 파싱 실패를 격리(한 소스 오류가 전체 적재를 막지 않음). 어댑터별 단위테스트로 스키마 변경 회귀 방어."

---

## B. 채우면 임팩트 큰 갭 (우선순위 = 멘토 조언 겹침 순)

### 1순위 — LLM/RAG 추천 (축8) · 차별화 최대 / 난이도 최대
- **현 상태**: 추천은 규칙 기반 가중합(`scoring.ts`: fit·distance·time·difficulty·cost 5축). LLM/RAG/embedding 전무.
- **서사 설계** (멘토가 콕 집은 지점):
  - *왜 LLM?* — 규칙 스코어링은 "왜 이걸 추천했는지" 설명·자연어 질의("비 오는 날 실내 조용한 데")를 못 함 → 개인화·설명가능성 한계.
  - *왜 단순 프롬프트가 아니라 RAG?* — 활동 카탈로그가 수시로 바뀌고(적재), 컨텍스트 윈도우에 다 못 넣음 → pgvector 임베딩 검색으로 후보 축소 후 LLM에 전달.
  - *FE가 맡은 것* — 스트리밍 UX(첫 토큰 지연 은폐), 토큰 예산 관리, 진단 답변→쿼리 컨텍스트 조립, 실패 시 규칙 기반 폴백.
- **구현 스케치**: Supabase `pgvector` + 활동 임베딩 → Edge Function이 진단 결과로 유사 검색 → 상위 N개를 LLM(설명 생성)에 전달 → 웹에서 스트리밍 렌더. **규칙 스코어링을 폴백/재랭킹으로 유지**하면 "왜 하이브리드인가" 의사결정 서사까지 확보.

### 2순위 — 서빙 / 렌더링 전략 (축5) · 필수 키워드 / 중간 난이도
- **현 상태**: Vercel 설정 파일 없음, 화면별 렌더링 전략 불명.
- **할 일**: 랜딩=SSG, 탐색 피드=ISR(revalidate 근거), 개인화 리포트=CSR/SSR 스트리밍으로 분리하고 **각 선택의 근거를 문서화**. `vercel.json` 정비.

### 3순위 — 테스트 체계 (축7) · 신뢰도 서사 / 낮은 난이도
- **현 상태**: `packages/core`만 단위테스트(7파일 ~61케이스). 앱 UI/E2E 0. RTL·Playwright skill은 이미 설치됨.
- **할 일**: 핵심 플로우(60초 진단→원픽) Playwright E2E 1개 + 상태 union 분기(empty/error) RTL 컴포넌트 테스트. 커버리지 게이트를 CI에 추가.

### 4순위 — 데이터 페칭 추상화 (축2) · 의사결정 서사
- **현 상태**: react-query 없이 Zustand 세션 캐시 + `useEnsureCatalog` 수동 관리.
- **할 일**: react-query 도입 **또는** 미도입을 명시적 트레이드오프로 서술("정적에 가까운 카탈로그라 세션 persist로 충분 vs 재검증·경합 처리는 라이브러리가 유리"). 도입 시 서버상태/클라상태 경계를 명확히.

---

## 다음 액션
어느 갭을 실제로 구현할지 정하면 그 축에 대해 단계별 실행 계획을 세운다. 1순위(LLM/RAG)가 이력서 임팩트가 가장 크고 멘토 조언과 정확히 겹친다.
