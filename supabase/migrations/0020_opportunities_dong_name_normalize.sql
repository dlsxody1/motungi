-- dong_name 표기 정규화 백필 (M-098).
--
-- 문제: 적재 소스가 표기를 통일하지 않아 같은 구가 "종로구"와 "서울 종로구"로 분열돼
-- 있다(0018 주석에서도 이미 확인됨 — 종로구 288행 · 서울 종로구 242행). 이 마이그레이션은
-- 기존 행을 한 번 정리하는 백필일 뿐이다 — 다음 적재가 다시 원본 표기로 덮어쓰면 재오염
-- 되므로, ingest Edge Function의 upsertRows()(M-098, supabase/functions/ingest/index.ts)도
-- 최종 payload에서 동일 규칙으로 정규화해 이후 적재분이 이 값을 다시 흩어놓지 않게 한다.
--
-- 규칙은 core view.ts의 normalizeGu, gu-fallback.ts의 (이제 export된) normalizeGu와
-- 동일: 시/도 접두어("서울특별시/서울/경기도/경기/인천광역시/인천")만 걷어낸다.
--
-- ⚠️ 알려진 한계(신규 리스크 아님): 이 접두사 제거만으로는 "인천 중구"와 "서울 중구"가
-- 둘 다 "중구"로 합쳐진다 — 인천·서울 모두 실제로 "중구"라는 자치구를 갖고 있기 때문이다
-- (다른 서울/인천 구 이름은 겹치지 않는다). 이건 이 마이그레이션이 새로 만드는 위험이
-- 아니라, 0018의 백필 UPDATE와 gu-fallback.ts의 applyGuCoordFallback이 매칭용으로 이미
-- 똑같이 접두사를 벗기며 감수하던 것과 같은 위험군이다. 여기서 방어적 재구분 로직을
-- 추가하지 않는다(architect 결정) — 필요해지면 별도 이슈로 다룬다.
update public.opportunities
set dong_name = btrim(regexp_replace(dong_name, '^(서울특별시|서울|경기도|경기|인천광역시|인천)\s+', ''))
where dong_name ~ '^(서울특별시|서울|경기도|경기|인천광역시|인천)\s+';
