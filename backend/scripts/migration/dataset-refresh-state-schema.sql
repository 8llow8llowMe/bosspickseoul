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
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 확인
SELECT dataset, last_probe_at, last_source_total, newest_source_period, consecutive_failures, last_failure_reason, updated_at
  FROM dataset_refresh_state
 ORDER BY dataset;
