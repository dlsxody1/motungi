-- 적재 편의: Edge Function이 lat/lng를 직접 upsert하고, geom은 트리거가 자동 생성.
-- (JS 클라이언트로는 PostGIS 함수를 upsert에 직접 넣기 어려움 → lat/lng 컬럼 경유.)

alter table public.opportunities
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- lat/lng → geom(Point, 4326) 동기화 트리거.
create or replace function public.sync_opportunity_geom()
returns trigger
language plpgsql
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

drop trigger if exists trg_sync_opportunity_geom on public.opportunities;
create trigger trg_sync_opportunity_geom
  before insert or update of lat, lng on public.opportunities
  for each row execute function public.sync_opportunity_geom();
