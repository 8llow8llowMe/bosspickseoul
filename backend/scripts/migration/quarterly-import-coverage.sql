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
-- 2026-09-10 기준 원천이 주는 최신 분기는 20254 다.

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
    SELECT '20251' UNION ALL SELECT '20252' UNION ALL SELECT '20253' UNION ALL SELECT '20254'
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
