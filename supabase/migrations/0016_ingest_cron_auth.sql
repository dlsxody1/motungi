-- M-026: ingest Edge Function이 인증 없이 SERVICE_ROLE 권한으로 트리거 가능하던 문제 수정.
-- Edge Function(index.ts)이 요청 헤더 x-cron-secret을 INGEST_CRON_SECRET(secret)과 비교하도록
-- 바뀌었으므로, pg_cron이 보내는 실제 요청에도 같은 헤더를 실어 보내도록 job을 갱신한다.
-- cron.schedule은 동일 job name('ingest-daily')이면 갱신(upsert)이라 0007의 job을 대체한다.
-- body의 seoulKey/dataGoKrKey는 제거했다 — Edge Function이 더 이상 body를 읽지 않고
-- SEOUL_OPENAPI_KEY/DATA_GO_KR_SERVICE_KEY를 자체 env(secret)에서만 읽는다(M-026 done_when #2).
--
-- ⚠️ 선행 조건(이 마이그레이션 전에 1회, 수동/MCP로 실행 — 키가 평문이라 파일에 안 남김):
--    select vault.create_secret('<임의의 긴 랜덤 문자열>', 'INGEST_CRON_SECRET');
--    -- 그리고 Edge Function 쪽에도 같은 값을 secret으로 등록:
--    --   supabase secrets set INGEST_CRON_SECRET=<같은 값>

select cron.schedule(
  'ingest-daily',
  '0 21 * * *',  -- 21:00 UTC = 06:00 KST
  $$
  select net.http_post(
    url := 'https://hvnksyorxzsocbbrylxb.supabase.co/functions/v1/ingest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_5YxeAnian5TYqh9BVlVDmw_GEZRcCVK',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'INGEST_CRON_SECRET')
    ),
    timeout_milliseconds := 120000
  );
  $$
);
