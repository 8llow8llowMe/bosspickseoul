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

-- 3) 저장된 Quartz Job·트리거. 정책 수집·분기 적재 자동 최신화·스테이징 정리가 공유한다.
--    켜진 기능만 보여야 한다. 끈 기능의 Job 이 남아 있으면 재기동 로그의
--    "[<기능>] disabled, stored quartz job removed" / "... not removed" 를 본다(남아 있어도 Job 이 플래그를 보고 무시한다).
SELECT j.JOB_NAME, t.TRIGGER_NAME, t.TRIGGER_STATE,
       FROM_UNIXTIME(t.NEXT_FIRE_TIME / 1000) AS next_fire_at,
       FROM_UNIXTIME(t.PREV_FIRE_TIME / 1000) AS prev_fire_at,
       c.CRON_EXPRESSION, c.TIME_ZONE_ID
  FROM QRTZ_JOB_DETAILS j
  LEFT JOIN QRTZ_TRIGGERS t
         ON t.SCHED_NAME = j.SCHED_NAME AND t.JOB_NAME = j.JOB_NAME AND t.JOB_GROUP = j.JOB_GROUP
  LEFT JOIN QRTZ_CRON_TRIGGERS c
         ON c.SCHED_NAME = t.SCHED_NAME AND c.TRIGGER_NAME = t.TRIGGER_NAME AND c.TRIGGER_GROUP = t.TRIGGER_GROUP
 ORDER BY j.JOB_NAME;
-- 기대(예: 정책만 켬): policyCollectQuartzJob / policyPurgeQuartzJob 두 행.
--      datasetRefreshQuartzJob 은 BATCH_DATASET_REFRESH_ENABLED=true, datasetStagingPurgeQuartzJob 은 BATCH_STAGING_PURGE_ENABLED=true 일 때만.

