-- nowdoboss -> bosspickseoul remaining commercial data migration runbook.
-- Run this after nowdoboss-to-bosspickseoul-commercial-after-area-runbook.sql.
--
-- Migrated here:
-- - change_district
-- - foot_traffic_commercial
-- - foot_traffic_district
-- - income_administration
-- - income_commercial
-- - population_commercial
-- - store_administration
--
-- Not migrated here:
-- - change_commercial: source table was not found in the nowdoboss source-column inventory.

SET SESSION net_read_timeout = 600;
SET SESSION net_write_timeout = 600;
SET SESSION wait_timeout = 28800;
SET SESSION max_execution_time = 0;

USE bosspickseoul_commercial_dev;

SET @batch_size = 20000;

-- 1) Source counts before migration.
SELECT 'change_district' AS table_name, COUNT(*) AS source_count FROM nowdoboss.change_district
UNION ALL SELECT 'foot_traffic_commercial', COUNT(*) FROM nowdoboss.foot_traffic_commercial
UNION ALL SELECT 'foot_traffic_district', COUNT(*) FROM nowdoboss.foot_traffic_district
UNION ALL SELECT 'income_administration', COUNT(*) FROM nowdoboss.income_administration
UNION ALL SELECT 'income_commercial', COUNT(*) FROM nowdoboss.income_commercial
UNION ALL SELECT 'population_commercial', COUNT(*) FROM nowdoboss.population_commercial
UNION ALL SELECT 'store_administration', COUNT(*) FROM nowdoboss.store_administration
ORDER BY table_name;

-- 2) Current target counts before migration.
SELECT 'change_district' AS table_name, COUNT(*) AS target_count FROM bosspickseoul_commercial_dev.change_district
UNION ALL SELECT 'foot_traffic_commercial', COUNT(*) FROM bosspickseoul_commercial_dev.foot_traffic_commercial
UNION ALL SELECT 'foot_traffic_district', COUNT(*) FROM bosspickseoul_commercial_dev.foot_traffic_district
UNION ALL SELECT 'income_administration', COUNT(*) FROM bosspickseoul_commercial_dev.income_administration
UNION ALL SELECT 'income_commercial', COUNT(*) FROM bosspickseoul_commercial_dev.income_commercial
UNION ALL SELECT 'population_commercial', COUNT(*) FROM bosspickseoul_commercial_dev.population_commercial
UNION ALL SELECT 'store_administration', COUNT(*) FROM bosspickseoul_commercial_dev.store_administration
ORDER BY table_name;

-- 3) change_commercial source check.
-- If source_exists = 0, load change_commercial later from Open API CSV/Excel.
SELECT
    EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'nowdoboss'
          AND table_name = 'change_commercial'
    ) AS change_commercial_source_exists,
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.change_commercial) AS change_commercial_target_count;

DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_change_district_remaining $$
CREATE PROCEDURE migrate_change_district_remaining(IN p_batch_size INT)
BEGIN
    DECLARE v_from BIGINT;
    DECLARE v_to BIGINT;
    DECLARE v_max BIGINT;

    SELECT MIN(id), MAX(id) INTO v_from, v_max FROM nowdoboss.change_district;

    WHILE v_from IS NOT NULL AND v_from <= v_max DO
        SET v_to = v_from + p_batch_size - 1;

        INSERT INTO bosspickseoul_commercial_dev.change_district (
            id,
            average_closed_months,
            average_opened_months,
            change_indicator_code,
            change_indicator_name,
            district_code,
            district_name,
            period_code
        )
        SELECT
            id,
            COALESCE(closed_months, 0),
            COALESCE(opened_months, 0),
            change_indicator,
            COALESCE(change_indicator_name, ''),
            district_code,
            district_code_name,
            period_code
        FROM nowdoboss.change_district
        WHERE id BETWEEN v_from AND v_to
        ON DUPLICATE KEY UPDATE
            average_closed_months = VALUES(average_closed_months),
            average_opened_months = VALUES(average_opened_months),
            change_indicator_code = VALUES(change_indicator_code),
            change_indicator_name = VALUES(change_indicator_name),
            district_code = VALUES(district_code),
            district_name = VALUES(district_name),
            period_code = VALUES(period_code);

        SELECT 'change_district' AS table_name, v_from AS batch_from_id, v_to AS batch_to_id, ROW_COUNT() AS affected_rows;
        SET v_from = v_to + 1;
    END WHILE;
