-- community_post 인덱스를 커서 컬럼(id)에 맞게 교체하는 런북
--
-- 배경
--   목록 조회는 createdAt 이 아니라 id 로 정렬/커서를 잡는다(무한 스크롤).
--   그런데 기존 인덱스는 뒷자리가 createdAt 이라 정렬에 인덱스를 쓰지 못하고 filesort 가 발생했다.
--   인기순은 likeCount 로 정렬하는데 해당 인덱스가 아예 없었다.
--
-- 왜 수동 실행인가
--   ddl-auto: update 는 새 인덱스를 만들어 주지만 <b>기존 인덱스를 지우지 않는다</b>.
--   교체된 인덱스를 그대로 두면 쓰기마다 불필요한 인덱스 유지 비용이 계속 발생하므로 직접 제거한다.
--
-- 실행 순서
--   1) 애플리케이션을 배포한다 (Hibernate 가 새 인덱스를 생성)
--   2) 아래 확인 쿼리로 새 인덱스 4개가 만들어졌는지 본다
--   3) DROP 문을 실행해 옛 인덱스를 제거한다
--
-- 주의
--   community_post 행이 많아지면 인덱스 생성이 오래 걸린다. 트래픽이 적은 시간대에 수행한다.

-- ── 1. 현재 인덱스 확인 ────────────────────────────────────────────────
SELECT INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'community_post'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- ── 2. 새 인덱스가 없다면 직접 생성 (배포로 생성됐으면 생략) ─────────────
-- CREATE INDEX idx_community_post_target_status_id
--     ON community_post (target_type, target_code, status, id);
-- CREATE INDEX idx_community_post_member_id_id
--     ON community_post (member_id, id);
-- CREATE INDEX idx_community_post_status_id
--     ON community_post (status, id);
-- CREATE INDEX idx_community_post_status_like_count_id
--     ON community_post (status, like_count, id);

-- ── 3. 교체된 옛 인덱스 제거 ───────────────────────────────────────────
-- 새 인덱스 4개가 확인된 뒤에 실행한다.
ALTER TABLE community_post DROP INDEX idx_community_post_target_type_target_code_created_at;
ALTER TABLE community_post DROP INDEX idx_community_post_member_id_created_at;
ALTER TABLE community_post DROP INDEX idx_community_post_status_created_at;

-- ── 4. 검증 ───────────────────────────────────────────────────────────
-- 게시판 목록이 filesort 없이 인덱스로 정렬되는지 확인한다.
-- Extra 에 "Using filesort" 가 사라지고 key 에 새 인덱스가 잡히면 성공이다.
EXPLAIN
SELECT * FROM community_post
WHERE target_type = 'COMMERCIAL' AND target_code = '3110008' AND status = 'ACTIVE'
ORDER BY id DESC
LIMIT 20;

-- ── 참고: 게시글 검색은 여전히 full scan 이다 ──────────────────────────
-- 검색은 title/content 에 LIKE '%keyword%' 를 쓰므로 btree 인덱스로 가속할 수 없다.
-- 데이터가 늘어 문제가 되면 아래처럼 ngram FULLTEXT 인덱스로 전환한다.
-- (한국어는 기본 파서로 토큰화되지 않아 ngram 파서가 필요하고,
--  QueryDSL 쪽도 MATCH AGAINST 를 쓰도록 함께 바꿔야 하므로 별도 작업으로 다룬다)
--
-- ALTER TABLE community_post
--     ADD FULLTEXT INDEX ft_community_post_title_content (title, content) WITH PARSER ngram;
