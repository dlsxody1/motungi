-- 활동 대표 이미지(썸네일) 복원.
-- 공공 API 응답(서울시 문화행사 MAIN_IMG · 한눈에보는문화정보 thumbnail)엔 이미지 URL이
-- 오지만 그동안 어댑터 매핑에서 버려졌다. 끝단(DB)부터 실어 나르도록 컬럼을 추가한다.
--
-- nullable · 기본값 없음 → 즉시 적용, 테이블 락 없음, forward-only. 백필은 적재 시 자연 채움.
alter table public.opportunities
  add column if not exists image_url text;
