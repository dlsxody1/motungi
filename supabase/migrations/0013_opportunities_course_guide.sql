-- 걷기길(trail) 코스 안내 컬럼.
--
-- 두루누비 courseList는 이미지 필드가 없어 trail 30건은 image_url이 전량 null이다.
-- 대신 시점·종점·교통편(travelerinfo), 소요시간(crsTotlRqrmHour), 순환여부(crsCycle)가
-- 수도권 19건 100% 채워져 오는데 어댑터가 전부 버리고 있었다 → 사진 없는 카드를
-- "어디서 시작해 어떻게 가는지"로 대신 채운다.
--
-- gpx_url은 cta_url과 분리한다: 지금은 cta_url이 GPX 파일이라 "보러 가기"가
-- 파일 다운로드가 돼버린다. 경로 렌더는 gpx_url, 바로가기는 cta_url로 역할을 나눈다.
--
-- 전부 nullable · additive · 비파괴 — 기존 519행과 trail 아닌 소스는 영향 없음.
alter table public.opportunities
  add column if not exists course_start text,
  add column if not exists course_end text,
  add column if not exists course_notes text,
  add column if not exists duration_min smallint,
  add column if not exists is_loop boolean,
  add column if not exists gpx_url text;

comment on column public.opportunities.course_start is '코스 시점 + 대중교통 안내 (두루누비 travelerinfo 파싱)';
comment on column public.opportunities.course_end is '코스 종점';
comment on column public.opportunities.course_notes is
  '시점/종점 형식이 아닌 주의사항(DMZ 코스의 민통선 신분증 등). 줄바꿈 구분. course_start와 배타적';
comment on column public.opportunities.duration_min is '총 소요시간(분)';
comment on column public.opportunities.is_loop is '순환형 코스 여부. 비순환형이면 종점에서 돌아와야 함';
comment on column public.opportunities.gpx_url is 'GPX 경로 파일 URL. /api/trail-route가 이 값만 fetch한다(SSRF 방지)';
