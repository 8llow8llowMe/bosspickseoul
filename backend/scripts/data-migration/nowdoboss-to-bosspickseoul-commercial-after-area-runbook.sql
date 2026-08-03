-- nowdoboss -> bosspickseoul commercial data migration runbook.
-- Assumption:
-- - area_commercial / commercial_region_mapping was already migrated.
-- - Source schema: nowdoboss
-- - Target schema: bosspickseoul_commercial_dev
-- - Run from MySQL Workbench with the connected user having SELECT on source and INSERT/UPDATE on target.
--
-- Recommended Workbench setting before running large tables:
-- Edit > Preferences > SQL Editor > DBMS connection read timeout: 600 or higher.

SET SESSION net_read_timeout = 600;
SET SESSION net_write_timeout = 600;
SET SESSION wait_timeout = 28800;
SET SESSION max_execution_time = 0;

USE bosspickseoul_commercial_dev;

SET @batch_size = 20000;

-- 1) Exact source counts before migration.
SELECT 'service_type' AS table_name, COUNT(*) AS source_count FROM nowdoboss.service_type
UNION ALL SELECT 'facility_commercial', COUNT(*) FROM nowdoboss.facility_commercial
UNION ALL SELECT 'sales_administration', COUNT(*) FROM nowdoboss.sales_administration
UNION ALL SELECT 'sales_district', COUNT(*) FROM nowdoboss.sales_district
UNION ALL SELECT 'income_district', COUNT(*) FROM nowdoboss.income_district
UNION ALL SELECT 'store_district', COUNT(*) FROM nowdoboss.store_district
UNION ALL SELECT 'sales_commercial', COUNT(*) FROM nowdoboss.sales_commercial
UNION ALL SELECT 'store_commercial', COUNT(*) FROM nowdoboss.store_commercial
ORDER BY table_name;

-- 2) Current target counts before migration.
SELECT 'service_category' AS table_name, COUNT(*) AS target_count FROM bosspickseoul_commercial_dev.service_category
UNION ALL SELECT 'facility_commercial', COUNT(*) FROM bosspickseoul_commercial_dev.facility_commercial
UNION ALL SELECT 'sales_administration', COUNT(*) FROM bosspickseoul_commercial_dev.sales_administration
UNION ALL SELECT 'sales_district', COUNT(*) FROM bosspickseoul_commercial_dev.sales_district
UNION ALL SELECT 'income_district', COUNT(*) FROM bosspickseoul_commercial_dev.income_district
UNION ALL SELECT 'store_district', COUNT(*) FROM bosspickseoul_commercial_dev.store_district
UNION ALL SELECT 'sales_commercial', COUNT(*) FROM bosspickseoul_commercial_dev.sales_commercial
UNION ALL SELECT 'store_commercial', COUNT(*) FROM bosspickseoul_commercial_dev.store_commercial
ORDER BY table_name;

-- 3) Small master table first.
-- service_type itself does not have service_type enum, so derive it from public-data metric tables.
INSERT INTO bosspickseoul_commercial_dev.service_category (
    id,
    service_code,
    service_code_name,
    service_type
)
SELECT
    st.id,
    st.service_code,
    st.service_code_name,
    derived.service_type
FROM nowdoboss.service_type st
LEFT JOIN (
    SELECT service_code, MAX(service_type) AS service_type
    FROM (
        SELECT service_code, service_type FROM nowdoboss.store_commercial WHERE service_type IS NOT NULL
        UNION ALL SELECT service_code, service_type FROM nowdoboss.sales_commercial WHERE service_type IS NOT NULL
        UNION ALL SELECT service_code, service_type FROM nowdoboss.store_district WHERE service_type IS NOT NULL
        UNION ALL SELECT service_code, service_type FROM nowdoboss.sales_district WHERE service_type IS NOT NULL
        UNION ALL SELECT service_code, service_type FROM nowdoboss.sales_administration WHERE service_type IS NOT NULL
    ) service_types
    GROUP BY service_code
) derived ON derived.service_code = st.service_code
ON DUPLICATE KEY UPDATE
    service_code = VALUES(service_code),
    service_code_name = VALUES(service_code_name),
    service_type = VALUES(service_type);

