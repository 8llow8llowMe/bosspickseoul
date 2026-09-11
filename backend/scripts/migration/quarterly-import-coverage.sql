-- 분기 적재 커버리지. Workbench 에서 bosspickseoul_commercial_dev 를 선택한 뒤
-- 블록 단위로 실행한다. 이 파일은 SELECT 만 있으며 스키마를 바꾸지 않는다.
--
-- 목적: 데이터셋 15종(상권 7 · 행정동 3 · 자치구 5) x 분기 전 구간에서
--       무엇이 게시됐고 무엇이 남았는지 한 번에 본다.
-- 실행 명령 생성: backend/scripts/batch/quarterly-import-plan.ps1
-- 운영 절차:      backend/docs/services/batch-quarterly-import.md
-- 실행 직후 건수 확인: quarterly-import-verify.sql
--
-- 아래 CTE 두 개가 기준 목록이다. 대상 분기 범위가 늘어나면 quarter_range 에 줄을 추가한다.
-- 2026-09-11 기준 개발 DB 에 적재한 최신 분기는 20261 다.

-- ---------------------------------------------------------------------------
-- 1) 남은 대상. state = 'TODO' 인 (dataset, period_code) 가 다음에 돌릴 슬롯이다.
--    period_arg = 'ignored' 는 첫 분기만 API 로 받고 나머지는 ARCHIVE 로 재생한다.
-- ---------------------------------------------------------------------------
WITH dataset_catalog (dataset, area_scope, period_arg, run_order) AS (
    SELECT 'CHANGE_COMMERCIAL',          'COMMERCIAL',     'honoured',  1  UNION ALL
    SELECT 'CHANGE_DISTRICT',            'DISTRICT',       'ignored',   2  UNION ALL
    SELECT 'FOOT_TRAFFIC_DISTRICT',      'DISTRICT',       'ignored',   3  UNION ALL
    SELECT 'CONSUMPTION_DISTRICT',       'DISTRICT',       'ignored',   4  UNION ALL
    SELECT 'FOOT_TRAFFIC_COMMERCIAL',    'COMMERCIAL',     'honoured',  5  UNION ALL
    SELECT 'POPULATION_COMMERCIAL',      'COMMERCIAL',     'ignored',   6  UNION ALL
    SELECT 'FACILITY_COMMERCIAL',        'COMMERCIAL',     'ignored',   7  UNION ALL
    SELECT 'CONSUMPTION_COMMERCIAL',     'COMMERCIAL',     'ignored',   8  UNION ALL
    SELECT 'CONSUMPTION_ADMINISTRATION', 'ADMINISTRATION', 'ignored',   9  UNION ALL
    SELECT 'SALES_DISTRICT',             'DISTRICT',       'ignored',   10 UNION ALL
    SELECT 'STORE_DISTRICT',             'DISTRICT',       'ignored',   11 UNION ALL
    SELECT 'SALES_ADMINISTRATION',       'ADMINISTRATION', 'honoured',  12 UNION ALL
    SELECT 'SALES_COMMERCIAL',           'COMMERCIAL',     'honoured',  13 UNION ALL
    SELECT 'STORE_ADMINISTRATION',       'ADMINISTRATION', 'honoured',  14 UNION ALL
    SELECT 'STORE_COMMERCIAL',           'COMMERCIAL',     'honoured',  15
),
quarter_range (period_code) AS (
    SELECT '20211' UNION ALL SELECT '20212' UNION ALL SELECT '20213' UNION ALL SELECT '20214' UNION ALL
    SELECT '20221' UNION ALL SELECT '20222' UNION ALL SELECT '20223' UNION ALL SELECT '20224' UNION ALL
    SELECT '20231' UNION ALL SELECT '20232' UNION ALL SELECT '20233' UNION ALL SELECT '20234' UNION ALL
    SELECT '20241' UNION ALL SELECT '20242' UNION ALL SELECT '20243' UNION ALL SELECT '20244' UNION ALL
    SELECT '20251' UNION ALL SELECT '20252' UNION ALL SELECT '20253' UNION ALL SELECT '20254' UNION ALL
    SELECT '20261'
),
-- pointer_rows 로 판정한다. dataset_active_release.run_id 는 NULL 을 허용하므로
-- run_id IS NULL 로 미완료를 판정하면 포인터가 있는 슬롯을 놓친다.
-- 공간 버전을 새로 게시(#278)한 뒤 그 버전만 보려면 spatial_version 조건을 넣는다.
published AS (
    SELECT dataset, period_code, COUNT(*) AS pointer_rows, MAX(run_id) AS run_id
      FROM dataset_active_release
     GROUP BY dataset, period_code
)
SELECT c.run_order,
       c.area_scope,
       c.dataset,
       c.period_arg,
       q.period_code,
       CASE WHEN p.pointer_rows IS NULL THEN 'TODO' ELSE 'DONE' END AS state,
       p.run_id
  FROM dataset_catalog c
 CROSS JOIN quarter_range q
  LEFT JOIN published p
         ON p.dataset = c.dataset
        AND p.period_code = q.period_code
 WHERE p.pointer_rows IS NULL     -- 완료까지 보려면 이 줄을 지운다
 ORDER BY c.run_order, q.period_code;

-- ---------------------------------------------------------------------------
-- 2) 데이터셋별 진행률. 15종이 모두 나오고, done_quarters 가 채워진 분기 수다.
-- ---------------------------------------------------------------------------
WITH dataset_catalog (dataset, area_scope, run_order) AS (
    SELECT 'CHANGE_COMMERCIAL',          'COMMERCIAL',     1  UNION ALL
    SELECT 'CHANGE_DISTRICT',            'DISTRICT',       2  UNION ALL
    SELECT 'FOOT_TRAFFIC_DISTRICT',      'DISTRICT',       3  UNION ALL
    SELECT 'CONSUMPTION_DISTRICT',       'DISTRICT',       4  UNION ALL
    SELECT 'FOOT_TRAFFIC_COMMERCIAL',    'COMMERCIAL',     5  UNION ALL
    SELECT 'POPULATION_COMMERCIAL',      'COMMERCIAL',     6  UNION ALL
    SELECT 'FACILITY_COMMERCIAL',        'COMMERCIAL',     7  UNION ALL
    SELECT 'CONSUMPTION_COMMERCIAL',     'COMMERCIAL',     8  UNION ALL
    SELECT 'CONSUMPTION_ADMINISTRATION', 'ADMINISTRATION', 9  UNION ALL
    SELECT 'SALES_DISTRICT',             'DISTRICT',       10 UNION ALL
    SELECT 'STORE_DISTRICT',             'DISTRICT',       11 UNION ALL
    SELECT 'SALES_ADMINISTRATION',       'ADMINISTRATION', 12 UNION ALL
    SELECT 'SALES_COMMERCIAL',           'COMMERCIAL',     13 UNION ALL
    SELECT 'STORE_ADMINISTRATION',       'ADMINISTRATION', 14 UNION ALL
    SELECT 'STORE_COMMERCIAL',           'COMMERCIAL',     15
)
SELECT c.run_order,
       c.area_scope,
       c.dataset,
       COUNT(DISTINCT a.period_code) AS done_quarters,
       MIN(a.period_code)            AS first_quarter,
       MAX(a.period_code)            AS last_quarter,
       COALESCE(SUM(r.accepted_count), 0) AS accepted_rows
  FROM dataset_catalog c
  LEFT JOIN dataset_active_release a ON a.dataset = c.dataset
  LEFT JOIN dataset_release r        ON r.run_id = a.run_id
 GROUP BY c.run_order, c.area_scope, c.dataset
 ORDER BY c.run_order;

