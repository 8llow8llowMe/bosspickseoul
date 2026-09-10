-- 상시 batch-service 의 BATCH_DB_URL(district) 에서 실행한다.
-- policy 행은 commercial 에 있다. backend/scripts/migration/policy-ingest-verify.sql
-- 운영 절차: backend/docs/services/batch-policy-ingest.md

-- 1) Quartz 테이블
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name LIKE 'QRTZ_%'
ORDER BY table_name;
-- 기대: JOB_DETAILS, TRIGGERS, CRON_TRIGGERS, LOCKS 등 11개

-- 2) Spring Batch 메타 (JobRepository)
SELECT COUNT(*) AS batch_job_instance
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name = 'BATCH_JOB_INSTANCE';
-- 기대: 1
