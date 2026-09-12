-- district-service 인덱스를 실제 조회 패턴에 맞게 교체/보강하는 런북
--
-- 배경
--   (1) area_boundary
--       지도 영역 조회는 areaType 등가 + bbox 범위 네 조건을 함께 건다.
--       기존 인덱스는 선두가 bbox 범위 컬럼이라 두 번째 컬럼이 정제에 쓰이지 못했고,
--       areaType 이 인덱스에 아예 없어 읽어 온 행마다 후필터가 붙었다.
--       등가 1개 + 범위 1개를 얻도록 areaType 을 선두로 올린 복합 인덱스로 바꾼다.
--   (2) commercial_region_mapping
--       GET /api/v1/regions/code-lookup 은 자치구명/행정동명/상권명으로 조회하는데
--       세 컬럼 모두 인덱스가 없어 풀스캔이었다. 상권 코드 단건 조회도 마찬가지다.
--
-- 왜 수동 실행인가
--   ddl-auto: update 는 새 인덱스를 만들어 주지만 <b>기존 인덱스를 지우지 않는다</b>.
--   교체된 인덱스를 그대로 두면 쓰기마다 불필요한 인덱스 유지 비용이 계속 발생하므로 직접 제거한다.
--   prod 는 ddl-auto: none 이라 새 인덱스도 만들어 주지 않는다. 그래서 CREATE 문을 함께 적어 둔다.
--
-- 실행 순서
--   1) 애플리케이션을 배포한다 (dev: Hibernate 가 새 인덱스를 생성 / prod: 아래 CREATE 를 직접 실행)
--   2) 1번 확인 쿼리로 새 인덱스가 만들어졌는지 본다
--   3) DROP 문을 실행해 area_boundary 의 옛 bbox 인덱스 2개를 제거한다
--   4) 4번 검증 쿼리(EXPLAIN)로 새 인덱스가 실제로 잡히는지 확인한다
--
-- 주의
--   area_boundary 는 폴리곤 JSON 을 담고 있어 행당 크기가 크다. 인덱스 생성이 오래 걸릴 수 있으므로
--   트래픽이 적은 시간대에 수행한다.

-- ── 1. 현재 인덱스 확인 ────────────────────────────────────────────────
SELECT TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME, NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('area_boundary', 'commercial_region_mapping')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- ── 2. 새 인덱스가 없다면 직접 생성 (배포로 생성됐으면 생략) ─────────────
-- area_boundary: areaType 을 선두로 올린 등가 + 범위 복합 인덱스
-- CREATE INDEX idx_area_boundary_area_type_bbox_min_lng_bbox_max_lng
--     ON area_boundary (area_type, bbox_min_lng, bbox_max_lng);
-- CREATE INDEX idx_area_boundary_area_type_bbox_min_lat_bbox_max_lat
--     ON area_boundary (area_type, bbox_min_lat, bbox_max_lat);

-- commercial_region_mapping: 지역명/상권코드 조회용
-- 자치구명 조회만 커버링(2컬럼)으로 둔다. select distinct district_code, district_name where district_name = ?
-- 가 인덱스만 읽고 끝나 클러스터드 인덱스 되돌이와 DISTINCT 임시 테이블이 모두 사라진다.
-- 행정동/상권은 각각 4·6컬럼을 담아야 커버링이 되어 1,650행 테이블에 과하므로 단일 컬럼으로 둔다.
-- CREATE INDEX idx_commercial_region_mapping_district_name_district_code
--     ON commercial_region_mapping (district_name, district_code);
-- CREATE INDEX idx_commercial_region_mapping_administration_name
--     ON commercial_region_mapping (administration_name);
-- CREATE INDEX idx_commercial_region_mapping_commercial_name
--     ON commercial_region_mapping (commercial_name);
-- CREATE INDEX idx_commercial_region_mapping_commercial_code
--     ON commercial_region_mapping (commercial_code);