-- 4) Batch migration procedures.

DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_facility_commercial $$
CREATE PROCEDURE migrate_facility_commercial(IN p_batch_size INT)
BEGIN
    DECLARE v_from BIGINT;
    DECLARE v_to BIGINT;
    DECLARE v_max BIGINT;

    SELECT MIN(id), MAX(id) INTO v_from, v_max FROM nowdoboss.facility_commercial;

    WHILE v_from IS NOT NULL AND v_from <= v_max DO
        SET v_to = v_from + p_batch_size - 1;

        INSERT INTO bosspickseoul_commercial_dev.facility_commercial (
            id,
            period_code,
            commercial_classification_code,
            commercial_classification_name,
            commercial_code,
            commercial_name,
            total_facility_count,
            elementary_school_count,
            middle_school_count,
            high_school_count,
            university_count,
            subway_station_count,
            bus_stop_count
        )
        SELECT
            id,
            period_code,
            commercial_classification_code,
            commercial_classification_code_name,
            commercial_code,
            commercial_code_name,
            COALESCE(facility_cnt, 0),
            COALESCE(elementary_school_cnt, 0),
            COALESCE(middle_school_cnt, 0),
            COALESCE(high_school_cnt, 0),
            COALESCE(university_cnt, 0),
            COALESCE(subway_station_cnt, 0),
            COALESCE(bus_stop_cnt, 0)
        FROM nowdoboss.facility_commercial
        WHERE id BETWEEN v_from AND v_to
        ON DUPLICATE KEY UPDATE
            period_code = VALUES(period_code),
            commercial_classification_code = VALUES(commercial_classification_code),
            commercial_classification_name = VALUES(commercial_classification_name),
            commercial_code = VALUES(commercial_code),
            commercial_name = VALUES(commercial_name),
            total_facility_count = VALUES(total_facility_count),
            elementary_school_count = VALUES(elementary_school_count),
            middle_school_count = VALUES(middle_school_count),
            high_school_count = VALUES(high_school_count),
            university_count = VALUES(university_count),
            subway_station_count = VALUES(subway_station_count),
            bus_stop_count = VALUES(bus_stop_count);

        SELECT 'facility_commercial' AS table_name, v_from AS batch_from_id, v_to AS batch_to_id, ROW_COUNT() AS affected_rows;
        SET v_from = v_to + 1;
    END WHILE;
END $$

DROP PROCEDURE IF EXISTS migrate_sales_administration $$
CREATE PROCEDURE migrate_sales_administration(IN p_batch_size INT)
BEGIN
    DECLARE v_from BIGINT;
    DECLARE v_to BIGINT;
    DECLARE v_max BIGINT;

    SELECT MIN(id), MAX(id) INTO v_from, v_max FROM nowdoboss.sales_administration;

    WHILE v_from IS NOT NULL AND v_from <= v_max DO
        SET v_to = v_from + p_batch_size - 1;

        INSERT INTO bosspickseoul_commercial_dev.sales_administration (
            id,
            period_code,
            administration_code,
            administration_name,
            service_code,
            service_name,
            service_type,
            monthly_sales_amount,
            weekday_sales_amount,
            weekend_sales_amount
        )
        SELECT
            id,
            period_code,
            administration_code,
            administration_code_name,
            service_code,
            service_code_name,
            service_type,
            COALESCE(month_sales, 0),
            COALESCE(weekday_sales, 0),
            COALESCE(weekend_sales, 0)
        FROM nowdoboss.sales_administration
        WHERE id BETWEEN v_from AND v_to
        ON DUPLICATE KEY UPDATE
            period_code = VALUES(period_code),
            administration_code = VALUES(administration_code),
            administration_name = VALUES(administration_name),
            service_code = VALUES(service_code),
            service_name = VALUES(service_name),
            service_type = VALUES(service_type),
            monthly_sales_amount = VALUES(monthly_sales_amount),
            weekday_sales_amount = VALUES(weekday_sales_amount),
            weekend_sales_amount = VALUES(weekend_sales_amount);

        SELECT 'sales_administration' AS table_name, v_from AS batch_from_id, v_to AS batch_to_id, ROW_COUNT() AS affected_rows;
        SET v_from = v_to + 1;
    END WHILE;