END $$

DROP PROCEDURE IF EXISTS migrate_foot_traffic_commercial_remaining $$
CREATE PROCEDURE migrate_foot_traffic_commercial_remaining(IN p_batch_size INT)
BEGIN
    DECLARE v_from BIGINT;
    DECLARE v_to BIGINT;
    DECLARE v_max BIGINT;

    SELECT MIN(id), MAX(id) INTO v_from, v_max FROM nowdoboss.foot_traffic_commercial;

    WHILE v_from IS NOT NULL AND v_from <= v_max DO
        SET v_to = v_from + p_batch_size - 1;

        INSERT INTO bosspickseoul_commercial_dev.foot_traffic_commercial (
            id,
            age10_foot_traffic,
            age20_foot_traffic,
            age30_foot_traffic,
            age40_foot_traffic,
            age50_foot_traffic,
            age60_plus_foot_traffic,
            commercial_classification_code,
            commercial_classification_name,
            commercial_code,
            commercial_name,
            female_foot_traffic,
            foot_traffic_time_00_06,
            foot_traffic_time_06_11,
            foot_traffic_time_11_14,
            foot_traffic_time_14_17,
            foot_traffic_time_17_21,
            foot_traffic_time_21_24,
            friday_foot_traffic,
            male_foot_traffic,
            monday_foot_traffic,
            period_code,
            saturday_foot_traffic,
            sunday_foot_traffic,
            thursday_foot_traffic,
            total_foot_traffic,
            tuesday_foot_traffic,
            wednesday_foot_traffic
        )
        SELECT
            id,
            COALESCE(teen_foot_traffic, 0),
            COALESCE(twenty_foot_traffic, 0),
            COALESCE(thirty_foot_traffic, 0),
            COALESCE(forty_foot_traffic, 0),
            COALESCE(fifty_foot_traffic, 0),
            COALESCE(sixty_foot_traffic, 0),
            commercial_classification_code,
            commercial_classification_code_name,
            commercial_code,
            commercial_code_name,
            COALESCE(female_foot_traffic, 0),
            COALESCE(foot_traffic_00, 0),
            COALESCE(foot_traffic_06, 0),
            COALESCE(foot_traffic_11, 0),
            COALESCE(foot_traffic_14, 0),
            COALESCE(foot_traffic_17, 0),
            COALESCE(foot_traffic_21, 0),
            COALESCE(fri_foot_traffic, 0),
            COALESCE(male_foot_traffic, 0),
            COALESCE(mon_foot_traffic, 0),
            period_code,
            COALESCE(sat_foot_traffic, 0),
            COALESCE(sun_foot_traffic, 0),
            COALESCE(thu_foot_traffic, 0),
            COALESCE(total_foot_traffic, 0),
            COALESCE(tue_foot_traffic, 0),
            COALESCE(wed_foot_traffic, 0)
        FROM nowdoboss.foot_traffic_commercial
        WHERE id BETWEEN v_from AND v_to
        ON DUPLICATE KEY UPDATE
            age10_foot_traffic = VALUES(age10_foot_traffic),
            age20_foot_traffic = VALUES(age20_foot_traffic),
            age30_foot_traffic = VALUES(age30_foot_traffic),
            age40_foot_traffic = VALUES(age40_foot_traffic),
            age50_foot_traffic = VALUES(age50_foot_traffic),
            age60_plus_foot_traffic = VALUES(age60_plus_foot_traffic),
            commercial_classification_code = VALUES(commercial_classification_code),
            commercial_classification_name = VALUES(commercial_classification_name),
            commercial_code = VALUES(commercial_code),
            commercial_name = VALUES(commercial_name),
            female_foot_traffic = VALUES(female_foot_traffic),
            foot_traffic_time_00_06 = VALUES(foot_traffic_time_00_06),
            foot_traffic_time_06_11 = VALUES(foot_traffic_time_06_11),
            foot_traffic_time_11_14 = VALUES(foot_traffic_time_11_14),
            foot_traffic_time_14_17 = VALUES(foot_traffic_time_14_17),
            foot_traffic_time_17_21 = VALUES(foot_traffic_time_17_21),
            foot_traffic_time_21_24 = VALUES(foot_traffic_time_21_24),
            friday_foot_traffic = VALUES(friday_foot_traffic),
            male_foot_traffic = VALUES(male_foot_traffic),
            monday_foot_traffic = VALUES(monday_foot_traffic),
            period_code = VALUES(period_code),
            saturday_foot_traffic = VALUES(saturday_foot_traffic),
            sunday_foot_traffic = VALUES(sunday_foot_traffic),
            thursday_foot_traffic = VALUES(thursday_foot_traffic),
            total_foot_traffic = VALUES(total_foot_traffic),
            tuesday_foot_traffic = VALUES(tuesday_foot_traffic),
            wednesday_foot_traffic = VALUES(wednesday_foot_traffic);

        SELECT 'foot_traffic_commercial' AS table_name, v_from AS batch_from_id, v_to AS batch_to_id, ROW_COUNT() AS affected_rows;
        SET v_from = v_to + 1;
    END WHILE;
