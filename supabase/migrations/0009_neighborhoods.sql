-- 동네(행정동) 마스터. 온보딩 화면의 5개 하드코딩을 대체 — 서울 전체 행정동을 검색·선택.
-- 활동(opportunities)은 동네로 필터링하지 않는다. 동네 선택은 오직 좌표(lat/lng) → 거리 점수로만
-- 작동하므로, 이 테이블의 핵심 임무는 "동마다 대표 좌표 하나".
--   coord_level: seed=실측(기존 5개) · sigungu=소속 구 중심 근사(베이스라인) · dong=동 실중심(후속)

create table public.neighborhoods (
  adm_code    text primary key,             -- 행정동 코드
  sido        text not null,                -- "서울특별시"
  sigungu     text not null,                -- "마포구"
  dong_name   text not null,                -- "망원동"
  lat         double precision not null,
  lng         double precision not null,
  coord_level text not null default 'sigungu'
    check (coord_level in ('seed', 'sigungu', 'dong')),
  geom        geography(Point, 4326)
);

-- 한글 부분검색(ILIKE '%동%') 가속용 trigram 인덱스.
create extension if not exists pg_trgm with schema extensions;
create index neighborhoods_dong_trgm_idx
  on public.neighborhoods using gin (dong_name extensions.gin_trgm_ops);
create index neighborhoods_sigungu_idx on public.neighborhoods (sigungu);

-- lat/lng → geom 동기화. 0004/0005의 opportunities 트리거와 동일 패턴(search_path 고정).
create or replace function public.sync_neighborhood_geom()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.lat is not null and new.lng is not null then
    new.geom := ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326)::geography;
  else
    new.geom := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_neighborhood_geom on public.neighborhoods;
create trigger trg_sync_neighborhood_geom
  before insert or update of lat, lng on public.neighborhoods
  for each row execute function public.sync_neighborhood_geom();

-- RLS: opportunities와 동일하게 공개 읽기(게스트 우선). 쓰기는 service role만.
alter table public.neighborhoods enable row level security;
create policy "neighborhoods readable by everyone"
  on public.neighborhoods for select using (true);