END $$

DROP PROCEDURE IF EXISTS migrate_sales_district $$
CREATE PROCEDURE migrate_sales_district(IN p_batch_size INT)
BEGIN
    DECLARE v_from BIGINT;
    DECLARE v_to BIGINT;
    DECLARE v_max BIGINT;

    SELECT MIN(id), MAX(id) INTO v_from, v_max FROM nowdoboss.sales_district;

    WHILE v_from IS NOT NULL AND v_from <= v_max DO
        SET v_to = v_from + p_batch_size - 1;

        INSERT INTO bosspickseoul_commercial_dev.sales_district (
            id,
            period_code,
            district_code,
            district_name,
            service_code,
            service_name,
            service_type,
            monthly_sales_amount,
            monday_sales_amount,
            tuesday_sales_amount,
            wednesday_sales_amount,
            thursday_sales_amount,
            friday_sales_amount,
            saturday_sales_amount,
            sunday_sales_amount,
            sales_amount_time_00_06,
            sales_amount_time_06_11,
            sales_amount_time_11_14,
            sales_amount_time_14_17,
            sales_amount_time_17_21,
            sales_amount_time_21_24,
            male_sales_amount,
            female_sales_amount,
            age10_sales_amount,
            age20_sales_amount,
            age30_sales_amount,
            age40_sales_amount,
            age50_sales_amount,
            age60_plus_sales_amount
        )
        SELECT
            id,
            period_code,
            district_code,
            district_code_name,
            service_code,
            service_code_name,
            service_type,
            COALESCE(month_sales, 0),
            COALESCE(mon_sales, 0),
            COALESCE(tue_sales, 0),
            COALESCE(wed_sales, 0),
            COALESCE(thu_sales, 0),
            COALESCE(fri_sales, 0),
            COALESCE(sat_sales, 0),
            COALESCE(sun_sales, 0),
            COALESCE(sales_00, 0),
            COALESCE(sales_06, 0),
            COALESCE(sales_11, 0),
            COALESCE(sales_14, 0),
            COALESCE(sales_17, 0),
            COALESCE(sales_21, 0),
            COALESCE(male_sales, 0),
            COALESCE(female_sales, 0),
            COALESCE(teen_sales, 0),
            COALESCE(twenty_sales, 0),
            COALESCE(thirty_sales, 0),
            COALESCE(forty_sales, 0),
            COALESCE(fifty_sales, 0),
            COALESCE(sixty_sales, 0)
        FROM nowdoboss.sales_district
        WHERE id BETWEEN v_from AND v_to
        ON DUPLICATE KEY UPDATE
            period_code = VALUES(period_code),
            district_code = VALUES(district_code),
            district_name = VALUES(district_name),
            service_code = VALUES(service_code),
            service_name = VALUES(service_name),
            service_type = VALUES(service_type),
            monthly_sales_amount = VALUES(monthly_sales_amount),
            monday_sales_amount = VALUES(monday_sales_amount),
            tuesday_sales_amount = VALUES(tuesday_sales_amount),
            wednesday_sales_amount = VALUES(wednesday_sales_amount),
            thursday_sales_amount = VALUES(thursday_sales_amount),
            friday_sales_amount = VALUES(friday_sales_amount),
            saturday_sales_amount = VALUES(saturday_sales_amount),
            sunday_sales_amount = VALUES(sunday_sales_amount),
            sales_amount_time_00_06 = VALUES(sales_amount_time_00_06),
            sales_amount_time_06_11 = VALUES(sales_amount_time_06_11),
            sales_amount_time_11_14 = VALUES(sales_amount_time_11_14),
            sales_amount_time_14_17 = VALUES(sales_amount_time_14_17),
            sales_amount_time_17_21 = VALUES(sales_amount_time_17_21),
            sales_amount_time_21_24 = VALUES(sales_amount_time_21_24),
            male_sales_amount = VALUES(male_sales_amount),
            female_sales_amount = VALUES(female_sales_amount),
            age10_sales_amount = VALUES(age10_sales_amount),
            age20_sales_amount = VALUES(age20_sales_amount),
            age30_sales_amount = VALUES(age30_sales_amount),
            age40_sales_amount = VALUES(age40_sales_amount),
            age50_sales_amount = VALUES(age50_sales_amount),
            age60_plus_sales_amount = VALUES(age60_plus_sales_amount);

        SELECT 'sales_district' AS table_name, v_from AS batch_from_id, v_to AS batch_to_id, ROW_COUNT() AS affected_rows;
        SET v_from = v_to + 1;
    END WHILE;
