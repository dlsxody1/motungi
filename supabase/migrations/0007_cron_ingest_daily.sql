-- 매일 06:00 KST(21:00 UTC) 적재 자동 실행.
-- Vault에서 공공 키를 복호화해 ingest Edge Function을 body와 함께 호출.
-- anon(publishable) 키는 공개 키라 인라인(함수는 verify_jwt=false).
--
-- ⚠️ 선행 조건(이 마이그레이션 전에 1회, 수동/MCP로 실행 — 키가 평문이라 파일에 안 남김):
--    select vault.create_secret('<SEOUL_OPENAPI_KEY>', 'SEOUL_OPENAPI_KEY');
--    select vault.create_secret('<DATA_GO_KR_SERVICE_KEY>', 'DATA_GO_KR_SERVICE_KEY');

select cron.schedule(
  'ingest-daily',
  '0 21 * * *',  -- 21:00 UTC = 06:00 KST
  $$
  select net.http_post(
    url := 'https://hvnksyorxzsocbbrylxb.supabase.co/functions/v1/ingest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_5YxeAnian5TYqh9BVlVDmw_GEZRcCVK'
    ),
    body := jsonb_build_object(
      'seoulKey', (select decrypted_secret from vault.decrypted_secrets where name = 'SEOUL_OPENAPI_KEY'),
      'dataGoKrKey', (select decrypted_secret from vault.decrypted_secrets where name = 'DATA_GO_KR_SERVICE_KEY')
    ),
    timeout_milliseconds := 120000
  );
  $$
);
