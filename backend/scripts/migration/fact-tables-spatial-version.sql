-- 나머지 14개 팩트 테이블에 공간 버전을 넣는다. Workbench 에서 bosspickseoul_commercial_dev 를 선택한 뒤 실행한다.
-- change_commercial 은 change-commercial-spatial-version.sql 을 이미 적용한다.
-- 조회 정본은 이 테이블 컬럼이다. dataset_fact JSON 은 원천 보관용으로 남는다.
--
-- Hibernate 기본 전략은 snake_case 다. 컬럼이 camelCase(periodCode) 로 만들어져 있으면
-- 아래 period_code / commercial_code / district_code / administration_code / service_code
-- 이름을 실제 컬럼명으로 바꿔 실행한다. 소득 두 컬럼도 마찬가지다.
--
-- 이미 있는 20233 행은 legacy-20233 으로 채운다. 테이블이 비어 있으면 DEFAULT 만으로 충분하다.
-- 컬럼만 생긴다고 화면이 바뀌지 않는다. 게시한 분기마다 --job=project 가 필요하다.

ALTER TABLE foot_traffic_commercial
    ADD COLUMN spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL DEFAULT 'legacy-20233'
        COMMENT '공간 스냅샷 버전. 같은 상권 코드라도 20233 과 2024 표준단위구역을 구분한다';

ALTER TABLE sales_commercial
    ADD COLUMN spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL DEFAULT 'legacy-20233'
        COMMENT '공간 스냅샷 버전. 같은 상권 코드라도 20233 과 2024 표준단위구역을 구분한다';

ALTER TABLE store_commercial
    ADD COLUMN spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL DEFAULT 'legacy-20233'
        COMMENT '공간 스냅샷 버전. 같은 상권 코드라도 20233 과 2024 표준단위구역을 구분한다';

ALTER TABLE population_commercial
    ADD COLUMN spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL DEFAULT 'legacy-20233'
        COMMENT '공간 스냅샷 버전. 같은 상권 코드라도 20233 과 2024 표준단위구역을 구분한다';

ALTER TABLE facility_commercial
    ADD COLUMN spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL DEFAULT 'legacy-20233'
        COMMENT '공간 스냅샷 버전. 같은 상권 코드라도 20233 과 2024 표준단위구역을 구분한다';

ALTER TABLE income_commercial
    ADD COLUMN spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL DEFAULT 'legacy-20233'
        COMMENT '공간 스냅샷 버전. 같은 상권 코드라도 20233 과 2024 표준단위구역을 구분한다';

ALTER TABLE sales_administration
    ADD COLUMN spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL DEFAULT 'legacy-20233'
        COMMENT '공간 스냅샷 버전. 같은 행정동 코드라도 20233 과 2024 표준단위구역을 구분한다';

ALTER TABLE store_administration
    ADD COLUMN spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL DEFAULT 'legacy-20233'
        COMMENT '공간 스냅샷 버전. 같은 행정동 코드라도 20233 과 2024 표준단위구역을 구분한다';

ALTER TABLE income_administration
    ADD COLUMN spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL DEFAULT 'legacy-20233'
        COMMENT '공간 스냅샷 버전. 같은 행정동 코드라도 20233 과 2024 표준단위구역을 구분한다';

ALTER TABLE sales_district
    ADD COLUMN spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL DEFAULT 'legacy-20233'
        COMMENT '공간 스냅샷 버전. 같은 자치구 코드라도 20233 과 2024 표준단위구역을 구분한다';

ALTER TABLE store_district
    ADD COLUMN spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL DEFAULT 'legacy-20233'
        COMMENT '공간 스냅샷 버전. 같은 자치구 코드라도 20233 과 2024 표준단위구역을 구분한다';

ALTER TABLE foot_traffic_district
    ADD COLUMN spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL DEFAULT 'legacy-20233'
        COMMENT '공간 스냅샷 버전. 같은 자치구 코드라도 20233 과 2024 표준단위구역을 구분한다';

ALTER TABLE income_district
    ADD COLUMN spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL DEFAULT 'legacy-20233'
        COMMENT '공간 스냅샷 버전. 같은 자치구 코드라도 20233 과 2024 표준단위구역을 구분한다';