END $$

DROP PROCEDURE IF EXISTS migrate_income_district $$
CREATE PROCEDURE migrate_income_district(IN p_batch_size INT)
BEGIN
    DECLARE v_from BIGINT;
    DECLARE v_to BIGINT;
    DECLARE v_max BIGINT;

    SELECT MIN(id), MAX(id) INTO v_from, v_max FROM nowdoboss.income_district;

    WHILE v_from IS NOT NULL AND v_from <= v_max DO
        SET v_to = v_from + p_batch_size - 1;

        INSERT INTO bosspickseoul_commercial_dev.income_district (
            id,
            period_code,
            district_code,
            district_name,
            total_expense_amount
        )
        SELECT
            id,
            period_code,
            district_code,
            district_code_name,
            COALESCE(total_price, 0)
        FROM nowdoboss.income_district
        WHERE id BETWEEN v_from AND v_to
        ON DUPLICATE KEY UPDATE
            period_code = VALUES(period_code),
            district_code = VALUES(district_code),
            district_name = VALUES(district_name),
            total_expense_amount = VALUES(total_expense_amount);

        SELECT 'income_district' AS table_name, v_from AS batch_from_id, v_to AS batch_to_id, ROW_COUNT() AS affected_rows;
        SET v_from = v_to + 1;
    END WHILE;
END $$

DROP PROCEDURE IF EXISTS migrate_store_district $$
CREATE PROCEDURE migrate_store_district(IN p_batch_size INT)
BEGIN
    DECLARE v_from BIGINT;
    DECLARE v_to BIGINT;
    DECLARE v_max BIGINT;

    SELECT MIN(id), MAX(id) INTO v_from, v_max FROM nowdoboss.store_district;

    WHILE v_from IS NOT NULL AND v_from <= v_max DO
        SET v_to = v_from + p_batch_size - 1;

        INSERT INTO bosspickseoul_commercial_dev.store_district (
            id,
            period_code,
            district_code,
            district_name,
            service_code,
            service_name,
            service_type,
            total_store_count,
            similar_store_count,
            opened_store_count,
            closed_store_count,
            franchise_store_count,
            opening_rate,
            closure_rate
        )
        SELECT
            id,
            period_code,
            district_code,
            district_code_name,
            service_code,
            service_code_name,
            service_type,
            COALESCE(total_store, 0),
            COALESCE(similar_store, 0),
            COALESCE(opened_store, 0),
            COALESCE(closed_store, 0),
            COALESCE(franchise_store, 0),
            COALESCE(opened_rate, 0),
            COALESCE(closed_rate, 0)
        FROM nowdoboss.store_district
        WHERE id BETWEEN v_from AND v_to
        ON DUPLICATE KEY UPDATE
            period_code = VALUES(period_code),
            district_code = VALUES(district_code),
            district_name = VALUES(district_name),
            service_code = VALUES(service_code),
            service_name = VALUES(service_name),
            service_type = VALUES(service_type),
            total_store_count = VALUES(total_store_count),
            similar_store_count = VALUES(similar_store_count),
            opened_store_count = VALUES(opened_store_count),
            closed_store_count = VALUES(closed_store_count),
            franchise_store_count = VALUES(franchise_store_count),
            opening_rate = VALUES(opening_rate),
            closure_rate = VALUES(closure_rate);

        SELECT 'store_district' AS table_name, v_from AS batch_from_id, v_to AS batch_to_id, ROW_COUNT() AS affected_rows;
        SET v_from = v_to + 1;
    END WHILE;
