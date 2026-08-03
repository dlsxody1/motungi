-- 동네 검색 정상화 — 법정동명으로 검색해도 번호 붙은 행정동이 잡히게 한다.
--
-- 문제: 테이블은 행정동명을 저장한다(역삼1동·역삼2동·신사제1동·상계3·4동).
-- 사용자는 법정동명(역삼동)을 친다. ILIKE '%역삼동%'는 숫자를 건너뛰지 못해 0건이 되고,
-- 426개 행정동 중 274개(64%)가 검색으로 도달 불가였다. (placeholder의 "예: 역삼동"조차 0건이었다.)
--
-- 와일드카드 트릭('%역삼%동%')은 기각: 짧은 이름에서 오탐이 심하다.
--   중동 → 13건(송중동·중림동·중앙동…) · 상동 → 17건(상계동·상암동·상일동…)
-- 숫자와 '제'를 제거한 정규화 컬럼으로 비교하면 중동 → 1건, 상동 → 0건으로 정확해진다.
--
-- 추가 전용(add-only) — 기존 컬럼·데이터를 건드리지 않는다.

alter table public.neighborhoods
  add column if not exists dong_base text
  generated always as (regexp_replace(dong_name, '제?[0-9]+(·[0-9]+)*', '', 'g')) stored;

comment on column public.neighborhoods.dong_base is
  '검색용 정규화 동 이름 — 숫자·제·중점 제거(역삼1동→역삼동, 상계3·4동→상계동). 검색은 이 컬럼을 본다.';

-- 정규화 컬럼 부분검색 가속. 0009와 동일하게 extensions 스키마로 한정한다.
create index if not exists neighborhoods_dong_base_trgm_idx
  on public.neighborhoods using gin (dong_base extensions.gin_trgm_ops);
