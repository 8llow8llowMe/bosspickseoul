-- community_post 에 게시글 말머리(category) 컬럼과 목록 필터 인덱스를 추가하는 런북 (#470)
--
-- 배경
--   게시글에 말머리(주제 분류)를 붙인다 — QUESTION 질문 · EXPERIENCE 경험 공유 · TOGETHER 같이 해요 · NEWS 동네 소식.
--   작성·수정 요청의 category 를 저장하고, 목록(GET /api/v1/community/posts?category=...)이 말머리로 거른다.
--   말머리는 선택 값이라 컬럼은 NULL 을 허용한다. 기존 글은 NULL(말머리 없음)로 둔다 —
--   어느 말머리로 채워도 사실이 아니므로 기본값도, 기존 행 UPDATE 도 없다.
--
-- 왜 수동 실행인가
--   dev/local 은 ddl-auto=update 가 컬럼과 인덱스를 만들어 주지만, prod 는 ddl-auto=none 이라 직접 적용한다.
--   대상 DB: community-service DB (prod: bosspickseoul_community_prod)
--
-- 실행 순서
--   1) 이 런북의 ALTER / CREATE INDEX 를 **애플리케이션 배포 전에** 실행한다.
--      새 버전은 모든 게시글 조회·수정 쿼리에서 category 컬럼을 읽고 쓰므로, 컬럼이 없으면 목록·상세·작성·수정이 전부 실패한다.
--      이전 버전은 새 컬럼을 모르지만 NULL 허용·기본값 없음이라 INSERT 가 그대로 성공하므로 먼저 추가해도 안전하다.
--   2) 아래 확인 쿼리로 컬럼과 인덱스를 확인한다.
--   3) 애플리케이션을 배포한다.
--
-- 주의
--   - 컬럼은 AFTER 없이 끝에 붙인다. 끝에 붙이는 NULL 허용 컬럼 추가는 MySQL 8.0.12+ 에서 INSTANT 로 끝나 테이블을 다시 쓰지 않는다.
--     (엔티티 필드 순서와 컬럼 위치가 달라도 동작에는 영향이 없다)
--   - 인덱스 생성은 online(INPLACE) 이지만 community_post 행이 많으면 오래 걸린다. 트래픽이 적은 시간대에 수행한다.
--   - 알고리즘을 명시한다(INSTANT / INPLACE, LOCK=NONE). 명시하지 않으면 불가능할 때 경고 없이 테이블 복사로 넘어간다.
--     명시하면 불가능할 때 오류로 멈추므로, 그때는 원인을 확인한 뒤 다시 계획한다.
--   - 2절은 information_schema 로 확인한 뒤 실행하므로 여러 번 실행해도 안전하다(analysis-period-index.sql 과 같은 방식).
--
-- 롤백
--   1) 애플리케이션을 먼저 이전 버전으로 되돌린다. 새 버전은 컬럼이 없으면 모든 게시글 조회가 실패한다.
--   2) ALTER TABLE community_post DROP INDEX idx_community_post_status_category_id;
--   3) 컬럼은 남긴다. 이전 버전에는 무해하고, 지우면 그동안 저장된 말머리가 사라진다.

-- ── 1. 현재 상태 확인 (이미 적용됐으면 2 는 건너뛰는 SELECT 만 남긴다) ──────
SHOW COLUMNS FROM community_post LIKE 'category';

SELECT INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'community_post'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- ── 2. 컬럼 · 인덱스 추가 (이미 있으면 건너뜀) ──────────────────────────
-- 오래 도는 트랜잭션 뒤에서 메타데이터 락을 기다리며 뒤따르는 조회를 줄줄이 막지 않도록 대기 시간을 짧게 둔다.
-- 시간 초과로 실패하면 트래픽이 적을 때 다시 실행한다.
SET SESSION lock_wait_timeout = 5;

-- 컬럼과 인덱스를 한 ALTER 로 합치면 INSTANT 가 불가능해져 테이블을 다시 쓰므로 나눠 실행한다.
SET @ddl := (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE community_post ADD COLUMN category VARCHAR(20) NULL COMMENT ''게시글 말머리 (QUESTION/EXPERIENCE/TOGETHER/NEWS, 없으면 null)'', ALGORITHM=INSTANT',
        'SELECT ''skip: community_post.category already exists''')
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'community_post' AND COLUMN_NAME = 'category');
PREPARE community_post_category FROM @ddl;
EXECUTE community_post_category;
DEALLOCATE PREPARE community_post_category;

-- 전체 피드 + 말머리 + 최신순: where status = ? and category = ? order by id desc 를 인덱스 정렬로 끝낸다.
-- 대상 필터 + 말머리는 idx_community_post_target_status_id, 인기순 + 말머리는 idx_community_post_status_like_count_id 로 처리하고
-- category 는 잔여 조건으로 평가된다 (backend/docs/services/community-service.md 「게시글 말머리」).
SET @ddl := (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE community_post ADD INDEX idx_community_post_status_category_id (status, category, id), ALGORITHM=INPLACE, LOCK=NONE',
        'SELECT ''skip: idx_community_post_status_category_id already exists''')
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'community_post'
      AND INDEX_NAME = 'idx_community_post_status_category_id');
PREPARE community_post_category FROM @ddl;
EXECUTE community_post_category;
DEALLOCATE PREPARE community_post_category;

-- ── 3. 적용 검증 ──────────────────────────────────────────────────────
-- 컬럼: Type varchar(20), Null YES, Default NULL 이어야 한다.
SHOW COLUMNS FROM community_post LIKE 'category';

-- 인덱스: status, category, id 순서로 3행이 나와야 한다.
SELECT INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'community_post'
  AND INDEX_NAME = 'idx_community_post_status_category_id'
ORDER BY SEQ_IN_INDEX;

-- 기존 글은 전부 NULL(말머리 없음)이어야 한다 — 적용 직후 non_null_count 는 0 이다.
SELECT COUNT(*) AS total_count, COUNT(category) AS non_null_count FROM community_post;

-- 실행계획 1 — 전체 피드 + 말머리 + 최신순.
-- key 에 idx_community_post_status_category_id 가 잡히고 Extra 에 "Using filesort" 가 없으면 성공이다.
EXPLAIN
SELECT * FROM community_post
WHERE status = 'ACTIVE' AND category = 'QUESTION'
ORDER BY id DESC
LIMIT 21;

-- 실행계획 2 — 인기순 + 말머리. 옵티마이저가 말머리 비중에 따라 고른다.
-- idx_community_post_status_like_count_id(정렬을 인덱스로, category 는 잔여 조건) 또는
-- idx_community_post_status_category_id(ref 후 filesort) 중 하나가 잡힌다. 어느 쪽이었는지 기록해 둔다.
EXPLAIN
SELECT * FROM community_post
WHERE status = 'ACTIVE' AND category = 'QUESTION'
ORDER BY like_count DESC, id DESC
LIMIT 21;

-- 실행계획 3 — 게시판(대상) + 말머리 + 최신순. 기대: key 가 idx_community_post_target_status_id, category 는 잔여 조건.
-- target_code 는 실제 존재하는 대상 코드로 바꿔 실행한다.
EXPLAIN
SELECT * FROM community_post
WHERE target_type = 'COMMERCIAL' AND target_code = '3110008' AND status = 'ACTIVE' AND category = 'QUESTION'
ORDER BY id DESC
LIMIT 21;