END $$

DROP PROCEDURE IF EXISTS migrate_sales_commercial $$
CREATE PROCEDURE migrate_sales_commercial(IN p_batch_size INT)
BEGIN
    DECLARE v_from BIGINT;
    DECLARE v_to BIGINT;
    DECLARE v_max BIGINT;

    SELECT MIN(id), MAX(id) INTO v_from, v_max FROM nowdoboss.sales_commercial;

    WHILE v_from IS NOT NULL AND v_from <= v_max DO
        SET v_to = v_from + p_batch_size - 1;

        INSERT INTO bosspickseoul_commercial_dev.sales_commercial (
            id,
            period_code,
            commercial_classification_code,
            commercial_classification_name,
            commercial_code,
            commercial_name,
            service_code,
            service_name,
            service_type,
            monthly_sales_amount,
            monday_sales_amount,
            tuesday_sales_amount,
            wednesday_sales_amount,
            thursday_sales_amount,
            friday_sales_amount,
            saturday_sales_amount,
            sunday_sales_amount,
            sales_amount_time_00_06,
            sales_amount_time_06_11,
            sales_amount_time_11_14,
            sales_amount_time_14_17,
            sales_amount_time_17_21,
            sales_amount_time_21_24,
            male_sales_amount,
            female_sales_amount,
            age10_sales_amount,
            age20_sales_amount,
            age30_sales_amount,
            age40_sales_amount,
            age50_sales_amount,
            age60_plus_sales_amount,
            monday_sales_count,
            tuesday_sales_count,
            wednesday_sales_count,
            thursday_sales_count,
            friday_sales_count,
            saturday_sales_count,
            sunday_sales_count,
            sales_count_time_00_06,
            sales_count_time_06_11,
            sales_count_time_11_14,
            sales_count_time_14_17,
            sales_count_time_17_21,
            sales_count_time_21_24,
            male_sales_count,
            female_sales_count
        )
        SELECT
            id,
            period_code,
            commercial_classification_code,
            commercial_classification_code_name,
            commercial_code,
            commercial_code_name,
            service_code,
            service_code_name,
            service_type,
            COALESCE(month_sales, 0),
            COALESCE(mon_sales, 0),
            COALESCE(tue_sales, 0),
            COALESCE(wed_sales, 0),
            COALESCE(thu_sales, 0),
            COALESCE(fri_sales, 0),
            COALESCE(sat_sales, 0),
            COALESCE(sun_sales, 0),
            COALESCE(sales_00, 0),
            COALESCE(sales_06, 0),
            COALESCE(sales_11, 0),
            COALESCE(sales_14, 0),
            COALESCE(sales_17, 0),
            COALESCE(sales_21, 0),
            COALESCE(male_sales, 0),
            COALESCE(female_sales, 0),
            COALESCE(teen_sales, 0),
            COALESCE(twenty_sales, 0),
            COALESCE(thirty_sales, 0),
            COALESCE(forty_sales, 0),
            COALESCE(fifty_sales, 0),
            COALESCE(sixty_sales, 0),
            COALESCE(mon_sales_count, 0),
            COALESCE(tue_sales_count, 0),
            COALESCE(wed_sales_count, 0),
            COALESCE(thu_sales_count, 0),
            COALESCE(fri_sales_count, 0),
            COALESCE(sat_sales_count, 0),
            COALESCE(sun_sales_count, 0),
            COALESCE(sales_count_00, 0),
            COALESCE(sales_count_06, 0),
            COALESCE(sales_count_11, 0),
            COALESCE(sales_count_14, 0),
            COALESCE(sales_count_17, 0),
            COALESCE(sales_count_21, 0),
            COALESCE(male_sales_count, 0),
            COALESCE(female_sales_count, 0)
        FROM nowdoboss.sales_commercial
        WHERE id BETWEEN v_from AND v_to
        ON DUPLICATE KEY UPDATE
            period_code = VALUES(period_code),
            commercial_classification_code = VALUES(commercial_classification_code),
            commercial_classification_name = VALUES(commercial_classification_name),
            commercial_code = VALUES(commercial_code),
            commercial_name = VALUES(commercial_name),
            service_code = VALUES(service_code),
            service_name = VALUES(service_name),
            service_type = VALUES(service_type),
            monthly_sales_amount = VALUES(monthly_sales_amount),
            monday_sales_amount = VALUES(monday_sales_amount),
            tuesday_sales_amount = VALUES(tuesday_sales_amount),
            wednesday_sales_amount = VALUES(wednesday_sales_amount),
            thursday_sales_amount = VALUES(thursday_sales_amount),
            friday_sales_amount = VALUES(friday_sales_amount),
            saturday_sales_amount = VALUES(saturday_sales_amount),
            sunday_sales_amount = VALUES(sunday_sales_amount),
            sales_amount_time_00_06 = VALUES(sales_amount_time_00_06),
            sales_amount_time_06_11 = VALUES(sales_amount_time_06_11),
            sales_amount_time_11_14 = VALUES(sales_amount_time_11_14),
            sales_amount_time_14_17 = VALUES(sales_amount_time_14_17),
            sales_amount_time_17_21 = VALUES(sales_amount_time_17_21),
            sales_amount_time_21_24 = VALUES(sales_amount_time_21_24),
            male_sales_amount = VALUES(male_sales_amount),
            female_sales_amount = VALUES(female_sales_amount),
            age10_sales_amount = VALUES(age10_sales_amount),
            age20_sales_amount = VALUES(age20_sales_amount),
            age30_sales_amount = VALUES(age30_sales_amount),
            age40_sales_amount = VALUES(age40_sales_amount),
            age50_sales_amount = VALUES(age50_sales_amount),
            age60_plus_sales_amount = VALUES(age60_plus_sales_amount),
            monday_sales_count = VALUES(monday_sales_count),
            tuesday_sales_count = VALUES(tuesday_sales_count),
            wednesday_sales_count = VALUES(wednesday_sales_count),
            thursday_sales_count = VALUES(thursday_sales_count),
            friday_sales_count = VALUES(friday_sales_count),
            saturday_sales_count = VALUES(saturday_sales_count),
            sunday_sales_count = VALUES(sunday_sales_count),
            sales_count_time_00_06 = VALUES(sales_count_time_00_06),
            sales_count_time_06_11 = VALUES(sales_count_time_06_11),
            sales_count_time_11_14 = VALUES(sales_count_time_11_14),
            sales_count_time_14_17 = VALUES(sales_count_time_14_17),
            sales_count_time_17_21 = VALUES(sales_count_time_17_21),
            sales_count_time_21_24 = VALUES(sales_count_time_21_24),
            male_sales_count = VALUES(male_sales_count),
            female_sales_count = VALUES(female_sales_count);

        SELECT 'sales_commercial' AS table_name, v_from AS batch_from_id, v_to AS batch_to_id, ROW_COUNT() AS affected_rows;
        SET v_from = v_to + 1;
    END WHILE;
