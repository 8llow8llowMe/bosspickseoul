-- change_commercial 에 공간 버전을 넣는다. Workbench 에서 bosspickseoul_commercial_dev 를 선택한 뒤 실행한다.
-- 조회 정본은 이 테이블 컬럼이다. dataset_fact JSON 은 원천 보관용으로 남는다.
--
-- Hibernate 기본 전략은 snake_case 다. 컬럼이 camelCase(periodCode) 로 만들어져 있으면
-- 아래 period_code / commercial_code 이름을 실제 컬럼명으로 바꿔 실행한다.
--
-- 이미 있는 20233 행은 legacy-20233 으로 채운다. 테이블이 비어 있으면 DEFAULT 만으로 충분하다.

ALTER TABLE change_commercial
    ADD COLUMN spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL DEFAULT 'legacy-20233'
        COMMENT '공간 스냅샷 버전. 같은 상권 코드라도 20233 과 2024 표준단위구역을 구분한다';

ALTER TABLE change_commercial
    ALTER COLUMN spatial_version DROP DEFAULT;

CREATE UNIQUE INDEX uk_change_commercial_period_commercial_spatial
    ON change_commercial (period_code, commercial_code, spatial_version);
