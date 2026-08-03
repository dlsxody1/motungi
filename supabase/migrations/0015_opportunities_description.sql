-- 활동 설명 원문(description) 컬럼.
--
-- 왜 필요한가: `summary`는 문장이 아니라 메타데이터 조인 문자열이다
-- (adapters.ts의 `[GUNAME, PLACE, CODENAME].join(" · ")` → "강동구 · 강동아트센터 · 콘서트").
-- 그래서 "비 오는 날 실내에서" 같은 자연어 질의는 구조적으로 0건이 나온다 —
-- 검색 알고리즘 문제가 아니라 색인할 산문이 애초에 없는 것이다.
--
-- 원문은 이미 API 응답에 오는데 어댑터가 버리고 있었다. 실측(2026-08-03):
--   trail        30행  crsSummary·crsContents·crsTourInfo·travelerinfo  fill 100% (목록 응답에 포함)
--   seoul_culture 282행 PROGRAM fill 14% · ETC_DESC 3.3% · PLAYER 11.3%
--   culture_info 154행  목록 응답에 산문 필드 자체가 없음(12필드 전부 메타데이터)
--
-- culture_info를 채우려면 seq당 detail2 1회 = 약 1200회 추가 호출이 필요한데,
-- 50회 연속 호출만으로 LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR가 떴다.
-- → 이번 마이그레이션 범위 밖. 별도 백필 배치 이슈로 분리한다(재시도·이어받기 필요).
--
-- 따라서 이 컬럼은 처음부터 "일부만 채워지는" 전제로 쓴다. 소비 측(검색·LLM)은
-- description이 null인 행을 정상 케이스로 다뤄야 한다.
--
-- nullable · additive · 비파괴 — 기존 466행과 컬럼을 안 쓰는 코드 경로는 영향 없음.
alter table public.opportunities
  add column if not exists description text;

comment on column public.opportunities.description is
  '활동 설명 원문(산문). summary(메타데이터 조인 문자열)와 별개 — 자연어 검색·LLM 근거 생성용. '
  '소스별 채움률이 크게 달라 null이 정상이다: trail 100%, seoul_culture 약 20%, culture_info 0%(상세 API 백필 필요).';
