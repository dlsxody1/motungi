-- 로컬 개발용 시드 (더미). 실데이터 연동 전 화면 확인용.
-- "퇴근하고 뭐하지?" — 동네 문화·여가·활동 예시. cost_krw: 0=무료. side_job은 벌이 성격.
insert into public.opportunities
  (source, category, title, summary, cost_krw, difficulty, dong_name, geom,
   time_start_hour, time_end_hour, source_label)
values
  ('seoul_culture', 'culture', '망원 한강 야간 재즈 소품 공연',
   '퇴근길에 20분, 무료 야외 공연', 0, 0.1,
   '망원동', st_point(126.9101, 37.5563)::geography, 19, 21, '서울시 문화행사 · 2026-07-01'),
  ('trail', 'active', '경의선숲길 저녁 산책 코스',
   '연남~홍대, 조명 켜진 3km 걷기길', 0, 0.2,
   '연남동', st_point(126.9250, 37.5600)::geography, 18, 22, '두루누비 · 2026-07-01'),
  ('seoul_jobs', 'side_job', '주말 오전 동네 카페 파트',
   '토·일 4시간, 망원동 인근', 480000, 0.3,
   '망원동', st_point(126.9101, 37.5563)::geography, 9, 13, '서울시 일자리플러스센터 · 2026-07-01');
