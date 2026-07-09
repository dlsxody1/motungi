# 온보딩 / 랜딩 — `/`

## JTBD & 목적
첫 방문자가 "이게 나한테 뭘 해주는지" 3초 안에 이해하고, 60초 진단 플로우로 진입한다. 재방문자는 바로 리포트로.

## 레이아웃 & 위계
- **모바일**(`apps/web/src/app/page.tsx`, `apps/mobile/app/index.tsx`): 선셋 그라데이션 히어로 → "퇴근하고 뭐하지?" → 3개 가치 프롭 → 주 CTA "내 동네에서 찾기".
- **데스크탑**(`apps/web/src/components/web-landing.tsx`): 히어로(가짜 위치 검색 input = 실제 `/location` 링크) → 벤토 "왜 모퉁이" → 3스텝 → 카테고리 프리뷰 → 마감 CTA.

## 상태
- loaded만 존재(정적). empty/error 해당 없음 — 문서화로 충족.

## 결함 (심각도)
- **🔴 C1** 모바일 게스트 CTA "로그인 없이 바로 시작"이 `/report` 직행(`index.tsx:49`) → location·diagnosis 스킵, 폴백 목업 노출. **원픽 가치 붕괴** (Goal Gradient·Jakob). → `/location`으로 라우팅.
- 데스크탑 "가짜 검색 input"이 실제로 `<Link>`(`web-landing.tsx:96`): 포커스 시 입력 기대를 배신할 수 있음 — 시각적으로 링크/버튼임을 명확히(플레이스홀더 label 안티패턴 주의).

## UX 카피
- 히어로/가치프롭은 제품 플로우 밖이라 마케팅 카피 허용. 단 앱 화면 진입 후에는 홍보성 문구 금지(anti-pattern).
