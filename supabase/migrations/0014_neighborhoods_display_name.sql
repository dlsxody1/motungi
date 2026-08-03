-- 동네 표시용 이름 — 사용자가 말하는 단위로 보여준다.
--
-- 행정동은 행정 편의로 쪼갠 단위라 "개포1동·개포2동·개포3동·개포4동"처럼 나열된다.
-- 사용자는 그냥 "개포동"에 산다고 말하지, 몇 동인지로 동네를 고르지 않는다.
-- 0012의 dong_base는 검색 매칭용이라 '가'가 남는 문제(금호1가동 → 금호가동)가 있어,
-- 표시 전용 컬럼을 따로 둔다.
--
-- 정규화 규칙(두 단계):
--   1) 숫자 + 선택적 '제'/중점/'가' 제거 : 금호1가동→금호동, 성수1가제1동→성수동, 상계3·4동→상계동
--   2) 끝의 '본동' → '동'              : 중계본동→중계동, 일원본동→일원동
-- 검증: 426행 → 235그룹, 빈 값 0, '동'으로 안 끝나는 값 0,
--       한 그룹 내 좌표 불일치 0(같은 그룹은 좌표가 전부 동일 — 묶어도 잃는 정보가 없다).
-- 주의: 종로1·2·3·4가동 → '종로동', 용산2가동 → '용산동'은 실제 지명은 아니지만
--       235그룹 중 2건이고, 일관된 규칙이 예외 처리보다 낫다고 판단했다.
--
-- 추가 전용(add-only) — 기존 컬럼·데이터를 건드리지 않는다.

alter table public.neighborhoods
  add column if not exists dong_display text
  generated always as (
    regexp_replace(
      regexp_replace(dong_name, '제?[0-9]+(·[0-9]+)*(가)?', '', 'g'),
      '본동$', '동'
    )
  ) stored;

comment on column public.neighborhoods.dong_display is
  '표시용 동 이름 — 숫자·제·가·본 제거(개포1동→개포동, 금호1가동→금호동). 목록은 (sigungu, dong_display)로 묶어 보여준다.';

create index if not exists neighborhoods_dong_display_idx
  on public.neighborhoods (sigungu, dong_display);
