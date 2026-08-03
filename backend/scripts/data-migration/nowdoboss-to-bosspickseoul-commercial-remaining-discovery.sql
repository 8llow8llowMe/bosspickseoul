-- Discovery script for remaining commercial-service tables.
-- Run this after the first commercial migration when you need to confirm which source tables still exist in nowdoboss.
--
-- Already migrated by nowdoboss-to-bosspickseoul-commercial-after-area-runbook.sql:
-- - service_category
-- - facility_commercial
-- - sales_administration
-- - sales_district
-- - income_district
-- - store_district
-- - sales_commercial
-- - store_commercial
--
-- Remaining commercial-service entity tables:
-- - income_administration
-- - store_administration
-- - change_commercial
-- - change_district
-- - foot_traffic_commercial
-- - foot_traffic_district
-- - income_commercial
-- - population_commercial

SET @source_schema = 'nowdoboss';
SET @target_schema = 'bosspickseoul_commercial_dev';

USE bosspickseoul_commercial_dev;

DROP TEMPORARY TABLE IF EXISTS remaining_migration_tables;
CREATE TEMPORARY TABLE remaining_migration_tables (
    table_name VARCHAR(64) NOT NULL PRIMARY KEY,
    migration_note VARCHAR(255) NOT NULL
);

INSERT INTO remaining_migration_tables (table_name, migration_note)
VALUES
    ('income_administration', 'income/expense by administration'),
    ('store_administration', 'store counts by administration'),
    ('change_commercial', 'commercial change indicators by commercial area'),
    ('change_district', 'commercial change indicators by district'),
    ('foot_traffic_commercial', 'foot traffic by commercial area'),
    ('foot_traffic_district', 'foot traffic by district'),
    ('income_commercial', 'income/expense by commercial area'),
    ('population_commercial', 'resident population by commercial area');

-- 1) Source/target table existence.
SELECT
    r.table_name,
    IF(s.table_name IS NULL, 0, 1) AS source_exists,
    IF(t.table_name IS NULL, 0, 1) AS target_exists,
    r.migration_note
FROM remaining_migration_tables r
LEFT JOIN information_schema.tables s
    ON s.table_schema = @source_schema
   AND s.table_name = r.table_name
LEFT JOIN information_schema.tables t
    ON t.table_schema = @target_schema
   AND t.table_name = r.table_name
ORDER BY r.table_name;

-- 2) Exact row counts without failing when a source table is missing.
DROP TEMPORARY TABLE IF EXISTS remaining_migration_counts;
CREATE TEMPORARY TABLE remaining_migration_counts (
    schema_name VARCHAR(64) NOT NULL,
    table_name VARCHAR(64) NOT NULL,
    table_exists TINYINT NOT NULL,
    row_count BIGINT NULL
);

DELIMITER $$

DROP PROCEDURE IF EXISTS collect_remaining_count $$
CREATE PROCEDURE collect_remaining_count(
    IN p_schema_name VARCHAR(64),
    IN p_table_name VARCHAR(64)
)
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = p_schema_name
          AND table_name = p_table_name
    ) THEN
        SET @count_sql = CONCAT(
            'INSERT INTO remaining_migration_counts(schema_name, table_name, table_exists, row_count) ',
            'SELECT ', QUOTE(p_schema_name), ', ', QUOTE(p_table_name), ', 1, COUNT(*) ',
            'FROM `', p_schema_name, '`.`', p_table_name, '`'
        );
    ELSE
        SET @count_sql = CONCAT(
            'INSERT INTO remaining_migration_counts(schema_name, table_name, table_exists, row_count) ',
            'VALUES (', QUOTE(p_schema_name), ', ', QUOTE(p_table_name), ', 0, NULL)'
        );
    END IF;

    PREPARE count_stmt FROM @count_sql;
    EXECUTE count_stmt;
    DEALLOCATE PREPARE count_stmt;
END $$

