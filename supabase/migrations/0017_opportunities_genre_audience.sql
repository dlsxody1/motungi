-- 장르(genre) + 관람 대상(audience) 컬럼 추가.
--
-- 문제: 문화 어댑터가 전 행에 category='culture'를 박아 넣어 "어린이 여름 독서교실"과
-- "저녁 클래식 공연"이 스코어링상 완전히 동일했다. 장르(CODENAME/realmName)는 summary
-- 문자열 3번째 조각으로만 남아 필터·스코어에 쓸 수 없었고, 관람 대상은 아예 어디에도
-- 저장되지 않았다(서울시 문화행사 USE_TRGT는 실응답에 100% 오는데 매핑에서 누락).
--
-- 그 결과 "신정동 · 문화공연 · 주말 · 방전형" 진단의 원픽이
-- [마포구립서강도서관] 어린이 여름 독서교실(10~12시)이었다.
--
-- additive · nullable · 비파괴. 재적재 전까지 null이 정상이므로 소비 측(isKidsOnly)은
-- null을 반드시 통과시킨다 — 미상을 제외하면 카탈로그가 통째로 빈다.

alter table public.opportunities
  add column if not exists genre text,
  add column if not exists audience text;

comment on column public.opportunities.genre is
  '원본 장르 문자열. seoul_culture=CODENAME(교육/체험·전시/미술·콘서트…), culture_info=realmName. 소스별 어휘가 달라 통합 enum은 시기상조 — 원문 보존.';

comment on column public.opportunities.audience is
  '관람/참여 대상 원문. seoul_culture=USE_TRGT(실측 채움률 100%). null=미상이며 "성인 가능"으로 취급한다(모르는 걸 배제하지 않는다).';

-- genre 백필: summary가 "구 · 장소 · 장르" 3조각 조인이라 조각 수가 정확히 3인 행만
-- 안전하게 되돌릴 수 있다(실측 445건 중 428건). 나머지 17건은 장소·장르가 비어
-- 조각 수가 어긋난 행이라 건드리지 않고 재적재에 맡긴다.
update public.opportunities
set genre = nullif(btrim(split_part(summary, ' · ', 3)), '')
where source in ('seoul_culture', 'culture_info')
  and genre is null
  and array_length(string_to_array(summary, ' · '), 1) = 3;

-- audience는 백필 불가 — USE_TRGT가 DB에 저장된 적이 없다. 재적재만이 경로다.
-- 그때까지는 isKidsOnly의 제목 폴백이 대신 막는다(실측 culture 23건 적중).

create index if not exists opportunities_genre_idx
  on public.opportunities (genre)
  where genre is not null;