-- ── 3. 교체된 옛 인덱스 제거 ───────────────────────────────────────────
-- prod: 2번 CREATE 를 먼저 실행하지 않았다면 여기서 멈춘다.
--       prod 는 ddl-auto: none 이라 배포만으로는 새 인덱스가 생기지 않는다. 이 파일을 통째로 흘려 넣으면
--       옛 bbox 인덱스 2개만 사라지고 대체 인덱스가 없어 뷰포트 조회가 풀스캔으로 떨어진다.
-- 새 복합 인덱스 2개가 1번 확인 쿼리에 나오는 것을 눈으로 본 뒤에 실행한다.
ALTER TABLE area_boundary DROP INDEX idx_area_boundary_bbox_min_lng_bbox_max_lng;
ALTER TABLE area_boundary DROP INDEX idx_area_boundary_bbox_min_lat_bbox_max_lat;

-- ── 4. 검증 ───────────────────────────────────────────────────────────
-- 뷰포트 조회가 새 복합 인덱스를 잡는지 확인한다.
--
-- 성공 기준: possible_keys 에 idx_area_boundary_area_type_bbox_... 가 보이면 인덱스 자체는 정상이다.
--   key 가 NULL 이거나 type 이 ALL(풀스캔)로 나와도 인덱스 생성 실패가 아니다. area_boundary 는 약 2,099행이고
--   area_type = 'COMMERCIAL' 만으로 약 79% 가 남으며, 쿼리가 select * 라 인덱스가 커버링이 되지 못해
--   옵티마이저가 풀스캔을 고르는 것이 정상적인 선택일 수 있다. 이것을 실패로 오해해 롤백하거나
--   3번 DROP 을 망설이지 않는다.
--   참고: 행 수가 자릿수 단위로 늘면 bbox 4컬럼 대신 POINT/GEOMETRY 컬럼 + SPATIAL 인덱스 + MBRIntersects 로
--   전환한다. 지금 할 일은 아니다.
EXPLAIN
SELECT *
FROM area_boundary
WHERE area_type = 'COMMERCIAL'
  AND bbox_max_lng >= 126.98 AND bbox_min_lng <= 127.05
  AND bbox_max_lat >= 37.50 AND bbox_min_lat <= 37.56
LIMIT 251;

-- 지역명 조회가 인덱스를 잡는지 확인한다.
EXPLAIN
SELECT DISTINCT district_code, district_name
FROM commercial_region_mapping
WHERE district_name = '종로구';

EXPLAIN
SELECT *
FROM commercial_region_mapping
WHERE commercial_code = '3110008'
LIMIT 1;

-- ── 5. 확인 쿼리 (구현 시점에 실데이터로 확인하지 못한 항목) ─────────────
-- 아래 세 가지는 코드에서 단정하지 않고 런북에 남긴다. 운영 DB 에서 직접 확인한다.

-- 5-1. 동명 행정동/상권이 실제로 있는지 (REGION_006 이 뜨는 조건)
--      1행이라도 나오면 해당 이름은 코드로만 조회할 수 있다. 프론트 문구에 반영한다.
SELECT administration_name, COUNT(DISTINCT administration_code) AS c
FROM commercial_region_mapping
GROUP BY administration_name
HAVING c > 1;

SELECT commercial_name, COUNT(DISTINCT commercial_code) AS c
FROM commercial_region_mapping
GROUP BY commercial_name
HAVING c > 1;

-- 5-2. commercial_code 유니크 승격 가능 여부
--      도메인상 유일하지만 실데이터 중복을 확인하지 못해 일반 인덱스로 두었다.
--      ddl-auto: update 환경에서 유니크 생성이 실패하면 기동이 막히므로 코드에서 승격하지 않는다.
SELECT commercial_code, COUNT(*) AS c
FROM commercial_region_mapping
GROUP BY commercial_code
HAVING c > 1;
-- 위가 0행이면 아래로 승격한다.
-- ALTER TABLE commercial_region_mapping DROP INDEX idx_commercial_region_mapping_commercial_code;
-- CREATE UNIQUE INDEX uk_commercial_region_mapping_commercial_code
--     ON commercial_region_mapping (commercial_code);

-- 5-3. 폴리곤 평균 크기 (뷰포트 상한 산정 근거 재확인용)
--      상한은 자치구 50 / 행정동 500 / 상권 250 이며 app.map.viewport.* 로 조정한다.
--      avg_bytes × 상한 이 한 응답의 대략적인 폴리곤 전송량이다. 데이터가 갱신되어
--      평균이 크게 늘었다면 상한을 다시 산정한다.
SELECT area_type, COUNT(*) AS rows_count, AVG(LENGTH(boundary_geo_json)) AS avg_bytes
FROM area_boundary
GROUP BY area_type;