END $$

DROP PROCEDURE IF EXISTS migrate_foot_traffic_district_remaining $$
CREATE PROCEDURE migrate_foot_traffic_district_remaining(IN p_batch_size INT)
BEGIN
    DECLARE v_from BIGINT;
    DECLARE v_to BIGINT;
    DECLARE v_max BIGINT;

    SELECT MIN(id), MAX(id) INTO v_from, v_max FROM nowdoboss.foot_traffic_district;

    WHILE v_from IS NOT NULL AND v_from <= v_max DO
        SET v_to = v_from + p_batch_size - 1;

        INSERT INTO bosspickseoul_commercial_dev.foot_traffic_district (
            id,
            age10_foot_traffic,
            age20_foot_traffic,
            age30_foot_traffic,
            age40_foot_traffic,
            age50_foot_traffic,
            age60_plus_foot_traffic,
            district_code,
            district_name,
            female_foot_traffic,
            foot_traffic_time_00_06,
            foot_traffic_time_06_11,
            foot_traffic_time_11_14,
            foot_traffic_time_14_17,
            foot_traffic_time_17_21,
            foot_traffic_time_21_24,
            friday_foot_traffic,
            male_foot_traffic,
            monday_foot_traffic,
            period_code,
            saturday_foot_traffic,
            sunday_foot_traffic,
            thursday_foot_traffic,
            total_foot_traffic,
            tuesday_foot_traffic,
            wednesday_foot_traffic
        )
        SELECT
            id,
            COALESCE(teen_foot_traffic, 0),
            COALESCE(twenty_foot_traffic, 0),
            COALESCE(thirty_foot_traffic, 0),
            COALESCE(forty_foot_traffic, 0),
            COALESCE(fifty_foot_traffic, 0),
            COALESCE(sixty_foot_traffic, 0),
            district_code,
            district_code_name,
            COALESCE(female_foot_traffic, 0),
            COALESCE(foot_traffic_00, 0),
            COALESCE(foot_traffic_06, 0),
            COALESCE(foot_traffic_11, 0),
            COALESCE(foot_traffic_14, 0),
            COALESCE(foot_traffic_17, 0),
            COALESCE(foot_traffic_21, 0),
            COALESCE(fri_foot_traffic, 0),
            COALESCE(male_foot_traffic, 0),
            COALESCE(mon_foot_traffic, 0),
            period_code,
            COALESCE(sat_foot_traffic, 0),
            COALESCE(sun_foot_traffic, 0),
            COALESCE(thu_foot_traffic, 0),
            COALESCE(total_foot_traffic, 0),
            COALESCE(tue_foot_traffic, 0),
            COALESCE(wed_foot_traffic, 0)
        FROM nowdoboss.foot_traffic_district
        WHERE id BETWEEN v_from AND v_to
        ON DUPLICATE KEY UPDATE
            age10_foot_traffic = VALUES(age10_foot_traffic),
            age20_foot_traffic = VALUES(age20_foot_traffic),
            age30_foot_traffic = VALUES(age30_foot_traffic),
            age40_foot_traffic = VALUES(age40_foot_traffic),
            age50_foot_traffic = VALUES(age50_foot_traffic),
            age60_plus_foot_traffic = VALUES(age60_plus_foot_traffic),
            district_code = VALUES(district_code),
            district_name = VALUES(district_name),
            female_foot_traffic = VALUES(female_foot_traffic),
            foot_traffic_time_00_06 = VALUES(foot_traffic_time_00_06),
            foot_traffic_time_06_11 = VALUES(foot_traffic_time_06_11),
            foot_traffic_time_11_14 = VALUES(foot_traffic_time_11_14),
            foot_traffic_time_14_17 = VALUES(foot_traffic_time_14_17),
            foot_traffic_time_17_21 = VALUES(foot_traffic_time_17_21),
            foot_traffic_time_21_24 = VALUES(foot_traffic_time_21_24),
            friday_foot_traffic = VALUES(friday_foot_traffic),
            male_foot_traffic = VALUES(male_foot_traffic),
            monday_foot_traffic = VALUES(monday_foot_traffic),
            period_code = VALUES(period_code),
            saturday_foot_traffic = VALUES(saturday_foot_traffic),
            sunday_foot_traffic = VALUES(sunday_foot_traffic),
            thursday_foot_traffic = VALUES(thursday_foot_traffic),
            total_foot_traffic = VALUES(total_foot_traffic),
            tuesday_foot_traffic = VALUES(tuesday_foot_traffic),
            wednesday_foot_traffic = VALUES(wednesday_foot_traffic);

        SELECT 'foot_traffic_district' AS table_name, v_from AS batch_from_id, v_to AS batch_to_id, ROW_COUNT() AS affected_rows;
        SET v_from = v_to + 1;
    END WHILE;