END $$

DROP PROCEDURE IF EXISTS migrate_store_commercial $$
CREATE PROCEDURE migrate_store_commercial(IN p_batch_size INT)
BEGIN
    DECLARE v_from BIGINT;
    DECLARE v_to BIGINT;
    DECLARE v_max BIGINT;

    SELECT MIN(id), MAX(id) INTO v_from, v_max FROM nowdoboss.store_commercial;

    WHILE v_from IS NOT NULL AND v_from <= v_max DO
        SET v_to = v_from + p_batch_size - 1;

        INSERT INTO bosspickseoul_commercial_dev.store_commercial (
            id,
            period_code,
            commercial_classification_code,
            commercial_classification_name,
            commercial_code,
            commercial_name,
            service_code,
            service_name,
            service_type,
            total_store_count,
            similar_store_count,
            opening_rate,
            opened_store_count,
            closure_rate,
            closed_store_count,
            franchise_store_count
        )
        SELECT
            id,
            period_code,
            commercial_classification_code,
            commercial_classification_code_name,
            commercial_code,
            commercial_code_name,
            service_code,
            service_code_name,
            service_type,
            COALESCE(total_store, 0),
            COALESCE(similar_store, 0),
            COALESCE(opened_rate, 0),
            COALESCE(opened_store, 0),
            COALESCE(closed_rate, 0),
            COALESCE(closed_store, 0),
            COALESCE(franchise_store, 0)
        FROM nowdoboss.store_commercial
        WHERE id BETWEEN v_from AND v_to
        ON DUPLICATE KEY UPDATE
            period_code = VALUES(period_code),
            commercial_classification_code = VALUES(commercial_classification_code),
            commercial_classification_name = VALUES(commercial_classification_name),
            commercial_code = VALUES(commercial_code),
            commercial_name = VALUES(commercial_name),
            service_code = VALUES(service_code),
            service_name = VALUES(service_name),
            service_type = VALUES(service_type),
            total_store_count = VALUES(total_store_count),
            similar_store_count = VALUES(similar_store_count),
            opening_rate = VALUES(opening_rate),
            opened_store_count = VALUES(opened_store_count),
            closure_rate = VALUES(closure_rate),
            closed_store_count = VALUES(closed_store_count),
            franchise_store_count = VALUES(franchise_store_count);

        SELECT 'store_commercial' AS table_name, v_from AS batch_from_id, v_to AS batch_to_id, ROW_COUNT() AS affected_rows;
        SET v_from = v_to + 1;
    END WHILE;