-- ---------------------------------------------------------------------------
-- 3) 영역 스코프별 합계. 상권 / 행정동 / 자치구가 빠짐없이 들어갔는지 본다.
--    area_type 은 dataset_spatial_area 와 같은 이름을 쓴다.
-- ---------------------------------------------------------------------------
SELECT SUBSTRING_INDEX(a.dataset, '_', -1) AS area_scope,
       COUNT(DISTINCT a.dataset)           AS datasets,
       COUNT(DISTINCT a.period_code)       AS quarters,
       COUNT(*)                            AS published_slots
  FROM dataset_active_release a
 GROUP BY area_scope
 ORDER BY area_scope;

-- ---------------------------------------------------------------------------
-- 4) 실패로 남은 run. 게시되지 않은 run 중 원인이 기록된 것만 본다.
--    같은 (dataset, period) 가 1) 에 TODO 로 남아 있으면 여기 원인을 먼저 읽는다.
-- ---------------------------------------------------------------------------
SELECT r.run_id, r.dataset, r.period_code, r.source, r.status,
       r.expected_rows, r.input_count, r.accepted_count,
       r.rejected_count, r.duplicate_count, r.unmapped_count,
       r.failure_reason, r.acquired_at
  FROM dataset_release r
  LEFT JOIN dataset_active_release a ON a.run_id = r.run_id
 WHERE a.run_id IS NULL
   AND r.status <> 'DRY_RUN'
 ORDER BY r.acquired_at DESC
 LIMIT 50;