END $$

DROP PROCEDURE IF EXISTS migrate_income_administration_remaining $$
CREATE PROCEDURE migrate_income_administration_remaining(IN p_batch_size INT)
BEGIN
    DECLARE v_from BIGINT;
    DECLARE v_to BIGINT;
    DECLARE v_max BIGINT;

    SELECT MIN(id), MAX(id) INTO v_from, v_max FROM nowdoboss.income_administration;

    WHILE v_from IS NOT NULL AND v_from <= v_max DO
        SET v_to = v_from + p_batch_size - 1;

        INSERT INTO bosspickseoul_commercial_dev.income_administration (
            id,
            administration_code,
            administration_name,
            period_code,
            total_expense_amount
        )
        SELECT
            id,
            administration_code,
            administration_code_name,
            period_code,
            COALESCE(total_price, 0)
        FROM nowdoboss.income_administration
        WHERE id BETWEEN v_from AND v_to
        ON DUPLICATE KEY UPDATE
            administration_code = VALUES(administration_code),
            administration_name = VALUES(administration_name),
            period_code = VALUES(period_code),
            total_expense_amount = VALUES(total_expense_amount);

        SELECT 'income_administration' AS table_name, v_from AS batch_from_id, v_to AS batch_to_id, ROW_COUNT() AS affected_rows;
        SET v_from = v_to + 1;
    END WHILE;
END $$