END $$

DELIMITER ;

-- 5) Run migrations in a safe order.
CALL migrate_facility_commercial(@batch_size);
CALL migrate_sales_administration(@batch_size);
CALL migrate_sales_district(@batch_size);
CALL migrate_income_district(@batch_size);
CALL migrate_store_district(@batch_size);
CALL migrate_sales_commercial(@batch_size);
CALL migrate_store_commercial(@batch_size);

DROP PROCEDURE IF EXISTS migrate_store_commercial;
DROP PROCEDURE IF EXISTS migrate_sales_commercial;
DROP PROCEDURE IF EXISTS migrate_store_district;
DROP PROCEDURE IF EXISTS migrate_income_district;
DROP PROCEDURE IF EXISTS migrate_sales_district;
DROP PROCEDURE IF EXISTS migrate_sales_administration;
DROP PROCEDURE IF EXISTS migrate_facility_commercial;

-- 6) Count validation after migration.
-- migrated_target_id_count should match source_count.
-- target_extra_id_count is only informational. It can be greater than 0 after you later add other years.
SELECT
    'service_category' AS table_name,
    (SELECT COUNT(*) FROM nowdoboss.service_type) AS source_count,
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.service_category t JOIN nowdoboss.service_type s ON s.id = t.id) AS migrated_target_id_count,
    (SELECT COUNT(*) FROM nowdoboss.service_type s LEFT JOIN bosspickseoul_commercial_dev.service_category t ON t.id = s.id WHERE t.id IS NULL) AS missing_source_id_count,
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.service_category t LEFT JOIN nowdoboss.service_type s ON s.id = t.id WHERE s.id IS NULL) AS target_extra_id_count
UNION ALL
SELECT
    'facility_commercial',
    (SELECT COUNT(*) FROM nowdoboss.facility_commercial),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.facility_commercial t JOIN nowdoboss.facility_commercial s ON s.id = t.id),
    (SELECT COUNT(*) FROM nowdoboss.facility_commercial s LEFT JOIN bosspickseoul_commercial_dev.facility_commercial t ON t.id = s.id WHERE t.id IS NULL),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.facility_commercial t LEFT JOIN nowdoboss.facility_commercial s ON s.id = t.id WHERE s.id IS NULL)