-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- 5) typed 이관 진행률. `--job=facts` 로 게시(1~4절)한 슬롯이 `--job=project` 로
--    기존 팩트 테이블에 옮겨졌는지 본다. 1) 이 DONE 인데 여기 뜨면 적재만 되고
--    이관이 안 돈 슬롯이라 화면에 아직 안 나온다. 아무 행도 안 나오면 다 끝난 것이다.
--
--    존재 여부로 판정하지 않고 건수를 맞춘다. 레거시 이관 행(20211~20233)이
--    fact-tables-spatial-version.sql 의 DEFAULT 로 이미 legacy-20233 을 달고 있어서,
--    "행이 있으니 이관됐다" 로 보면 그 12분기가 영원히 완료로 잡힌다.
--    dataset_fact 삽입 건수는 accepted_count 와 같도록 강제되고(DatasetReleaseJdbcAdapter),
--    이관은 그 전량을 옮기므로 typed_rows 와 accepted_count 는 1:1 이어야 한다.
--
--    공간 버전은 서버 설정 DATASET_SPATIAL_VERSION 과 같은 값이다. 다른 기준을 보려면
--    아래 리터럴 두 군데를 바꾼다. 블록만 드래그해 실행해도 되도록 변수를 쓰지 않는다.
-- ---------------------------------------------------------------------------
WITH projected (dataset, period_code, spatial_version, typed_rows) AS (
    SELECT 'CHANGE_COMMERCIAL',          period_code, spatial_version, COUNT(*) FROM change_commercial       WHERE spatial_version = 'legacy-20233' GROUP BY period_code, spatial_version UNION ALL
    SELECT 'CHANGE_DISTRICT',            period_code, spatial_version, COUNT(*) FROM change_district         WHERE spatial_version = 'legacy-20233' GROUP BY period_code, spatial_version UNION ALL
    SELECT 'FOOT_TRAFFIC_DISTRICT',      period_code, spatial_version, COUNT(*) FROM foot_traffic_district   WHERE spatial_version = 'legacy-20233' GROUP BY period_code, spatial_version UNION ALL
    SELECT 'CONSUMPTION_DISTRICT',       period_code, spatial_version, COUNT(*) FROM income_district         WHERE spatial_version = 'legacy-20233' GROUP BY period_code, spatial_version UNION ALL
    SELECT 'FOOT_TRAFFIC_COMMERCIAL',    period_code, spatial_version, COUNT(*) FROM foot_traffic_commercial WHERE spatial_version = 'legacy-20233' GROUP BY period_code, spatial_version UNION ALL
    SELECT 'POPULATION_COMMERCIAL',      period_code, spatial_version, COUNT(*) FROM population_commercial   WHERE spatial_version = 'legacy-20233' GROUP BY period_code, spatial_version UNION ALL
    SELECT 'FACILITY_COMMERCIAL',        period_code, spatial_version, COUNT(*) FROM facility_commercial     WHERE spatial_version = 'legacy-20233' GROUP BY period_code, spatial_version UNION ALL
    SELECT 'CONSUMPTION_COMMERCIAL',     period_code, spatial_version, COUNT(*) FROM income_commercial       WHERE spatial_version = 'legacy-20233' GROUP BY period_code, spatial_version UNION ALL
    SELECT 'CONSUMPTION_ADMINISTRATION', period_code, spatial_version, COUNT(*) FROM income_administration   WHERE spatial_version = 'legacy-20233' GROUP BY period_code, spatial_version UNION ALL
    SELECT 'SALES_DISTRICT',             period_code, spatial_version, COUNT(*) FROM sales_district          WHERE spatial_version = 'legacy-20233' GROUP BY period_code, spatial_version UNION ALL
    SELECT 'STORE_DISTRICT',             period_code, spatial_version, COUNT(*) FROM store_district          WHERE spatial_version = 'legacy-20233' GROUP BY period_code, spatial_version UNION ALL
    SELECT 'SALES_ADMINISTRATION',       period_code, spatial_version, COUNT(*) FROM sales_administration    WHERE spatial_version = 'legacy-20233' GROUP BY period_code, spatial_version UNION ALL
    SELECT 'SALES_COMMERCIAL',           period_code, spatial_version, COUNT(*) FROM sales_commercial        WHERE spatial_version = 'legacy-20233' GROUP BY period_code, spatial_version UNION ALL
    SELECT 'STORE_ADMINISTRATION',       period_code, spatial_version, COUNT(*) FROM store_administration    WHERE spatial_version = 'legacy-20233' GROUP BY period_code, spatial_version UNION ALL
    SELECT 'STORE_COMMERCIAL',           period_code, spatial_version, COUNT(*) FROM store_commercial        WHERE spatial_version = 'legacy-20233' GROUP BY period_code, spatial_version
)
SELECT a.dataset,
       a.period_code,
       a.spatial_version,
       a.schema_version,
       r.accepted_count AS fact_rows,
       p.typed_rows,
       CASE WHEN p.typed_rows IS NULL                  THEN 'NOT_PROJECTED'
            WHEN p.typed_rows <> r.accepted_count      THEN 'ROW_COUNT_MISMATCH'
            ELSE 'PROJECTED' END AS state
  FROM dataset_active_release a
  LEFT JOIN dataset_release r ON r.run_id = a.run_id
  LEFT JOIN projected p
         ON p.dataset = a.dataset
        AND p.period_code = a.period_code
        AND p.spatial_version = a.spatial_version
 WHERE a.spatial_version = 'legacy-20233'
   -- 이관까지 끝난 슬롯도 보려면 아래 한 줄을 지운다
   AND (p.typed_rows IS NULL OR p.typed_rows <> r.accepted_count)
 ORDER BY a.dataset, a.period_code, a.schema_version;

