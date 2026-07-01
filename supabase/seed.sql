-- 로컬 개발용 시드 (더미). 실데이터 연동 전 화면 확인용.
insert into public.opportunities
  (source, category, title, summary, estimated_income_krw, difficulty, dong_name, geom, source_label)
values
  ('affiliate_feed', 'side_job', '주말 카페 서포트', '토·일 4시간, 망원동 인근', 320000, 0.2,
   '망원동', st_point(126.9101, 37.5563)::geography, '제휴 피드 · 2026-07-01'),
  ('youth_policy', 'subsidy', '청년 자산형성 지원', '거주지·소득 요건 확인 필요', 500000, 0.4,
   '망원동', st_point(126.9101, 37.5563)::geography, '온통청년 · 2026-07-01');