DROP PROCEDURE IF EXISTS collect_all_remaining_counts $$
CREATE PROCEDURE collect_all_remaining_counts()
BEGIN
    DECLARE v_done TINYINT DEFAULT 0;
    DECLARE v_table_name VARCHAR(64);
    DECLARE table_cursor CURSOR FOR SELECT table_name FROM remaining_migration_tables ORDER BY table_name;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

    OPEN table_cursor;

    read_loop: LOOP
        FETCH table_cursor INTO v_table_name;
        IF v_done = 1 THEN
            LEAVE read_loop;
        END IF;

        CALL collect_remaining_count(@source_schema, v_table_name);
        CALL collect_remaining_count(@target_schema, v_table_name);
    END LOOP;

    CLOSE table_cursor;
END $$

DELIMITER ;

CALL collect_all_remaining_counts();

SELECT
    table_name,
    MAX(CASE WHEN schema_name = @source_schema THEN table_exists END) AS source_exists,
    MAX(CASE WHEN schema_name = @source_schema THEN row_count END) AS source_count,
    MAX(CASE WHEN schema_name = @target_schema THEN table_exists END) AS target_exists,
    MAX(CASE WHEN schema_name = @target_schema THEN row_count END) AS target_count
FROM remaining_migration_counts
GROUP BY table_name
ORDER BY table_name;

DROP PROCEDURE IF EXISTS collect_all_remaining_counts;
DROP PROCEDURE IF EXISTS collect_remaining_count;

-- 3) Source column inventory.
-- Send this result back before running INSERT SELECT for the remaining tables.
SELECT
    c.table_name,
    c.ordinal_position,
    c.column_name,
    c.column_type,
    c.is_nullable,
    c.column_key,
    c.extra
FROM information_schema.columns c
JOIN remaining_migration_tables r ON r.table_name = c.table_name
WHERE c.table_schema = @source_schema
ORDER BY c.table_name, c.ordinal_position;

-- 4) Target column inventory for comparison.
SELECT
    c.table_name,
    c.ordinal_position,
    c.column_name,
    c.column_type,
    c.is_nullable,
    c.column_key,
    c.extra
FROM information_schema.columns c
JOIN remaining_migration_tables r ON r.table_name = c.table_name
WHERE c.table_schema = @target_schema
ORDER BY c.table_name, c.ordinal_position;

-- 5) Quick summary of target columns that are NOT NULL and must be filled.
SELECT
    c.table_name,
    GROUP_CONCAT(c.column_name ORDER BY c.ordinal_position SEPARATOR ', ') AS required_target_columns
FROM information_schema.columns c
JOIN remaining_migration_tables r ON r.table_name = c.table_name
WHERE c.table_schema = @target_schema
  AND c.is_nullable = 'NO'
  AND c.extra NOT LIKE '%auto_increment%'
GROUP BY c.table_name
ORDER BY c.table_name;

-- 6) Required target columns that do not exist with the same name in source.
-- If this result is empty, same-name INSERT SELECT is possible for the remaining tables.
-- If rows are returned, send this result back so the source -> target column mapping can be written safely.
SELECT
    target_columns.table_name,
    target_columns.column_name AS missing_source_column,
    target_columns.column_type AS target_column_type
FROM information_schema.columns target_columns
JOIN remaining_migration_tables r ON r.table_name = target_columns.table_name
LEFT JOIN information_schema.columns source_columns
    ON source_columns.table_schema = @source_schema
   AND source_columns.table_name = target_columns.table_name
   AND source_columns.column_name = target_columns.column_name
WHERE target_columns.table_schema = @target_schema
  AND target_columns.is_nullable = 'NO'
  AND target_columns.extra NOT LIKE '%auto_increment%'
  AND source_columns.column_name IS NULL
ORDER BY target_columns.table_name, target_columns.ordinal_position;

-- 7) Source columns that exist only in nowdoboss.
-- These usually reveal old column names such as *_code_name, month_sales, or total_price.
SELECT
    source_columns.table_name,
    source_columns.ordinal_position,
    source_columns.column_name AS source_only_column,
    source_columns.column_type AS source_column_type
FROM information_schema.columns source_columns
JOIN remaining_migration_tables r ON r.table_name = source_columns.table_name
LEFT JOIN information_schema.columns target_columns
    ON target_columns.table_schema = @target_schema
   AND target_columns.table_name = source_columns.table_name
   AND target_columns.column_name = source_columns.column_name
WHERE source_columns.table_schema = @source_schema
  AND target_columns.column_name IS NULL
ORDER BY source_columns.table_name, source_columns.ordinal_position;
