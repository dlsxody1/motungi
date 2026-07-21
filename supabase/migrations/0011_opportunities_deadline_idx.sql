-- 마감(deadline) 기준 서버 필터·정렬·정리 성능. 카탈로그 조회가 이제
-- "deadline is null or >= today" 필터 + deadline 임박순 정렬을 하고, ingest가 매일
-- 마감 지난 row를 삭제(deadline < today)한다 — 이 인덱스가 그 경로들을 받친다.
-- additive · 비파괴.
create index if not exists opportunities_deadline_idx
  on public.opportunities (deadline);
