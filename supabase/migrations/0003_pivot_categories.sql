-- 기획 피벗: "일자리·수익" → "퇴근하고 뭐하지?"(동네 문화·여가 큐레이션).
-- docs/PIVOT-afterwork.md · docs/API-DESIGN.md §5.
--
-- 전략(무중단): Postgres enum은 값 삭제/재정렬이 까다로우므로 옛 값은 남기고 신규 값만 추가한다.
-- 새 데이터는 신규 값만 사용하고, seed.sql을 문화·여가 예시로 교체한다.
-- (옛 값 subsidy/gig_deal 등은 코드에선 더 이상 참조하지 않음 — 잔존해도 무해.)
--
-- ⚠️ ALTER TYPE ... ADD VALUE 는 트랜잭션 블록에서 새 값을 즉시 사용할 수 없다.
--    이 파일은 enum 확장 + 컬럼 변경만 하고, 신규 값을 쓰는 INSERT 는 seed.sql(별도)에서 수행.

-- ── 활동 카테고리 확장 ───────────────────────────────
alter type opportunity_category add value if not exists 'culture'; -- 공연·전시
alter type opportunity_category add value if not exists 'active';  -- 운동·산책·걷기길
alter type opportunity_category add value if not exists 'class';   -- 클래스·배움
alter type opportunity_category add value if not exists 'food';    -- 먹거리·맛집
alter type opportunity_category add value if not exists 'market';  -- 마켓·플리마켓
-- 유지: side_job (퇴근후 파트/단기, 보조). 미사용 잔존: subsidy, gig_deal, class_talent, space_used.

-- ── 데이터 소스 확장 ─────────────────────────────────
alter type source_kind add value if not exists 'seoul_culture';   -- 서울시 문화행사(1순위)
alter type source_kind add value if not exists 'culture_info';    -- 한눈에보는문화정보(data.go.kr)
alter type source_kind add value if not exists 'sports_facility'; -- 공공체육시설(data.go.kr)
alter type source_kind add value if not exists 'trail';           -- 두루누비 걷기길(data.go.kr)
-- 유지: seoul_jobs, commercial_area. 미사용 잔존: youth_policy, affiliate_feed.

-- ── 수익 → 비용 의미 전환 ────────────────────────────
-- estimated_income_krw(예상 수익) → cost_krw(참가/이용 비용, 0=무료).
-- side_job 만 예외적으로 벌이(income) 성격 — 애플리케이션 레이어에서 카테고리로 분기 표기.
alter table public.opportunities
  rename column estimated_income_krw to cost_krw;

-- ── 활동 시간대 메타 (스코어링 time 축) ────────────────
-- 퇴근후 18~22시 겹침 가점에 사용. 24시간제, NULL 허용.
alter table public.opportunities
  add column if not exists time_start_hour smallint check (time_start_hour between 0 and 24),
  add column if not exists time_end_hour   smallint check (time_end_hour between 0 and 24);

-- ── 위치 앵커 2개(집·회사) 프로필 확장 ──────────────────
-- 공간 축은 집+회사 두 앵커의 min 거리 → 회사 앵커 컬럼 추가.
alter table public.profiles
  add column if not exists work_adm_code  text,
  add column if not exists work_dong_name text;
