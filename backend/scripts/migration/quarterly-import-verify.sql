-- 분기 적재 배치 검증. Workbench 에서 bosspickseoul_commercial_dev 를 선택한 뒤
-- 블록 단위로 실행한다. 이 파일은 SELECT 만 있으며 스키마를 바꾸지 않는다.
--
-- 선행 DDL (최초 1회, 같은 스키마):
--   1) spring-batch-schema-mysql.sql
--   2) quarterly-dataset-schema.sql
-- 운영 절차: backend/docs/services/batch-quarterly-import.md

-- ---------------------------------------------------------------------------
-- 1) 선행 테이블
--    BATCH_JOB_INSTANCE = 1, dataset_spatial_release = 1 이어야 기동·적재가 가능하다.
-- ---------------------------------------------------------------------------
SELECT table_name
  FROM information_schema.tables
 WHERE table_schema = DATABASE()
   AND table_name IN (
        'BATCH_JOB_INSTANCE',
        'dataset_spatial_release',
        'dataset_spatial_area',
        'dataset_release',
        'dataset_staging',
        'dataset_rejected_row',
        'dataset_fact',
        'dataset_active_release'
       )
 ORDER BY table_name;

-- ---------------------------------------------------------------------------
-- 2) 공간 스냅샷. LEGACY 게시면 READY, 영역 2,100 (25/425/1650) 이어야 한다.
--    2026-09-09 개발 DB: spatial_version = legacy-20233 을 게시했다.
-- ---------------------------------------------------------------------------
SELECT spatial_version, status, checksum, source_updated_at, acquired_at
  FROM dataset_spatial_release
 ORDER BY acquired_at DESC;

SELECT spatial_version,
       SUM(area_type = 'DISTRICT')       AS district_count,
       SUM(area_type = 'ADMINISTRATION') AS administration_count,
       SUM(area_type = 'COMMERCIAL')     AS commercial_count,
       COUNT(*)                          AS area_total
  FROM dataset_spatial_area
 GROUP BY spatial_version;

-- ---------------------------------------------------------------------------
-- 3) 최근 사실 적재. dry-run 통과 기준:
--      status = 'DRY_RUN'
--      expected_rows = input_count = accepted_count
--      rejected_count = duplicate_count = unmapped_count = 0
--    실게시 통과 기준: status = 'PUBLISHED' 이고 위 건수가 같다.
-- ---------------------------------------------------------------------------
SELECT run_id, dataset, period_code, spatial_version, schema_version,
       source, status, expected_rows, input_count, accepted_count,
       rejected_count, duplicate_count, unmapped_count, failure_reason,
       raw_location, published_at
  FROM dataset_release
 ORDER BY acquired_at DESC
 LIMIT 30;

-- ---------------------------------------------------------------------------
-- 4) 데이터셋·분기 커버리지. 실게시된 슬롯만 본다.
--    비어 있는 (dataset, period) 가 다음에 돌릴 대상이다.
-- ---------------------------------------------------------------------------
SELECT dataset, period_code, spatial_version, schema_version, run_id
  FROM dataset_active_release
 ORDER BY dataset, period_code;

SELECT dataset, period_code, status, COUNT(*) AS run_count,
       MAX(accepted_count) AS accepted_count
  FROM dataset_release
 GROUP BY dataset, period_code, status
 ORDER BY dataset, period_code, status;

-- ---------------------------------------------------------------------------
-- 5) 한 run 의 거부·미매핑 점검. run_id 를 바꿔 쓴다.
-- ---------------------------------------------------------------------------
-- SELECT reason, COUNT(*) AS rejected
--   FROM dataset_rejected_row
--  WHERE run_id = 'change-commercial-20241-001'
--  GROUP BY reason;
--
-- SELECT COUNT(*) AS fact_rows
--   FROM dataset_fact
--  WHERE run_id = 'change-commercial-20241-002';
