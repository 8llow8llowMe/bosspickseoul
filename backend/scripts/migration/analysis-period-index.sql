-- 분석 기준 분기 카탈로그용 (period_code, spatial_version) 인덱스 런북 (이슈 #464)
--
-- 배경
--   commercial-service 의 analysisperiod 가 5분마다(그리고 기동 직후) 팩트 테이블 15종에
--     SELECT DISTINCT period_code FROM <table> WHERE spatial_version = ?
--   를 한 번씩 날려 기본 분기를 정한다. 기존 키는 (period_code, <코드>, ..., spatial_version) 처럼 두 컬럼 사이에 다른 컬럼이 있어
--   loose index scan 을 못 타고 유니크 인덱스 전체(큰 4개 테이블 합계 약 340만 건)를 읽는다.
--   (period_code, spatial_version) 인덱스가 있으면 MySQL 이 "Using index for group-by" 로 분기 수(수십)만큼만 건너뛰며 읽는다.
--   행이 큰 4개 테이블만 대상이다. 나머지 11개(자치구·상권 단일 행 테이블)는 수만 건 이하라 전체를 읽어도 수 ms 다.
--
-- 왜 배포 "전에" 수동 실행인가
--   prod 는 ddl-auto: none 이라 이 런북이 없으면 인덱스가 생기지 않는다(필수).
--   dev 는 ddl-auto: update 라 배포만 해도 Hibernate 가 만들지만, 기동 중에 160만 행 인덱스를 만들면 기동이 늦어지고
--   그동안 첫 카탈로그 갱신(10초 질의 상한)이 실패해 분기를 생략한 요청이 503 이 될 수 있다. 그래서 dev 도 배포 전에 먼저 실행한다.
--   ALGORITHM=INPLACE, LOCK=NONE 이라 읽기·쓰기를 막지 않지만 분기 적재 자동 최신화(매일 05:00 KST)와 겹치지 않게 그 시간대는 피한다.
--
-- 실행 순서
--   1) 아래 1절로 현재 인덱스를 확인한다
--   2) 2절을 실행한다. 이미 있으면 건너뛴다(여러 번 실행해도 안전)
--   3) 3절 EXPLAIN 의 Extra 가 "Using index for group-by" 인지 본다
--   4) commercial-service 를 배포한다. 엔티티의 @Index 이름이 같아 Hibernate 가 다시 만들지 않는다
--
-- 대상 DB: commercial-service DB (prod 필수 / dev 배포 전 권장)

-- ── 1. 현재 인덱스 확인 ────────────────────────────────────────────────
SELECT TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('store_commercial', 'sales_commercial', 'store_administration', 'sales_administration')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- ── 2. 인덱스 생성 (이미 있으면 건너뜀) ─────────────────────────────────
-- MySQL 8.0 은 ADD INDEX IF NOT EXISTS 가 없어 information_schema 로 확인한 뒤 동적으로 실행한다.
SET @ddl := (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE store_commercial ADD INDEX idx_store_commercial_period_code_spatial_version (period_code, spatial_version), ALGORITHM=INPLACE, LOCK=NONE',
        'SELECT ''skip: idx_store_commercial_period_code_spatial_version already exists''')
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_commercial'
      AND INDEX_NAME = 'idx_store_commercial_period_code_spatial_version');
PREPARE analysis_period_index FROM @ddl;
EXECUTE analysis_period_index;
DEALLOCATE PREPARE analysis_period_index;

SET @ddl := (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE sales_commercial ADD INDEX idx_sales_commercial_period_code_spatial_version (period_code, spatial_version), ALGORITHM=INPLACE, LOCK=NONE',
        'SELECT ''skip: idx_sales_commercial_period_code_spatial_version already exists''')
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_commercial'
      AND INDEX_NAME = 'idx_sales_commercial_period_code_spatial_version');
PREPARE analysis_period_index FROM @ddl;
EXECUTE analysis_period_index;
DEALLOCATE PREPARE analysis_period_index;

SET @ddl := (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE store_administration ADD INDEX idx_store_administration_period_code_spatial_version (period_code, spatial_version), ALGORITHM=INPLACE, LOCK=NONE',
        'SELECT ''skip: idx_store_administration_period_code_spatial_version already exists''')
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_administration'
      AND INDEX_NAME = 'idx_store_administration_period_code_spatial_version');
PREPARE analysis_period_index FROM @ddl;
EXECUTE analysis_period_index;
DEALLOCATE PREPARE analysis_period_index;

SET @ddl := (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE sales_administration ADD INDEX idx_sales_administration_period_code_spatial_version (period_code, spatial_version), ALGORITHM=INPLACE, LOCK=NONE',
        'SELECT ''skip: idx_sales_administration_period_code_spatial_version already exists''')
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_administration'
      AND INDEX_NAME = 'idx_sales_administration_period_code_spatial_version');
PREPARE analysis_period_index FROM @ddl;
EXECUTE analysis_period_index;
DEALLOCATE PREPARE analysis_period_index;

-- ── 3. 검증 ───────────────────────────────────────────────────────────
-- 기대: key 가 새 인덱스, Extra 에 "Using where; Using index for group-by".
-- 실행 전에는 key 가 uk_*/idx_*_period_code_* 이고 Extra 가 "Using where; Using index" (인덱스 전체 스캔, rows ≒ 테이블 행 수)다.
EXPLAIN SELECT DISTINCT period_code FROM store_commercial WHERE spatial_version = 'legacy-20233';
EXPLAIN SELECT DISTINCT period_code FROM sales_commercial WHERE spatial_version = 'legacy-20233';
EXPLAIN SELECT DISTINCT period_code FROM store_administration WHERE spatial_version = 'legacy-20233';
EXPLAIN SELECT DISTINCT period_code FROM sales_administration WHERE spatial_version = 'legacy-20233';

-- ── 참고: 기존 중복 인덱스는 이번 범위 밖 ───────────────────────────────
-- idx_*_period_code_commercial_code_service_code 같은 비유니크 인덱스는 같은 컬럼 앞부분을 가진 유니크 키와 겹친다.
-- 정리는 쓰기 비용과 조회 계획을 따로 확인한 뒤 별도 작업으로 한다.
