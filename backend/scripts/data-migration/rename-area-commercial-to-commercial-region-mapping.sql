-- Rename regional commercial mapping tables after the Java refactor.
-- Target schemas:
-- - bosspickseoul_district_dev
-- - bosspickseoul_community_dev
--
-- Run this before starting services that use @Table(name = "commercial_region_mapping").

DELIMITER $$

DROP PROCEDURE IF EXISTS rename_table_if_exists $$
CREATE PROCEDURE rename_table_if_exists(
    IN p_schema_name VARCHAR(64),
    IN p_old_table_name VARCHAR(64),
    IN p_new_table_name VARCHAR(64)
)
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = p_schema_name
          AND table_name = p_old_table_name
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = p_schema_name
          AND table_name = p_new_table_name
    ) THEN
        SET @rename_table_sql = CONCAT(
            'RENAME TABLE `', p_schema_name, '`.`', p_old_table_name,
            '` TO `', p_schema_name, '`.`', p_new_table_name, '`'
        );
        PREPARE rename_table_stmt FROM @rename_table_sql;
        EXECUTE rename_table_stmt;
        DEALLOCATE PREPARE rename_table_stmt;
    END IF;
END $$

DROP PROCEDURE IF EXISTS rename_index_if_exists $$
CREATE PROCEDURE rename_index_if_exists(
    IN p_schema_name VARCHAR(64),
    IN p_table_name VARCHAR(64),
    IN p_old_index_name VARCHAR(64),
    IN p_new_index_name VARCHAR(64)
)
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = p_schema_name
          AND table_name = p_table_name
          AND index_name = p_old_index_name
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = p_schema_name
          AND table_name = p_table_name
          AND index_name = p_new_index_name
    ) THEN
        SET @rename_index_sql = CONCAT(
            'ALTER TABLE `', p_schema_name, '`.`', p_table_name,
            '` RENAME INDEX `', p_old_index_name, '` TO `', p_new_index_name, '`'
        );
        PREPARE rename_index_stmt FROM @rename_index_sql;
        EXECUTE rename_index_stmt;
        DEALLOCATE PREPARE rename_index_stmt;
    END IF;
END $$

DROP PROCEDURE IF EXISTS rename_column_if_exists $$
CREATE PROCEDURE rename_column_if_exists(
    IN p_schema_name VARCHAR(64),
    IN p_table_name VARCHAR(64),
    IN p_old_column_name VARCHAR(64),
    IN p_new_column_name VARCHAR(64)
)
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = p_schema_name
          AND table_name = p_table_name
          AND column_name = p_old_column_name
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = p_schema_name
          AND table_name = p_table_name
          AND column_name = p_new_column_name
    ) THEN
        SET @rename_column_sql = CONCAT(
            'ALTER TABLE `', p_schema_name, '`.`', p_table_name,
            '` RENAME COLUMN `', p_old_column_name, '` TO `', p_new_column_name, '`'
        );
        PREPARE rename_column_stmt FROM @rename_column_sql;
        EXECUTE rename_column_stmt;
        DEALLOCATE PREPARE rename_column_stmt;
    END IF;
END $$

DELIMITER ;

CALL rename_table_if_exists('bosspickseoul_district_dev', 'area_commercial', 'commercial_region_mapping');
CALL rename_index_if_exists(
    'bosspickseoul_district_dev',
    'commercial_region_mapping',
    'idx_area_commercial_district_code',
    'idx_commercial_region_mapping_district_code'
);
CALL rename_index_if_exists(
    'bosspickseoul_district_dev',
    'commercial_region_mapping',
    'idx_area_commercial_administration_code',
    'idx_commercial_region_mapping_administration_code'
);

CALL rename_table_if_exists('bosspickseoul_community_dev', 'area_commercial', 'commercial_region_mapping');

CALL rename_column_if_exists('bosspickseoul_district_dev', 'commercial_region_mapping', 'commercial_classification_code_name', 'commercial_classification_name');
CALL rename_column_if_exists('bosspickseoul_district_dev', 'commercial_region_mapping', 'commercial_code_name', 'commercial_name');
CALL rename_column_if_exists('bosspickseoul_district_dev', 'commercial_region_mapping', 'district_code_name', 'district_name');
CALL rename_column_if_exists('bosspickseoul_district_dev', 'commercial_region_mapping', 'administration_code_name', 'administration_name');

CALL rename_column_if_exists('bosspickseoul_community_dev', 'commercial_region_mapping', 'commercial_classification_code_name', 'commercial_classification_name');
CALL rename_column_if_exists('bosspickseoul_community_dev', 'commercial_region_mapping', 'commercial_code_name', 'commercial_name');
CALL rename_column_if_exists('bosspickseoul_community_dev', 'commercial_region_mapping', 'district_code_name', 'district_name');
CALL rename_column_if_exists('bosspickseoul_community_dev', 'commercial_region_mapping', 'administration_code_name', 'administration_name');

DROP PROCEDURE IF EXISTS rename_column_if_exists;
DROP PROCEDURE IF EXISTS rename_index_if_exists;
DROP PROCEDURE IF EXISTS rename_table_if_exists;

SELECT table_schema, table_name, column_name
FROM information_schema.columns
WHERE table_schema IN ('bosspickseoul_district_dev', 'bosspickseoul_community_dev')
  AND table_name IN ('area_commercial', 'commercial_region_mapping')
  AND column_name IN (
      'commercial_classification_code_name',
      'commercial_classification_name',
      'commercial_code_name',
      'commercial_name',
      'district_code_name',
      'district_name',
      'administration_code_name',
      'administration_name'
  )
ORDER BY table_schema, table_name, ordinal_position;
