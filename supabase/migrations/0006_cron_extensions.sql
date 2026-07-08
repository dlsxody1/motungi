-- 적재 자동화용 확장: pg_cron(스케줄) + pg_net(HTTP 요청).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
