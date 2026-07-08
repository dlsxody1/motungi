-- 보안 advisor 권고(function_search_path_mutable): 함수 search_path 고정(injection 방어).
-- PostGIS 함수는 extensions 스키마에 있으므로 함께 포함.
create or replace function public.sync_opportunity_geom()
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