DROP PROCEDURE IF EXISTS migrate_income_commercial_remaining $$
CREATE PROCEDURE migrate_income_commercial_remaining(IN p_batch_size INT)
BEGIN
    DECLARE v_from BIGINT;
    DECLARE v_to BIGINT;
    DECLARE v_max BIGINT;

    SELECT MIN(id), MAX(id) INTO v_from, v_max FROM nowdoboss.income_commercial;

    WHILE v_from IS NOT NULL AND v_from <= v_max DO
        SET v_to = v_from + p_batch_size - 1;

        INSERT INTO bosspickseoul_commercial_dev.income_commercial (
            id,
            clothing_expense_amount,
            commercial_classification_code,
            commercial_classification_name,
            commercial_code,
            commercial_name,
            culture_expense_amount,
            education_expense_amount,
            entertainment_expense_amount,
            grocery_expense_amount,
            household_expense_amount,
            income_bracket_code,
            leisure_expense_amount,
            medical_expense_amount,
            monthly_average_income_amount,
            period_code,
            total_expense_amount,
            transportation_expense_amount
        )
        SELECT
            id,
            COALESCE(clothes_price, 0),
            commercial_classification_code,
            commercial_classification_code_name,
            commercial_code,
            commercial_code_name,
            COALESCE(culture_price, 0),
            COALESCE(education_price, 0),
            COALESCE(luxury_price, 0),
            COALESCE(grocery_price, 0),
            COALESCE(life_price, 0),
            COALESCE(income_section_code, 0),
            COALESCE(leisure_price, 0),
            COALESCE(medical_price, 0),
            COALESCE(month_avg_income, 0),
            period_code,
            COALESCE(total_price, 0),
            COALESCE(traffic_price, 0)
        FROM nowdoboss.income_commercial
        WHERE id BETWEEN v_from AND v_to
        ON DUPLICATE KEY UPDATE
            clothing_expense_amount = VALUES(clothing_expense_amount),
            commercial_classification_code = VALUES(commercial_classification_code),
            commercial_classification_name = VALUES(commercial_classification_name),
            commercial_code = VALUES(commercial_code),
            commercial_name = VALUES(commercial_name),
            culture_expense_amount = VALUES(culture_expense_amount),
            education_expense_amount = VALUES(education_expense_amount),
            entertainment_expense_amount = VALUES(entertainment_expense_amount),
            grocery_expense_amount = VALUES(grocery_expense_amount),
            household_expense_amount = VALUES(household_expense_amount),
            income_bracket_code = VALUES(income_bracket_code),
            leisure_expense_amount = VALUES(leisure_expense_amount),
            medical_expense_amount = VALUES(medical_expense_amount),
            monthly_average_income_amount = VALUES(monthly_average_income_amount),
            period_code = VALUES(period_code),
            total_expense_amount = VALUES(total_expense_amount),
            transportation_expense_amount = VALUES(transportation_expense_amount);

        SELECT 'income_commercial' AS table_name, v_from AS batch_from_id, v_to AS batch_to_id, ROW_COUNT() AS affected_rows;
        SET v_from = v_to + 1;
    END WHILE;
END $$

DROP PROCEDURE IF EXISTS migrate_population_commercial_remaining $$
CREATE PROCEDURE migrate_population_commercial_remaining(IN p_batch_size INT)
BEGIN
    DECLARE v_from BIGINT;
    DECLARE v_to BIGINT;
    DECLARE v_max BIGINT;

    SELECT MIN(id), MAX(id) INTO v_from, v_max FROM nowdoboss.population_commercial;

    WHILE v_from IS NOT NULL AND v_from <= v_max DO
        SET v_to = v_from + p_batch_size - 1;

        INSERT INTO bosspickseoul_commercial_dev.population_commercial (
            id,
            age10_resident_population,
            age20_resident_population,
            age30_resident_population,
            age40_resident_population,
            age50_resident_population,
            age60_plus_resident_population,
            commercial_classification_code,
            commercial_classification_name,
            commercial_code,
            commercial_name,
            female_resident_population,
            male_resident_population,
            period_code,
            total_resident_population
        )
        SELECT
            id,
            COALESCE(teen_population, 0),
            COALESCE(twenty_population, 0),
            COALESCE(thirty_population, 0),
            COALESCE(forty_population, 0),
            COALESCE(fifty_population, 0),
            COALESCE(sixty_population, 0),
            commercial_classification_code,
            commercial_classification_code_name,
            commercial_code,
            commercial_code_name,
            COALESCE(female_population, 0),
            COALESCE(male_population, 0),
            period_code,
            COALESCE(total_population, 0)
        FROM nowdoboss.population_commercial
        WHERE id BETWEEN v_from AND v_to
        ON DUPLICATE KEY UPDATE
            age10_resident_population = VALUES(age10_resident_population),
            age20_resident_population = VALUES(age20_resident_population),
            age30_resident_population = VALUES(age30_resident_population),
            age40_resident_population = VALUES(age40_resident_population),
            age50_resident_population = VALUES(age50_resident_population),
            age60_plus_resident_population = VALUES(age60_plus_resident_population),
            commercial_classification_code = VALUES(commercial_classification_code),
            commercial_classification_name = VALUES(commercial_classification_name),
            commercial_code = VALUES(commercial_code),
            commercial_name = VALUES(commercial_name),
            female_resident_population = VALUES(female_resident_population),
            male_resident_population = VALUES(male_resident_population),
            period_code = VALUES(period_code),
            total_resident_population = VALUES(total_resident_population);

        SELECT 'population_commercial' AS table_name, v_from AS batch_from_id, v_to AS batch_to_id, ROW_COUNT() AS affected_rows;
        SET v_from = v_to + 1;
    END WHILE;
