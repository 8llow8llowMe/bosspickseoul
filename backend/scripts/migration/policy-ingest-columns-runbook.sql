-- MySQL 8. Apply manually to the commercial-service schema before deploying
-- the policy ingest Job. prod ddl-auto is none, so the application will not
-- add these columns.
--
-- Prerequisite: `policy` table already exists (policy-seed.sql / commercial-service entity).
-- After this script, re-run policy-seed.sql so BIZINFO remaps and SEED external_id values land.
--
-- Quartz tables (quartz-schema-mysql.sql) and Spring Batch metadata
-- (spring-batch-schema-mysql.sql) belong on the BATCH_DB_URL schema (district).

ALTER TABLE policy
    ADD COLUMN source VARCHAR(20) NULL COMMENT '수집 원천 (SEED/BIZINFO). 추천 API 에는 노출하지 않는다',
    ADD COLUMN external_id VARCHAR(64) NULL COMMENT '원천 공고 식별자. SEED 는 seed-{id}, BIZINFO 는 pblancId',
    ADD COLUMN last_seen_at DATETIME(6) NULL COMMENT '마지막 수집 시각. 원천에서 사라진 행의 유예·삭제 기준';

UPDATE policy
SET source = 'SEED',
    external_id = CONCAT('seed-', id),
    last_seen_at = '2026-09-09 00:00:00.000000'
WHERE source IS NULL;

UPDATE policy
SET source = 'BIZINFO',
    external_id = 'PBLN_000000000120010'
WHERE id = 9000000000000000011;

UPDATE policy
SET source = 'BIZINFO',
    external_id = 'PBLN_000000000124551'
WHERE id = 9000000000000000022;

ALTER TABLE policy
    MODIFY COLUMN source VARCHAR(20) NOT NULL COMMENT '수집 원천 (SEED/BIZINFO). 추천 API 에는 노출하지 않는다',
    MODIFY COLUMN external_id VARCHAR(64) NOT NULL COMMENT '원천 공고 식별자. SEED 는 seed-{id}, BIZINFO 는 pblancId',
    MODIFY COLUMN last_seen_at DATETIME(6) NOT NULL COMMENT '마지막 수집 시각. 원천에서 사라진 행의 유예·삭제 기준';

ALTER TABLE policy
    ADD UNIQUE KEY uk_policy_source_external_id (source, external_id),
    ADD KEY idx_policy_source_last_seen_at (source, last_seen_at);
