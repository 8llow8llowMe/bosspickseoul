-- pension_income_district 를 만든다. Workbench 에서 bosspickseoul_commercial_dev 를 선택한 뒤 실행한다.
-- 이슈 #415 2차. 상권 소득(income_commercial 의 월평균소득)이 2024년 이후 원천에서 끊겨 자치구 단위 대체 원천을 쓴다.
--
-- 원천은 공공데이터포털 「국민연금공단_자격 시군구 신고 평균소득월액」(파일데이터 3046077) CSV 다.
-- 지역가입자(사업장 가입자가 아닌 18~60세 국내 거주자)의 신고 기준소득월액을 시군구별로 평균한 값이고, 매년 12월 기준으로
-- 연 1회 갱신된다. 이 상권이나 주민 전체의 소득이 아니다. 같은 자치구 안의 상권은 모두 같은 값을 갖는다.
-- 2024-12-31 기준 파일: 1,150행(기준년월 2020-12~2024-12 × 시군구 230), 서울 125행(25구 × 5).
--
-- 적재: batch-service --job=pension-income (수동, 연 1회). 앱이 테이블을 만들지 않는다. IF NOT EXISTS 라 두 번 실행해도 된다.
--   절차: backend/docs/services/batch-quarterly-import.md 「11. 국민연금 자치구 평균소득 적재」
-- 같은 기준일의 행은 실게시 때마다 통째로 지우고 다시 넣는다(기준일 단위 교체, 한 트랜잭션). 파일에 없는 기준일은 건드리지 않는다.
--
-- spatial_version 컬럼을 두지 않는다. 자치구 25 코드는 공간 스냅샷 버전이 바뀌어도 그대로이고, 원천은 자치구보다 작은 단위를 주지 않는다.
-- district_name 은 dataset_spatial_area 의 정규 이름(종로구), source_region_name 은 원문(서울특별시종로구)이다.
--
-- 유니크 키 선두는 district_code 다. 조회(상권 → 자치구 → 요청 분기 말일 이하 최신 기준일)가 이 순서로 읽는다.
-- 적재의 DELETE ... WHERE reference_date IN (...) 는 이 키를 못 타고 테이블을 훑지만, 연 25행 규모라 문제가 없다.

CREATE TABLE IF NOT EXISTS pension_income_district (
    id BIGINT NOT NULL AUTO_INCREMENT,
    reference_date DATE NOT NULL
        COMMENT '기준일. 원천 기준년월의 말일(2024-12 → 2024-12-31)',
    district_code VARCHAR(5) NOT NULL
        COMMENT '자치구 코드 (dataset_spatial_area.area_code, area_type=DISTRICT)',
    district_name VARCHAR(10) NOT NULL
        COMMENT '자치구 이름. dataset_spatial_area 정규 이름',
    source_region_name VARCHAR(64) NOT NULL
        COMMENT '원천 시군구 원문 (서울특별시종로구)',
    average_monthly_income_amount BIGINT NOT NULL
        COMMENT '국민연금 지역가입자 신고 기준소득월액 자치구 평균(원)',
    source_updated_at TIMESTAMP(6) NOT NULL
        COMMENT '원천 작성 시점 (--source-updated-at)',
    source_checksum CHAR(64) NOT NULL
        COMMENT '원본 파일 SHA-256. 보관본은 batch-raw 의 <run_id>-*/source.csv',
    run_id VARCHAR(64) NOT NULL
        COMMENT '적재한 batch run-id (BATCH_JOB_EXECUTION_PARAMS runId)',
    loaded_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        COMMENT '적재 시각',
    PRIMARY KEY (id),
    UNIQUE KEY uk_pension_income_district_district_code_reference_date (district_code, reference_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='국민연금 지역가입자 신고 기준소득월액 자치구 평균 (공공데이터포털 3046077, 이슈 #415)';

-- 적용 확인: 테이블과 유니크 키가 있는지 본다. 적재 전에는 rows_total = 0 이 정상이다.
SELECT COUNT(*) AS rows_total FROM pension_income_district;
SELECT index_name, GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns
  FROM information_schema.statistics
 WHERE table_schema = DATABASE() AND table_name = 'pension_income_district'
 GROUP BY index_name;

-- 적재 후 확인 1: 기준일마다 25구여야 하고, 한 run 이 한 파일(checksum)에서 왔어야 한다.
SELECT reference_date,
       COUNT(*)                        AS districts,
       COUNT(DISTINCT source_checksum) AS checksums,
       MIN(run_id)                     AS run_id,
       MIN(average_monthly_income_amount) AS min_amount,
       MAX(average_monthly_income_amount) AS max_amount
  FROM pension_income_district
 GROUP BY reference_date
 ORDER BY reference_date;

-- 적재 후 확인 2: 코드가 공간 스냅샷 자치구와 모두 맞는지 본다(조회 쪽이 이 코드로 상권 → 자치구를 잇는다). 0 행이어야 한다.
-- @spatial_version 은 적재 때 --spatial-version 으로 준 값과 같게 맞춘다. READY 조건은 적재의 DistrictCodeLookupJdbcAdapter 쿼리와 같다.
SET @spatial_version = 'legacy-20233';
SELECT p.reference_date, p.district_code, p.district_name
  FROM pension_income_district p
  LEFT JOIN (
        SELECT a.area_code
          FROM dataset_spatial_area a
          JOIN dataset_spatial_release r ON r.spatial_version = a.spatial_version AND r.status = 'READY'
         WHERE a.spatial_version = @spatial_version AND a.area_type = 'DISTRICT'
       ) a ON a.area_code = p.district_code
 WHERE a.area_code IS NULL;