END $$

DROP PROCEDURE IF EXISTS migrate_store_administration_remaining $$
CREATE PROCEDURE migrate_store_administration_remaining(IN p_batch_size INT)
BEGIN
    DECLARE v_from BIGINT;
    DECLARE v_to BIGINT;
    DECLARE v_max BIGINT;

    SELECT MIN(id), MAX(id) INTO v_from, v_max FROM nowdoboss.store_administration;

    WHILE v_from IS NOT NULL AND v_from <= v_max DO
        SET v_to = v_from + p_batch_size - 1;

        INSERT INTO bosspickseoul_commercial_dev.store_administration (
            id,
            administration_code,
            administration_name,
            closed_store_count,
            closure_rate,
            franchise_store_count,
            opened_store_count,
            opening_rate,
            period_code,
            service_code,
            service_name,
            service_type,
            similar_store_count,
            total_store_count
        )
        SELECT
            id,
            administration_code,
            administration_code_name,
            COALESCE(closed_store, 0),
            COALESCE(closed_rate, 0),
            COALESCE(franchise_store, 0),
            COALESCE(opened_store, 0),
            COALESCE(opened_rate, 0),
            period_code,
            service_code,
            service_code_name,
            service_type,
            COALESCE(similar_store, 0),
            COALESCE(total_store, 0)
        FROM nowdoboss.store_administration
        WHERE id BETWEEN v_from AND v_to
        ON DUPLICATE KEY UPDATE
            administration_code = VALUES(administration_code),
            administration_name = VALUES(administration_name),
            closed_store_count = VALUES(closed_store_count),
            closure_rate = VALUES(closure_rate),
            franchise_store_count = VALUES(franchise_store_count),
            opened_store_count = VALUES(opened_store_count),
            opening_rate = VALUES(opening_rate),
            period_code = VALUES(period_code),
            service_code = VALUES(service_code),
            service_name = VALUES(service_name),
            service_type = VALUES(service_type),
            similar_store_count = VALUES(similar_store_count),
            total_store_count = VALUES(total_store_count);

        SELECT 'store_administration' AS table_name, v_from AS batch_from_id, v_to AS batch_to_id, ROW_COUNT() AS affected_rows;
        SET v_from = v_to + 1;
    END WHILE;
END $$

DELIMITER ;

-- 4) Run migrations.
CALL migrate_change_district_remaining(@batch_size);
CALL migrate_foot_traffic_commercial_remaining(@batch_size);
CALL migrate_foot_traffic_district_remaining(@batch_size);
CALL migrate_income_administration_remaining(@batch_size);
CALL migrate_income_commercial_remaining(@batch_size);
CALL migrate_population_commercial_remaining(@batch_size);
CALL migrate_store_administration_remaining(@batch_size);

DROP PROCEDURE IF EXISTS migrate_store_administration_remaining;
DROP PROCEDURE IF EXISTS migrate_population_commercial_remaining;
DROP PROCEDURE IF EXISTS migrate_income_commercial_remaining;
DROP PROCEDURE IF EXISTS migrate_income_administration_remaining;
DROP PROCEDURE IF EXISTS migrate_foot_traffic_district_remaining;
DROP PROCEDURE IF EXISTS migrate_foot_traffic_commercial_remaining;
DROP PROCEDURE IF EXISTS migrate_change_district_remaining;