ALTER TABLE change_district
    ADD COLUMN spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL DEFAULT 'legacy-20233'
        COMMENT '공간 스냅샷 버전. 같은 자치구 코드라도 20233 과 2024 표준단위구역을 구분한다';

ALTER TABLE foot_traffic_commercial
    ALTER COLUMN spatial_version DROP DEFAULT;
ALTER TABLE sales_commercial
    ALTER COLUMN spatial_version DROP DEFAULT;
ALTER TABLE store_commercial
    ALTER COLUMN spatial_version DROP DEFAULT;
ALTER TABLE population_commercial
    ALTER COLUMN spatial_version DROP DEFAULT;
ALTER TABLE facility_commercial
    ALTER COLUMN spatial_version DROP DEFAULT;
ALTER TABLE income_commercial
    ALTER COLUMN spatial_version DROP DEFAULT;
ALTER TABLE sales_administration
    ALTER COLUMN spatial_version DROP DEFAULT;
ALTER TABLE store_administration
    ALTER COLUMN spatial_version DROP DEFAULT;
ALTER TABLE income_administration
    ALTER COLUMN spatial_version DROP DEFAULT;
ALTER TABLE sales_district
    ALTER COLUMN spatial_version DROP DEFAULT;
ALTER TABLE store_district
    ALTER COLUMN spatial_version DROP DEFAULT;
ALTER TABLE foot_traffic_district
    ALTER COLUMN spatial_version DROP DEFAULT;
ALTER TABLE income_district
    ALTER COLUMN spatial_version DROP DEFAULT;
ALTER TABLE change_district
    ALTER COLUMN spatial_version DROP DEFAULT;

-- 2024+ 원천에는 소득 두 컬럼이 없다. 값을 만들지 않고 NULL 로 둔다.
ALTER TABLE income_commercial
    MODIFY COLUMN monthly_average_income_amount BIGINT NULL
        COMMENT '월 평균 소득 금액. 2024년 이후 원천에는 없다',
    MODIFY COLUMN income_bracket_code INT NULL
        COMMENT '소득 구간 코드. 2024년 이후 원천에는 없다';

CREATE UNIQUE INDEX uk_ft_commercial_period_commercial_spatial
    ON foot_traffic_commercial (period_code, commercial_code, spatial_version);
CREATE UNIQUE INDEX uk_sales_commercial_period_code_svc_spatial
    ON sales_commercial (period_code, commercial_code, service_code, spatial_version);
CREATE UNIQUE INDEX uk_store_commercial_period_code_svc_spatial
    ON store_commercial (period_code, commercial_code, service_code, spatial_version);
CREATE UNIQUE INDEX uk_pop_commercial_period_commercial_spatial
    ON population_commercial (period_code, commercial_code, spatial_version);
CREATE UNIQUE INDEX uk_fac_commercial_period_commercial_spatial
    ON facility_commercial (period_code, commercial_code, spatial_version);
CREATE UNIQUE INDEX uk_income_commercial_period_commercial_spatial
    ON income_commercial (period_code, commercial_code, spatial_version);
CREATE UNIQUE INDEX uk_sales_admin_period_admin_svc_spatial
    ON sales_administration (period_code, administration_code, service_code, spatial_version);
CREATE UNIQUE INDEX uk_store_admin_period_admin_svc_spatial
    ON store_administration (period_code, administration_code, service_code, spatial_version);
CREATE UNIQUE INDEX uk_income_admin_period_admin_spatial
    ON income_administration (period_code, administration_code, spatial_version);
CREATE UNIQUE INDEX uk_sales_district_period_district_svc_spatial
    ON sales_district (period_code, district_code, service_code, spatial_version);
CREATE UNIQUE INDEX uk_store_district_period_district_svc_spatial
    ON store_district (period_code, district_code, service_code, spatial_version);
CREATE UNIQUE INDEX uk_ft_district_period_district_spatial
    ON foot_traffic_district (period_code, district_code, spatial_version);
CREATE UNIQUE INDEX uk_income_district_period_district_spatial
    ON income_district (period_code, district_code, spatial_version);
CREATE UNIQUE INDEX uk_change_district_period_district_spatial
    ON change_district (period_code, district_code, spatial_version);
