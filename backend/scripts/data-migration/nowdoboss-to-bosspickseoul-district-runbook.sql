-- nowdoboss -> bosspickseoul district data migration runbook.
-- Source schema: nowdoboss
-- Target schema: bosspickseoul_district_dev
--
-- district-service current tables:
-- - commercial_region_mapping: can be migrated from nowdoboss.area_commercial.
-- - area_boundary: cannot be migrated from nowdoboss dumps because boundary GeoJSON is not present.
--   Load it later from Seoul boundary public data.

SET SESSION net_read_timeout = 600;
SET SESSION net_write_timeout = 600;
SET SESSION wait_timeout = 28800;
SET SESSION max_execution_time = 0;

USE bosspickseoul_district_dev;

-- 1) Check whether the current target table exists.
-- If table_exists = 0 and old_area_commercial_exists = 1, run:
-- scripts/data-migration/rename-area-commercial-to-commercial-region-mapping.sql
SELECT
    EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'bosspickseoul_district_dev'
          AND table_name = 'commercial_region_mapping'
    ) AS table_exists,
    EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'bosspickseoul_district_dev'
          AND table_name = 'area_commercial'
    ) AS old_area_commercial_exists;

-- 2) Source/target counts before migration.
SELECT 'nowdoboss.area_commercial' AS table_name, COUNT(*) AS row_count
FROM nowdoboss.area_commercial
UNION ALL
SELECT 'bosspickseoul_district_dev.commercial_region_mapping', COUNT(*)
FROM bosspickseoul_district_dev.commercial_region_mapping
UNION ALL
SELECT 'bosspickseoul_district_dev.area_boundary', COUNT(*)
FROM bosspickseoul_district_dev.area_boundary;

-- 3) Source uniqueness profile.
-- commercial_count should usually be 1650 for the current dump.
SELECT
    COUNT(*) AS mapping_count,
    COUNT(DISTINCT commercial_code) AS commercial_count,
    COUNT(DISTINCT district_code) AS district_count,
    COUNT(DISTINCT administration_code) AS administration_count
FROM nowdoboss.area_commercial;

-- 4) Migrate commercial region mapping.
-- Re-runnable: existing PK rows are updated.
INSERT INTO bosspickseoul_district_dev.commercial_region_mapping (
    id,
    commercial_classification_code,
    commercial_classification_name,
    commercial_code,
    commercial_name,
    x,
    y,
    district_code,
    district_name,
    administration_code,
    administration_name
)
SELECT
    id,
    commercial_classification_code,
    commercial_classification_code_name,
    commercial_code,
    commercial_code_name,
    x,
    y,
    district_code,
    district_code_name,
    administration_code,
    administration_code_name
FROM nowdoboss.area_commercial
ON DUPLICATE KEY UPDATE
    commercial_classification_code = VALUES(commercial_classification_code),
    commercial_classification_name = VALUES(commercial_classification_name),
    commercial_code = VALUES(commercial_code),
    commercial_name = VALUES(commercial_name),
    x = VALUES(x),
    y = VALUES(y),
    district_code = VALUES(district_code),
    district_name = VALUES(district_name),
    administration_code = VALUES(administration_code),
    administration_name = VALUES(administration_name);

-- 5) Count validation after migration.
SELECT
    'commercial_region_mapping' AS table_name,
    (SELECT COUNT(*) FROM nowdoboss.area_commercial) AS source_count,
    (
        SELECT COUNT(*)
        FROM bosspickseoul_district_dev.commercial_region_mapping t
        JOIN nowdoboss.area_commercial s ON s.id = t.id
    ) AS migrated_target_id_count,
    (
        SELECT COUNT(*)
        FROM nowdoboss.area_commercial s
        LEFT JOIN bosspickseoul_district_dev.commercial_region_mapping t ON t.id = s.id
        WHERE t.id IS NULL
    ) AS missing_source_id_count,
    (
        SELECT COUNT(*)
        FROM bosspickseoul_district_dev.commercial_region_mapping t
        LEFT JOIN nowdoboss.area_commercial s ON s.id = t.id
        WHERE s.id IS NULL
    ) AS target_extra_id_count;

-- 6) Value mismatch validation.
-- mismatch_count must be 0.
SELECT
    COUNT(*) AS mismatch_count
FROM nowdoboss.area_commercial s
JOIN bosspickseoul_district_dev.commercial_region_mapping t ON t.id = s.id
WHERE t.commercial_classification_code <> s.commercial_classification_code
   OR t.commercial_classification_name <> s.commercial_classification_code_name
   OR t.commercial_code <> s.commercial_code
   OR t.commercial_name <> s.commercial_code_name
   OR t.x <> s.x
   OR t.y <> s.y
   OR t.district_code <> s.district_code
   OR t.district_name <> s.district_code_name
   OR t.administration_code <> s.administration_code
   OR t.administration_name <> s.administration_code_name;

-- 7) area_boundary status.
-- area_boundary needs polygon/multipolygon boundary GeoJSON.
-- nowdoboss.area_commercial only has center x/y, so do not derive area_boundary from it.
SELECT
    area_type,
    COUNT(*) AS boundary_count
FROM bosspickseoul_district_dev.area_boundary
GROUP BY area_type
ORDER BY area_type;

-- 8) Expected area_boundary source data to prepare from public data.
-- Use this as a target checklist when loading boundary CSV/GeoJSON later.
SELECT 'DISTRICT' AS area_type, COUNT(DISTINCT district_code) AS expected_area_count
FROM nowdoboss.area_commercial
UNION ALL
SELECT 'ADMINISTRATION', COUNT(DISTINCT administration_code)
FROM nowdoboss.area_commercial
UNION ALL
SELECT 'COMMERCIAL', COUNT(DISTINCT commercial_code)
FROM nowdoboss.area_commercial;
