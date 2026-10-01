-- MySQL 8. 분기 적재 자동 최신화(이슈 #445) 상태 테이블.
-- Workbench 에서 commercial 스키마(개발: bosspickseoul_commercial_dev)를 선택한 뒤 실행한다.
-- 앱이 만들지 않는다. IF NOT EXISTS 라 두 번 실행해도 된다.
--
-- 선행: quarterly-dataset-schema.sql (dataset_release 등) 과 spring-batch-schema-mysql.sql.
--       상시 batch-service 의 BATCH_* / QRTZ_* 메타는 기본 DataSource(district) 에 있고, 이 테이블은 commercial 에 둔다.
-- 운영 절차: backend/docs/services/batch-service.md 「분기 적재 자동 최신화」
--
-- 이 테이블은 "원천을 또 받을지" 판단용 캐시다. 게시 여부의 정본은 dataset_release / dataset_active_release 다.
-- 행을 지워도 다음 run 이 원천을 한 번 더 받을 뿐 게시가 깨지지 않는다.
--
-- last_fetch_run_id / last_fetch_raw_location 은 게시 판단이 실패(IMPLAUSIBLE, dry-run 실패)해도 남는다. 수동으로
-- --source=ARCHIVE --source-file=<last_fetch_raw_location> 재생할 때 여기서 읽는다(batch-quarterly-import.md 경계 절).
-- last_reproject_dry_run_period 는 publish=false 에서 마지막으로 dry-run 재이관한 분기다. 그 분기까지는 매일 다시 dry-run 하지 않는다.
--
-- 이 파일을 적용하기 전 버전(last_reproject_dry_run_period 없음)으로 이미 만든 환경이면 아래 한 줄을 한 번 실행한다.
--   ALTER TABLE dataset_refresh_state ADD COLUMN last_reproject_dry_run_period CHAR(5) NULL AFTER consecutive_failures;
CREATE TABLE IF NOT EXISTS dataset_refresh_state (
    dataset VARCHAR(64) PRIMARY KEY,
    last_probe_at TIMESTAMP(6) NULL,
    last_source_total BIGINT NULL,
    newest_source_period CHAR(5) NULL,
    last_fetch_run_id VARCHAR(64) NULL,
    last_fetch_raw_location TEXT NULL,
    last_failure_at TIMESTAMP(6) NULL,
    last_failure_reason VARCHAR(512) NULL,
    consecutive_failures INT NOT NULL DEFAULT 0,
    last_reproject_dry_run_period CHAR(5) NULL,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 확인
SELECT dataset, last_probe_at, last_source_total, newest_source_period, consecutive_failures, last_failure_reason,
       last_fetch_raw_location, last_reproject_dry_run_period, updated_at
  FROM dataset_refresh_state
 ORDER BY dataset;