-- 5) Count validation after migration.
-- missing_source_id_count must be 0.
SELECT
    'change_district' AS table_name,
    (SELECT COUNT(*) FROM nowdoboss.change_district) AS source_count,
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.change_district t JOIN nowdoboss.change_district s ON s.id = t.id) AS migrated_target_id_count,
    (SELECT COUNT(*) FROM nowdoboss.change_district s LEFT JOIN bosspickseoul_commercial_dev.change_district t ON t.id = s.id WHERE t.id IS NULL) AS missing_source_id_count,
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.change_district t LEFT JOIN nowdoboss.change_district s ON s.id = t.id WHERE s.id IS NULL) AS target_extra_id_count
UNION ALL
SELECT
    'foot_traffic_commercial',
    (SELECT COUNT(*) FROM nowdoboss.foot_traffic_commercial),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.foot_traffic_commercial t JOIN nowdoboss.foot_traffic_commercial s ON s.id = t.id),
    (SELECT COUNT(*) FROM nowdoboss.foot_traffic_commercial s LEFT JOIN bosspickseoul_commercial_dev.foot_traffic_commercial t ON t.id = s.id WHERE t.id IS NULL),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.foot_traffic_commercial t LEFT JOIN nowdoboss.foot_traffic_commercial s ON s.id = t.id WHERE s.id IS NULL)
UNION ALL
SELECT
    'foot_traffic_district',
    (SELECT COUNT(*) FROM nowdoboss.foot_traffic_district),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.foot_traffic_district t JOIN nowdoboss.foot_traffic_district s ON s.id = t.id),
    (SELECT COUNT(*) FROM nowdoboss.foot_traffic_district s LEFT JOIN bosspickseoul_commercial_dev.foot_traffic_district t ON t.id = s.id WHERE t.id IS NULL),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.foot_traffic_district t LEFT JOIN nowdoboss.foot_traffic_district s ON s.id = t.id WHERE s.id IS NULL)
UNION ALL
SELECT
    'income_administration',
    (SELECT COUNT(*) FROM nowdoboss.income_administration),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.income_administration t JOIN nowdoboss.income_administration s ON s.id = t.id),
    (SELECT COUNT(*) FROM nowdoboss.income_administration s LEFT JOIN bosspickseoul_commercial_dev.income_administration t ON t.id = s.id WHERE t.id IS NULL),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.income_administration t LEFT JOIN nowdoboss.income_administration s ON s.id = t.id WHERE s.id IS NULL)
UNION ALL
SELECT
    'income_commercial',
    (SELECT COUNT(*) FROM nowdoboss.income_commercial),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.income_commercial t JOIN nowdoboss.income_commercial s ON s.id = t.id),
    (SELECT COUNT(*) FROM nowdoboss.income_commercial s LEFT JOIN bosspickseoul_commercial_dev.income_commercial t ON t.id = s.id WHERE t.id IS NULL),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.income_commercial t LEFT JOIN nowdoboss.income_commercial s ON s.id = t.id WHERE s.id IS NULL)
UNION ALL
SELECT
    'population_commercial',
    (SELECT COUNT(*) FROM nowdoboss.population_commercial),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.population_commercial t JOIN nowdoboss.population_commercial s ON s.id = t.id),
    (SELECT COUNT(*) FROM nowdoboss.population_commercial s LEFT JOIN bosspickseoul_commercial_dev.population_commercial t ON t.id = s.id WHERE t.id IS NULL),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.population_commercial t LEFT JOIN nowdoboss.population_commercial s ON s.id = t.id WHERE s.id IS NULL)
UNION ALL
SELECT
    'store_administration',
    (SELECT COUNT(*) FROM nowdoboss.store_administration),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.store_administration t JOIN nowdoboss.store_administration s ON s.id = t.id),
    (SELECT COUNT(*) FROM nowdoboss.store_administration s LEFT JOIN bosspickseoul_commercial_dev.store_administration t ON t.id = s.id WHERE t.id IS NULL),
    (SELECT COUNT(*) FROM bosspickseoul_commercial_dev.store_administration t LEFT JOIN nowdoboss.store_administration s ON s.id = t.id WHERE s.id IS NULL)
ORDER BY table_name;
