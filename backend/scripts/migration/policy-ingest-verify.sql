-- 기업마당 정책 수집 선행 테이블·시드 확인. commercial 스키마에서 실행한다.
-- 운영 절차: backend/docs/services/batch-policy-ingest.md

-- 1) policy 수집 컬럼
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'policy'
  AND COLUMN_NAME IN ('source', 'external_id', 'last_seen_at')
ORDER BY COLUMN_NAME;
-- 기대: 3행, 모두 NO

-- 2) upsert / purge 인덱스
SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name = 'policy'
  AND INDEX_NAME IN ('uk_policy_source_external_id', 'idx_policy_source_last_seen_at')
GROUP BY INDEX_NAME, NON_UNIQUE;
-- 기대: uk 는 NON_UNIQUE=0 (source,external_id), idx 는 (source,last_seen_at)

-- 3) Quartz 테이블
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name LIKE 'QRTZ_%'
ORDER BY table_name;
-- 기대: JOB_DETAILS, TRIGGERS, CRON_TRIGGERS, LOCKS 등 11개

-- 4) Spring Batch 메타 (JobRepository)
SELECT COUNT(*) AS batch_job_instance
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name = 'BATCH_JOB_INSTANCE';
-- 기대: 1

-- 5) 시드 재매핑
SELECT id, source, external_id, LEFT(title, 40) AS title
FROM policy
WHERE id IN (9000000000000000011, 9000000000000000022)
ORDER BY id;
-- 기대: 0011 BIZINFO PBLN_000000000120010, 0022 BIZINFO PBLN_000000000124551

-- 6) 원천별 건수 (수집 전후 비교)
SELECT source, COUNT(*) AS n, MAX(last_seen_at) AS last_seen
FROM policy
GROUP BY source
ORDER BY source;

-- 7) 지금 추천에 남을 수 있는 행 (마감 필터만. 자치구·업종 조건은 없음)
SELECT COUNT(*) AS open_now
FROM policy
WHERE (apply_start_at IS NULL OR apply_start_at <= CURDATE())
  AND (apply_end_at IS NULL OR apply_end_at >= CURDATE());