-- ---------------------------------------------------------------------------
-- 6) service_type 미해석 점검. 이관은 service_category 로 service_code 를
--    업종 분류로 바꿔 넣는다. 여기서 null_service_type 이 0 이 아니면
--    자치구 업종 Top-N 이 그만큼 비고 상권 동종업종 피어 조회에서 그 업종이 빠진다.
-- ---------------------------------------------------------------------------
SELECT 'store_commercial' AS table_name, period_code, spatial_version,
       COUNT(*) AS rows_total, SUM(service_type IS NULL) AS null_service_type
  FROM store_commercial     GROUP BY period_code, spatial_version HAVING SUM(service_type IS NULL) > 0
 UNION ALL
SELECT 'sales_commercial', period_code, spatial_version,
       COUNT(*), SUM(service_type IS NULL)
  FROM sales_commercial     GROUP BY period_code, spatial_version HAVING SUM(service_type IS NULL) > 0
 UNION ALL
SELECT 'store_district', period_code, spatial_version,
       COUNT(*), SUM(service_type IS NULL)
  FROM store_district       GROUP BY period_code, spatial_version HAVING SUM(service_type IS NULL) > 0
 UNION ALL
SELECT 'sales_district', period_code, spatial_version,
       COUNT(*), SUM(service_type IS NULL)
  FROM sales_district       GROUP BY period_code, spatial_version HAVING SUM(service_type IS NULL) > 0
 UNION ALL
SELECT 'store_administration', period_code, spatial_version,
       COUNT(*), SUM(service_type IS NULL)
  FROM store_administration GROUP BY period_code, spatial_version HAVING SUM(service_type IS NULL) > 0
 UNION ALL
SELECT 'sales_administration', period_code, spatial_version,
       COUNT(*), SUM(service_type IS NULL)
  FROM sales_administration GROUP BY period_code, spatial_version HAVING SUM(service_type IS NULL) > 0
 ORDER BY table_name, period_code;

-- 원인별로 나눠 본다. service_category 에 행이 아예 없으면 INSERT, 행은 있는데
-- service_type 이 NULL 이면 UPDATE 다. 둘을 구분하지 않으면 조치가 갈리지 않는다.
-- 업종 코드는 store_commercial 이 가장 넓으므로 대표로 본다. 자치구·행정동에만
-- 나오는 코드가 의심되면 아래 FROM 을 store_district / store_administration 으로 바꿔 다시 돌린다.
SELECT s.service_code,
       s.service_name,
       CASE WHEN c.service_code IS NULL THEN 'NOT_IN_CATEGORY' ELSE 'CATEGORY_TYPE_NULL' END AS cause,
       COUNT(*) AS rows_affected
  FROM store_commercial s
  LEFT JOIN service_category c ON c.service_code = s.service_code
 WHERE s.service_type IS NULL
   AND (c.service_code IS NULL OR c.service_type IS NULL)
 GROUP BY s.service_code, s.service_name, cause
 ORDER BY rows_affected DESC;

-- service_category 는 service_code 에 유니크 제약이 없다. 위 결과를 넣기 전에
-- 같은 코드가 이미 있는지 확인한다. 중복이 생기면 이관 해석이 어느 행을 잡을지 비결정적이다.
SELECT service_code, COUNT(*) AS rows_total
  FROM service_category
 GROUP BY service_code HAVING COUNT(*) > 1
 ORDER BY rows_total DESC;
