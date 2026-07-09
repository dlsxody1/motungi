-- 워크넷 채용정보목록/상세 API가 개인회원 이용 불가(민간 직업정보제공사업 신고 필요)로 확인됨.
-- → 서울시 일자리플러스센터(서울 열린데이터광장 OA-13341, 개인 발급 가능)로 대체.
-- source_kind enum에 'seoul_jobs' 추가 (side_job/gig_deal 카드 본체 소스).

alter type source_kind add value if not exists 'seoul_jobs';
