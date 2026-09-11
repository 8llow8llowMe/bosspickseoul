-- service_category.service_code unique 인덱스 전환 runbook
--
-- 배경: ServiceCategoryEntity의 idx_service_category_service_code(비유니크)를
-- uk_service_category_service_code(유니크)로 전환했다. service_code 는 업종 코드의
-- 자연키인데 지금까지 DB 가 중복을 막지 않았다.
--
-- 왜 막아야 하는가:
--   (a) 배치 이관 — batch-service 의 ServiceCategoryJdbcAdapter 가
--       SELECT service_code, service_type FROM service_category 를 ORDER BY 없이 읽어
--       Map 으로 접는다. 같은 service_code 가 2행이면 어느 행이 이기는지 비결정적이고,
--       MySQL 은 행 반환 순서를 보장하지 않는다. 그 값이 팩트 테이블의 service_type 에
--       그대로 기록되므로 같은 작업을 두 번 돌리면 해석이 달라질 수 있다.
--   (b) 조회 — findByServiceCodeIn 이 중복 행을 그대로 반환해 상권 업종 목록에
--       같은 업종이 두 번 나간다.
--
-- ddl-auto=update는 (a) 기존 비유니크 인덱스를 drop하지 않고,
-- (b) 중복 service_code가 이미 존재하면 unique 인덱스 생성을 "경고만 남기고" 건너뛴다.
-- prod는 ddl-auto=none이라 아예 반영되지 않는다.
-- 따라서 dev/prod DB에는 아래 절차를 수동 적용해 실제 제약을 확정해야 한다.
--
-- 대상 DB: bosspickseoul_commercial_dev / bosspickseoul_commercial_prod

-- 1. 중복 service_code 사전 점검 (0건이어야 함. 있으면 2번으로 정리 후 진행)
SELECT service_code, COUNT(*) AS cnt
FROM service_category
GROUP BY service_code
HAVING COUNT(*) > 1;

-- 2. 중복이 있으면 정리한다.
--    먼저 어느 행이 남는지, 그 행들의 service_type 이 서로 다른지 확인한다.
--    service_type 이 갈리면 어느 쪽이 맞는지 데이터 담당이 판단한 뒤 지운다.
-- SELECT id, service_code, service_type, service_name
-- FROM service_category
-- WHERE service_code IN (
--     SELECT service_code FROM (
--         SELECT service_code FROM service_category
--         GROUP BY service_code HAVING COUNT(*) > 1
--     ) AS dup
-- )
-- ORDER BY service_code, id;
--
--    판단이 끝나고 "가장 작은 id 를 남긴다" 로 정했다면:
-- DELETE sc FROM service_category sc
-- JOIN (
--     SELECT service_code, MIN(id) AS keep_id
--     FROM service_category
--     GROUP BY service_code
--     HAVING COUNT(*) > 1
-- ) AS k ON sc.service_code = k.service_code AND sc.id <> k.keep_id;

-- 3. 인덱스 전환
ALTER TABLE service_category DROP INDEX idx_service_category_service_code;
ALTER TABLE service_category ADD UNIQUE INDEX uk_service_category_service_code (service_code);

-- 4. 적용 검증 (uk_service_category_service_code의 Non_unique = 0 확인)
SHOW INDEX FROM service_category;

-- 5. 사후 점검 — 중복이 다시 생기지 않는지 확인한다. 0건이어야 한다.
--    scripts/migration/quarterly-import-coverage.sql 의 중복 점검 항목과 같은 쿼리다.
SELECT service_code, COUNT(*) AS cnt
FROM service_category
GROUP BY service_code
HAVING COUNT(*) > 1;
