-- 좌표 정밀도 표식 + 구 중심좌표 폴백 백필.
--
-- 문제: 반경 필터(core/catalog.ts)는 lat/lng만 읽으므로 좌표가 없는 행은 "근처"일 수
-- 없어 통째로 탈락한다. 실측(2026-09-03) 520행 중 125행이 좌표 없음이고, 그중 53행
-- (seoul_jobs 49 · culture_info 4)은 dong_name이 서울 구로 매칭돼 구 중심좌표라도
-- 줄 수 있다. 나머지 72행은 서울 밖이라 neighborhoods(서울 426동 전용)로 못 고친다 —
-- 좌표를 지어내지 않고 그대로 둔다.
--
-- 왜 adm_code 백필이 아닌가: adm_code는 실제 행정동 코드가 아니라 'SEO-<구>-<동>'
-- 대체키(0010)인데 opportunities.dong_name은 구 단위라 동을 특정할 수 없다. 게다가
-- adm_code는 어느 읽기 경로도 소비하지 않는다 — 거리 계산이 쓰는 건 lat/lng다.

-- 1) 정밀도 표식. 'sigungu' = 구 중심 근사(동 단위 아님), null = 소스 원본 좌표.
--    neighborhoods.coord_level과 같은 어휘를 쓴다(0009).
alter table public.opportunities
  add column if not exists coord_level text;

comment on column public.opportunities.coord_level is
  '좌표 정밀도. null=소스 원본 좌표, ''sigungu''=구 중심 폴백(0018). 동 단위 좌표 확보 시 이 표식으로 갱신 대상을 찾는다.';

-- 2) 구별 중심좌표 = 그 구에 속한 동 좌표의 평균.
--    neighborhoods 426행 중 418행이 이미 구 중심을 공유하므로(coord_level='sigungu')
--    실제로는 대부분 같은 값의 평균이다. 동 단위 좌표가 채워지면(M-076) 이 평균이
--    자연스럽게 진짜 구 중심으로 수렴한다.
--
--    매칭은 시도 접두사를 벗겨서 한다 — 적재 소스가 표기를 통일하지 않아 같은 구가
--    '종로구'(288행)와 '서울 종로구'(242행)로 분열돼 있다. core view.ts의
--    normalizeGu와 같은 규칙을 유지할 것.
with gu_centroids as (
  select sigungu,
         avg(lat) as lat,
         avg(lng) as lng
  from public.neighborhoods
  where lat is not null and lng is not null
  group by sigungu
)
update public.opportunities o
set lat = c.lat,
    lng = c.lng,
    coord_level = 'sigungu'
from gu_centroids c
where o.lat is null
  and o.lng is null
  and o.dong_name is not null
  and btrim(regexp_replace(o.dong_name, '^(서울특별시|서울|경기도|경기|인천광역시|인천)\s+', '')) = c.sigungu;

-- 3) 좌표 필터는 lat/lng 스칼라 비교를 쓰는데(catalog.ts boundingBox) 인덱스가 없었다.
--    geom GiST 인덱스(0001)는 읽기 경로가 geom을 안 써서 미사용 상태다.
create index if not exists opportunities_lat_lng_idx
  on public.opportunities (lat, lng)
  where lat is not null and lng is not null;
