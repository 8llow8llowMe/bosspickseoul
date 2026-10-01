-- 분기 적재 배치 검증. Workbench 에서 bosspickseoul_commercial_dev 를 선택한 뒤
-- 블록 단위로 실행한다. 이 파일은 SELECT 만 있으며 스키마를 바꾸지 않는다.
--
-- 선행 DDL (최초 1회, 같은 스키마):
--   1) spring-batch-schema-mysql.sql
--   2) quarterly-dataset-schema.sql
--   3) dataset-refresh-state-schema.sql (분기 적재 자동 최신화를 켤 때만, 이슈 #445)
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
        'dataset_active_release',
        'dataset_refresh_state'
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

-- ---------------------------------------------------------------------------
-- 6) 자동 최신화 run (이슈 #445). run_id 가 auto- 로 시작한다. 수동 run-id 와 겹치지 않는다.
--    WOULD_PUBLISH 는 DRY_RUN 으로, 실게시는 PUBLISHED 로 남는다. 이관(typedFactProjectionJob)은 dataset_release 를 쓰지 않고
--    Spring Batch 메타에만 남는다. 상시 컨테이너의 메타는 commercial 이 아니라 district 의 BATCH_* 에 있다(이 스키마에서는 안 보인다).
--      district 에서: SELECT i.JOB_INSTANCE_ID, e.STATUS, e.START_TIME, e.END_TIME, p.PARAMETER_VALUE AS run_id
--                       FROM BATCH_JOB_INSTANCE i JOIN BATCH_JOB_EXECUTION e ON e.JOB_INSTANCE_ID = i.JOB_INSTANCE_ID
--                       JOIN BATCH_JOB_EXECUTION_PARAMS p ON p.JOB_EXECUTION_ID = e.JOB_EXECUTION_ID AND p.PARAMETER_NAME = 'runId'
--                      WHERE p.PARAMETER_VALUE LIKE 'auto-project-%' ORDER BY e.START_TIME DESC LIMIT 30;
--    raw_location 은 batch-raw 볼륨 경로라 batch-service-job 에서 같은 경로로 ARCHIVE 재생할 수 있다.
-- ---------------------------------------------------------------------------
SELECT run_id, dataset, period_code, status, expected_rows, accepted_count,
       rejected_count, duplicate_count, unmapped_count, failure_reason, acquired_at, published_at, raw_location
  FROM dataset_release
 WHERE run_id LIKE 'auto-%'
 ORDER BY acquired_at DESC
 LIMIT 50;

-- 데이터셋별 자동 최신화 상태. consecutive_failures > 0 이면 failure-cooldown-days 동안 건너뛴다.
-- SELECT dataset, last_probe_at, last_source_total, newest_source_period, consecutive_failures,
--        last_failure_at, last_failure_reason, last_fetch_raw_location, last_reproject_dry_run_period
--   FROM dataset_refresh_state ORDER BY dataset;

-- ---------------------------------------------------------------------------
-- 7) 오래된 NEW / RUNNING. 적재 Job 은 길어야 수십 분이다. 하루를 넘겨 남아 있으면 프로세스가 죽은 run 이다.
--    스테이징 정리를 켜 두면 batch.staging-purge.abandoned-after-days(기본 2일) 지난 것을 FAILED 로 표시한 뒤 지운다.
--    활성 포인터가 가리키는 run 은 표시하지도 지우지도 않는다. 스테이징·거부 행이 하나도 없는 run 은 정리 후보가 아니다(표시도 안 한다).
--    버려진 run 은 BATCH_JOB_EXECUTION 이 STARTED 로 남아 같은 run-id 로 다시 띄울 수 없다. 그 슬롯은 새 attempt run-id 로 재실행한다.
-- ---------------------------------------------------------------------------
SELECT r.run_id, r.dataset, r.period_code, r.status, r.acquired_at,
       TIMESTAMPDIFF(HOUR, r.acquired_at, CURRENT_TIMESTAMP(6)) AS hours_since_start,
       (SELECT COUNT(*) FROM dataset_staging s WHERE s.run_id = r.run_id) AS staging_rows,
       (a.run_id IS NOT NULL) AS is_active
  FROM dataset_release r
  LEFT JOIN dataset_active_release a ON a.run_id = r.run_id
 WHERE r.status IN ('NEW', 'RUNNING')
   AND r.acquired_at < CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY
 ORDER BY r.acquired_at;
