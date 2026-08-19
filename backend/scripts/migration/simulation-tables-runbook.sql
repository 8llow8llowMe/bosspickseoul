-- 창업 시뮬레이션 테이블 4종 생성 runbook
--
-- 배경: commercial-service에 simulation 컨텍스트가 추가되었다.
-- dev는 ddl-auto=update로 테이블이 자동 생성되지만, prod는 ddl-auto=none이므로
-- 배포 전에 아래 DDL을 수동 적용해야 한다. 스키마는 dev에서 Hibernate가 생성한 것과 동치다.
--
-- 기준 연도(base_year) 버전 관리: 기준 데이터 3종(rent/service_type/franchisee)은 연도별로 쌓고,
-- 애플리케이션은 app.simulation.data-base-year 설정의 활성 연도만 조회한다.
-- 데이터 재수집 시 새 연도로 적재 후 설정값만 전환하면 된다 (기존 연도 데이터는 롤백용으로 유지).
--
-- 대상 DB: commercial-service DB (dev 자동 생성 / prod 수동 적용)
-- 시드 적재(테이블 생성 후):
--   1) backend/service/commercial-service/src/main/resources/db/simulation-seed.sql (rent 26행 + service_type 30행)
--   2) backend/scripts/data-migration/simulation-franchisee-seed.sql (franchisee 11,442행 — 같은 연도 재적재 시 DELETE 선행)

-- 1. 자치구별 임대료 기준
CREATE TABLE IF NOT EXISTS simulation_rent (
    id               BIGINT       NOT NULL AUTO_INCREMENT COMMENT '임대료 아이디',
    base_year        VARCHAR(4)   NOT NULL COMMENT '데이터 기준 연도 (재수집 시 새 연도로 적재)',
    district_code    VARCHAR(5)   NOT NULL COMMENT '자치구 코드',
    district_name    VARCHAR(10)  NOT NULL COMMENT '자치구명',
    first_floor_rent INT          NOT NULL COMMENT '1층 임대료 (3.3㎡당 월환산임대료, 원)',
    other_floor_rent INT          NOT NULL COMMENT '1층 외 임대료 (3.3㎡당 월환산임대료, 원)',
    total_rent       INT          NOT NULL COMMENT '전체 층 평균 임대료 (3.3㎡당 월환산임대료, 원)',
    PRIMARY KEY (id),
    UNIQUE KEY uk_simulation_rent_base_year_district_code (base_year, district_code)
) COMMENT '자치구별 임대료 기준 (창업 시뮬레이션용)';

-- 2. 업종별 시뮬레이션 기준 정보
CREATE TABLE IF NOT EXISTS simulation_service_type (
    id                BIGINT      NOT NULL AUTO_INCREMENT COMMENT '시뮬레이션 업종 아이디',
    base_year         VARCHAR(4)  NOT NULL COMMENT '데이터 기준 연도 (재수집 시 새 연도로 적재)',
    service_code      VARCHAR(8)  NOT NULL COMMENT '서비스 업종 코드',
    service_name      VARCHAR(30) NOT NULL COMMENT '서비스 업종명',
    small_size        INT         NOT NULL COMMENT '소형 매장 크기 (㎡)',
    medium_size       INT         NOT NULL COMMENT '중형 매장 크기 (㎡)',
    large_size        INT         NOT NULL COMMENT '대형 매장 크기 (㎡)',
    key_money_average INT         NOT NULL COMMENT '권리금 수준 평균 (만원)',
    key_money_level   DOUBLE      NULL COMMENT '권리금 수준 ㎡당 평균 (만원/㎡)',
    key_money_ratio   DOUBLE      NULL COMMENT '권리금 유 비율 (%)',
    PRIMARY KEY (id),
    UNIQUE KEY uk_simulation_service_type_base_year_service_code (base_year, service_code)
) COMMENT '업종별 시뮬레이션 기준 정보 — 매장 크기와 권리금 수준';

-- 3. 프랜차이즈 창업 비용 기준
CREATE TABLE IF NOT EXISTS simulation_franchisee (
    id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '프랜차이즈 아이디',
    base_year    VARCHAR(4)   NOT NULL COMMENT '데이터 기준 연도 (재수집 시 새 연도로 적재)',
    service_code VARCHAR(8)   NOT NULL COMMENT '서비스 업종 코드',
    service_name VARCHAR(30)  NOT NULL COMMENT '서비스 업종명',
    brand_name   VARCHAR(100) NOT NULL COMMENT '브랜드 이름',
    subscription INT          NOT NULL COMMENT '가입비 (천원)',
    education    INT          NOT NULL COMMENT '교육비 (천원)',
    deposit      INT          NOT NULL COMMENT '가맹 보증금 (천원)',
    etc          INT          NOT NULL COMMENT '기타 비용 (천원)',
    total_levy   INT          NOT NULL COMMENT '부담금 합계 (천원)',
    unit_area    INT          NOT NULL COMMENT '단위면적(3.3㎡)당 인테리어 비용 (천원)',
    interior     INT          NOT NULL COMMENT '인테리어 비용 (천원)',
    area         INT          NOT NULL COMMENT '기준 점포 면적 (㎡)',
    PRIMARY KEY (id),
    KEY idx_simulation_franchisee_base_year_service_code (base_year, service_code)
) COMMENT '프랜차이즈 창업 비용 기준 (공정거래위원회 정보공개서 기반)';

-- 4. 회원별 시뮬레이션 저장 이력
CREATE TABLE IF NOT EXISTS simulation_history (
    id             BIGINT       NOT NULL AUTO_INCREMENT COMMENT '시뮬레이션 이력 아이디',
    member_id      BIGINT       NOT NULL COMMENT '회원 아이디 (FK: member.id)',
    franchisee     BIT(1)       NOT NULL COMMENT '프랜차이즈 창업 여부',
    brand_name     VARCHAR(100) NULL COMMENT '프랜차이즈 브랜드 이름 (비프랜차이즈면 null)',
    district_code  VARCHAR(5)   NOT NULL COMMENT '자치구 코드',
    district_name  VARCHAR(10)  NOT NULL COMMENT '자치구명',
    service_code   VARCHAR(8)   NOT NULL COMMENT '서비스 업종 코드',
    service_name   VARCHAR(30)  NOT NULL COMMENT '서비스 업종명',
    store_size     INT          NOT NULL COMMENT '매장 면적 (㎡)',
    floor_type     VARCHAR(20)  NOT NULL COMMENT '층 구분',
    total_price    BIGINT       NOT NULL COMMENT '총 창업 비용 (만원)',
    data_base_year VARCHAR(4)   NOT NULL COMMENT '계산에 사용된 기준 데이터 연도',
    created_at     DATETIME(6)  NOT NULL COMMENT '저장 시각',
    PRIMARY KEY (id),
    KEY idx_simulation_history_member_id_created_at (member_id, created_at)
) COMMENT '회원별 창업 시뮬레이션 저장 이력';

-- 5. 적용 검증
SHOW TABLES LIKE 'simulation%';
SHOW INDEX FROM simulation_history;
