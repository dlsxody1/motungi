-- 모퉁이 Corner — 초기 스키마 (v0 골격).
-- 실데이터/스코어링 확정 후 재보정 전제(§11).

-- 지오 쿼리용 (행정동·반경 필터, §9)
create extension if not exists postgis with schema extensions;

-- ── 기회 카테고리 / 소스 ─────────────────────────────
create type opportunity_category as enum (
  'side_job',     -- 부업
  'subsidy',      -- 지원금/청년정책
  'gig_deal',     -- 긱·딜
  'class_talent', -- 클래스·재능
  'space_used'    -- 공간·중고
);

create type source_kind as enum (
  'commercial_area', -- 소상공인 상권정보
  'youth_policy',    -- 온통청년 등
  'affiliate_feed'   -- 제휴 피드
);

-- ── 기회 캐시 (배치 적재, §7) ────────────────────────
create table public.opportunities (
  id             uuid primary key default gen_random_uuid(),
  source         source_kind not null,
  category       opportunity_category not null,
  external_id    text,                       -- 소스측 원본 ID (중복 방지)
  title          text not null,
  summary        text not null,
  estimated_income_krw integer,
  difficulty     real check (difficulty between 0 and 1),
  adm_code       text,                        -- 행정동 코드
  dong_name      text,
  geom           geography(Point, 4326),      -- 위치
  cta_url        text,
  deadline       date,
  source_label   text,                        -- 출처·갱신일 표기(§8)
  fetched_at     timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  unique (source, external_id)
);

create index opportunities_geom_idx on public.opportunities using gist (geom);
create index opportunities_category_idx on public.opportunities (category);
create index opportunities_adm_code_idx on public.opportunities (adm_code);

-- ── 사용자 프로필 (게스트→가입 승격, §5) ───────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  home_adm_code text,      -- 내 동네
  home_dong_name text,
  created_at   timestamptz not null default now()
);

-- ── 저장함 (보관/마이, §5) ──────────────────────────
create table public.saved_opportunities (
  user_id        uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  saved_at       timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

-- ── RLS: 개인정보 최소·본인만 접근(§8) ─────────────────
alter table public.profiles enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.opportunities enable row level security;

-- 기회 캐시는 공개 읽기(게스트 우선), 쓰기는 service role만.
create policy "opportunities are readable by everyone"
  on public.opportunities for select
  using (true);

create policy "own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "own saved items"
  on public.saved_opportunities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