UNION ALL
SELECT
    'sales_administration',
    (SELECT COUNT(*) FROM nowdoboss.sales_administration),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.sales_administration t JOIN nowdoboss.sales_administration s ON s.id = t.id),
    (SELECT COUNT(*) FROM nowdoboss.sales_administration s LEFT JOIN bosspickseoul_commercial_dev.sales_administration t ON t.id = s.id WHERE t.id IS NULL),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.sales_administration t LEFT JOIN nowdoboss.sales_administration s ON s.id = t.id WHERE s.id IS NULL)
UNION ALL
SELECT
    'sales_district',
    (SELECT COUNT(*) FROM nowdoboss.sales_district),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.sales_district t JOIN nowdoboss.sales_district s ON s.id = t.id),
    (SELECT COUNT(*) FROM nowdoboss.sales_district s LEFT JOIN bosspickseoul_commercial_dev.sales_district t ON t.id = s.id WHERE t.id IS NULL),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.sales_district t LEFT JOIN nowdoboss.sales_district s ON s.id = t.id WHERE s.id IS NULL)
UNION ALL
SELECT
    'income_district',
    (SELECT COUNT(*) FROM nowdoboss.income_district),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.income_district t JOIN nowdoboss.income_district s ON s.id = t.id),
    (SELECT COUNT(*) FROM nowdoboss.income_district s LEFT JOIN bosspickseoul_commercial_dev.income_district t ON t.id = s.id WHERE t.id IS NULL),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.income_district t LEFT JOIN nowdoboss.income_district s ON s.id = t.id WHERE s.id IS NULL)
UNION ALL
SELECT
    'store_district',
    (SELECT COUNT(*) FROM nowdoboss.store_district),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.store_district t JOIN nowdoboss.store_district s ON s.id = t.id),
    (SELECT COUNT(*) FROM nowdoboss.store_district s LEFT JOIN bosspickseoul_commercial_dev.store_district t ON t.id = s.id WHERE t.id IS NULL),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.store_district t LEFT JOIN nowdoboss.store_district s ON s.id = t.id WHERE s.id IS NULL)
UNION ALL
SELECT
    'sales_commercial',
    (SELECT COUNT(*) FROM nowdoboss.sales_commercial),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.sales_commercial t JOIN nowdoboss.sales_commercial s ON s.id = t.id),
    (SELECT COUNT(*) FROM nowdoboss.sales_commercial s LEFT JOIN bosspickseoul_commercial_dev.sales_commercial t ON t.id = s.id WHERE t.id IS NULL),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.sales_commercial t LEFT JOIN nowdoboss.sales_commercial s ON s.id = t.id WHERE s.id IS NULL)
UNION ALL
SELECT
    'store_commercial',
    (SELECT COUNT(*) FROM nowdoboss.store_commercial),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.store_commercial t JOIN nowdoboss.store_commercial s ON s.id = t.id),
    (SELECT COUNT(*) FROM nowdoboss.store_commercial s LEFT JOIN bosspickseoul_commercial_dev.store_commercial t ON t.id = s.id WHERE t.id IS NULL),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.store_commercial t LEFT JOIN nowdoboss.store_commercial s ON s.id = t.id WHERE s.id IS NULL)
ORDER BY table_name;

-- 7) Excluded source tables for this migration.
-- These are not migrated here because there is no matching current BossPickSeoul public-data analysis entity/table,
-- or the dump is empty and should be filled later from Open API CSV/Excel data.
SELECT 'share' AS excluded_source_table, 'no matching current analysis entity' AS reason
UNION ALL SELECT 'franchisee', 'no matching current analysis entity'
UNION ALL SELECT 'rent', 'no matching current analysis entity'
UNION ALL SELECT 'startup_support', 'no matching current analysis entity'
UNION ALL SELECT 'population_commercial', 'source dump is empty; migrate later from Open API data'
UNION ALL SELECT 'flyway_schema_history', 'schema history must not be migrated as domain data'
UNION ALL SELECT 'chat_room_member', 'not public-data commercial/district/administration data'
UNION ALL SELECT 'image', 'not public-data commercial/district/administration data';
