-- KOPIS(공연예술통합전산망)를 source_kind에 추가한다.
--
-- 왜: seoul_culture는 공공 주최 행사 위주라 소극장 연극·클래식·재즈 같은 민간 공연이
-- 통째로 빠져 있었다("퇴근하고 뭐하지"의 1픽에 가장 맞는 물건이 없었다).
-- 실측(2026-09-03, 서울 signgucode=11, 31일치): 공연 300건 · 공연장 61곳 전부 좌표 확보.
--
-- 이 값이 없으면 ingest의 upsert가 enum 위반으로 통째로 실패한다.
-- add value는 기존 값을 건드리지 않는 additive 변경이다(파괴적 SQL 아님).
alter type source_kind add value if not exists 'kopis';  -- KOPIS 공연예술통합전산망
