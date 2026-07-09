# 보관함 — `/saved`  · [탭]

## JTBD & 목적
관심 있어 저장한 활동을 다시 찾아본다.

## 레이아웃 & 위계
헤더 → (모바일)재진단 배너 → 저장 리스트(인라인 보관 토글). `savedIds` → catalog/findOpportunity 해소.

## 상태
- **empty 잘 설계됨** ✅ (북마크 아이콘 + "아직 저장한 활동이 없어요" + "둘러보기" CTA → /explore).
- **loading/error 부재**: 서버 pull(`pullSavedFromServer`) 시 상태 필요 — 결함 M9.

## 결함 (심각도)
- **🟠 M9** 서버 동기화 로딩/실패 상태 추가.
- **🟠 M10**(웹) 데스크탑에서 `active="explore"` 전달 → 내비 하이라이트 오류. 보관함 진입점은 앱 내비 북마크 아이콘뿐. → active="saved" 정정 + 어포던스.
- **접근성**(웹): 보관 토글 `role="button"` span — 포커스/키보드 핸들러 확인(존재 시 유지).

## UX 카피
- empty CTA "둘러보기" 구체적 동사 ✅.
