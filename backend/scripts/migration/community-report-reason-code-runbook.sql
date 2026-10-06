-- community_report 에 신고 사유 코드(reason_code)·상세(detail) 컬럼을 추가하고 기존 행을 백필하는 런북 (#473)
--
-- 배경
--   신고 사유를 코드로 받는다 — SPAM 스팸·홍보 · ABUSE 욕설·비방 · PRIVACY 개인정보 노출 · FALSE_INFO 거짓 정보 · ETC 기타.
--   요청은 reasonCode(+ detail)이고, 사유 코드 이전 클라이언트의 reason 문자열은 호환 필드로 계속 받는다.
--   FE(#456)는 사유 코드가 생기기 전까지 고른 사유를 「[라벨] 상세」 접두 문자열 하나로 보냈다. 그 행을 이 런북 3절이 코드로 옮긴다.
--   기존 reason 컬럼(VARCHAR(500) NOT NULL)은 남긴다 — 「레거시 사유 원문」(deprecated, 후속 정리 대상).
--   새 버전은 레거시 요청이면 받은 reason, 신규 요청이면 detail(없으면 코드 표시명)을 넣는다.
--
-- 왜 수동 실행인가
--   dev/local 은 ddl-auto=update 가 컬럼을 만들어 주지만(기존 행은 DEFAULT 'ETC'), prod 는 ddl-auto=none 이라 직접 적용한다.
--   대상 DB: community-service DB (prod: bosspickseoul_community_prod)
--   **dev 에도 3절(백필)은 실행해야 한다.** ddl-auto 는 컬럼만 만들고 기존 행을 전부 ETC·detail NULL 로 둔다.
--
-- 실행 순서
--   1) 2절(컬럼 추가)을 **애플리케이션 배포 전에** 실행한다.
--      새 버전은 신고 저장·모더레이션 목록에서 reason_code·detail 을 읽고 쓰므로 컬럼이 없으면 둘 다 실패한다.
--      이전 버전은 새 컬럼을 모르지만 reason_code 가 DEFAULT 'ETC', detail 이 NULL 허용이라 INSERT 가 그대로 성공하므로 먼저 추가해도 안전하다.
--   2) 확인 쿼리로 컬럼을 확인하고 애플리케이션을 배포한다.
--   3) 3절(백필)을 **배포 후에** 실행한다. 배포 전에 돌려도 되지만, 2절과 배포 사이에 이전 버전이 넣은 행이 다시 ETC 로 남는다.
--      3절은 재실행해도 안전하므로 배포 전·후 두 번 돌려도 된다.
--
-- 주의
--   - 파일은 UTF-8 이고 3절 리터럴에 한글·가운뎃점(U+00B7 「·」)이 있다. 아래 SET NAMES utf8mb4 를 지우지 않는다.
--     mysql CLI 로 돌릴 때는 --default-character-set=utf8mb4 도 함께 준다(Windows 콘솔 코드페이지가 리터럴을 바꾸지 않게).
--   - 컬럼은 AFTER 없이 끝에 붙인다. 끝에 붙이는 컬럼 추가는 NOT NULL DEFAULT 상수 컬럼이라도 MySQL 8.0.12+ 에서 INSTANT 로 끝나
--     테이블을 다시 쓰지 않는다(기본값은 메타데이터에만 기록된다). 8.0.29+ 는 INSTANT 컬럼 변경이 행 버전을 하나씩 쓰고 64 개가 상한이다 —
--     1절의 TOTAL_ROW_VERSIONS 를 확인한다. ROW_FORMAT=COMPRESSED·FULLTEXT 인덱스가 있으면 INSTANT 가 불가능하다(community_report 는 둘 다 없다).
--   - 알고리즘을 명시한다(ALGORITHM=INSTANT). 명시하지 않으면 불가능할 때 경고 없이 테이블 복사로 넘어간다.
--     명시하면 불가능할 때 오류로 멈추므로, 그때는 원인을 확인한 뒤 다시 계획한다.
--   - 2절은 information_schema 로 확인한 뒤 실행하므로 여러 번 실행해도 안전하다(community-post-category-runbook.sql 과 같은 방식).
--   - 새 인덱스는 없다. 모더레이션 목록은 PENDING 만 읽고(처리되면 빠지는 작은 집합) 기존 idx_community_report_status 로 거른 뒤
--     reason_code 는 잔여 조건으로 본다(backend/docs/services/community-service.md 「신고 사유 코드」).
--   - 기존 reason 컬럼의 COMMENT 는 바꾸지 않는다. MODIFY COLUMN 은 전체 정의를 다시 적어야 해서 잘못 적으면 타입·NULL 여부가 바뀐다.
--     「deprecated」 표기는 엔티티 @Comment 와 서비스 문서에 둔다.
--
-- 롤백
--   1) 애플리케이션을 먼저 이전 버전으로 되돌린다. 새 버전은 컬럼이 없으면 신고 저장과 모더레이션 목록이 실패한다.
--   2) 컬럼은 남긴다. 이전 버전에는 무해하다(DEFAULT 'ETC' 라 INSERT 가 성공한다).
--      지우면(ALTER TABLE community_report DROP COLUMN detail, DROP COLUMN reason_code) 사유 코드가 사라지고,
--      신규 요청 중 상세가 있던 행은 reason 컬럼에 상세만 있어 사유 코드를 되살릴 수 없다.
--   3) 다시 새 버전으로 롤포워드할 때는 3절을 한 번 더 실행한다. 롤백 기간에 이전 버전이 넣은 행이 ETC·detail NULL 로 남아 있다.

SET NAMES utf8mb4;

-- ── 1. 현재 상태 확인 (이미 적용됐으면 2 는 건너뛰는 SELECT 만 남긴다) ──────
SHOW COLUMNS FROM community_report;

-- 행 형식 — COMPRESSED 면 INSTANT 가 불가능하다.
SELECT TABLE_NAME, TABLE_COLLATION, ROW_FORMAT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'community_report';

-- 콜레이션 — 3절 LIKE 가 실제로 쓰는 것은 테이블이 아니라 reason 컬럼의 콜레이션이다.
-- utf8mb4 계열(dev/prod 기본 utf8mb4_0900_ai_ci)이어야 LIKE·CHAR_LENGTH 가 글자 단위로 동작한다.
SELECT COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'community_report' AND COLUMN_NAME = 'reason';

-- 인덱스 — 모더레이션 목록 필터는 idx_community_report_status(status) 를 전제로 한다. prod 에 없으면 원인을 먼저 본다.
SELECT INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'community_report'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- 서버 버전 — 8.0.12 이상이어야 2절의 ALGORITHM=INSTANT 가 가능하다.
SELECT VERSION();

-- INSTANT 행 버전. 8.0.29+ 에서는 결과에 TOTAL_ROW_VERSIONS 가 있고, 64 에 가까우면 INSTANT 가 거절되므로 계획을 다시 본다.
-- (8.0.29 미만에는 그 컬럼이 없어 SELECT * 로 조회한다 — 컬럼 이름을 적으면 그 버전에서 Unknown column 으로 멈춘다)
SELECT *
FROM information_schema.INNODB_TABLES
WHERE NAME = CONCAT(DATABASE(), '/community_report');

-- ── 2. 컬럼 추가 (이미 있으면 건너뜀, 애플리케이션 배포 전) ─────────────────
-- 오래 도는 트랜잭션 뒤에서 메타데이터 락을 기다리며 뒤따르는 조회를 줄줄이 막지 않도록 대기 시간을 짧게 둔다.
-- 시간 초과로 실패하면 트래픽이 적을 때 다시 실행한다.
SET SESSION lock_wait_timeout = 5;

SET @ddl := (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE community_report ADD COLUMN reason_code VARCHAR(20) NOT NULL DEFAULT ''ETC'' COMMENT ''신고 사유 코드 (SPAM/ABUSE/PRIVACY/FALSE_INFO/ETC)'', ALGORITHM=INSTANT',
        'SELECT ''skip: community_report.reason_code already exists''')
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'community_report' AND COLUMN_NAME = 'reason_code');
PREPARE community_report_reason_code FROM @ddl;
EXECUTE community_report_reason_code;
DEALLOCATE PREPARE community_report_reason_code;

SET @ddl := (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE community_report ADD COLUMN detail VARCHAR(500) NULL COMMENT ''신고 상세 내용 (없으면 null)'', ALGORITHM=INSTANT',
        'SELECT ''skip: community_report.detail already exists''')
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'community_report' AND COLUMN_NAME = 'detail');
PREPARE community_report_reason_code FROM @ddl;
EXECUTE community_report_reason_code;
DEALLOCATE PREPARE community_report_reason_code;

-- 컬럼: reason_code 는 varchar(20) / NO / ETC, detail 은 varchar(500) / YES / NULL 이어야 한다.
SHOW COLUMNS FROM community_report WHERE Field IN ('reason_code', 'detail');

-- ── 3. 기존 행 백필 (애플리케이션 배포 후, 재실행 안전 — dev 에도 실행) ─────────
-- 「[라벨] 상세」 접두를 떼어 코드와 상세로 옮긴다. 애플리케이션의 레거시 해석(CommunityReportReason)과 같은 규칙이다.
--   - 라벨은 FE COMMUNITY_REPORT_REASONS 그대로다. 가운뎃점은 U+00B7 이다.
--   - MySQL LIKE 에서 특수문자는 % 와 _ 뿐이라 '[' ']' 는 글자 그대로 비교된다(SQL Server 와 다르다). 라벨에는 % · _ 가 없다.
--   - CHAR_LENGTH·SUBSTRING 은 바이트가 아니라 글자 단위다(utf8mb4). 접두 글자 수 다음부터가 상세다.
--   - TRIM 은 앞뒤 공백(스페이스)만 지운다. 애플리케이션은 탭·줄바꿈까지 지우지만, FE 는 「[라벨] 상세」 를 스페이스 하나로 잇고 상세를 trim 해 보냈으므로 결과가 같다.
--   - _ai_ci 콜레이션은 전각/반각 차이를 무시하므로 전각 괄호(［ ］) 접두도 걸린다. 애플리케이션은 그런 행을 ETC 로 두지만 FE 가 보낸 적 없는 모양이다.
-- 재실행 안전: 모든 문장이 reason_code = 'ETC' AND detail IS NULL 인 행만 고친다. 옮긴 행은 코드가 바뀌거나 detail 이 채워져 다시 걸리지 않는다.
--   새 버전이 저장한 행도 걸리지 않는다 — 신규 요청의 ETC 는 상세가 필수이고, 레거시 요청은 저장할 때 이미 같은 규칙으로 해석된다.
-- 신고 행은 많지 않아 한 문장으로 돈다. 많으면 각 UPDATE 끝에 LIMIT 1000 을 붙여 영향 행이 0 이 될 때까지 반복해도 같은 결과다.
--   (각 문장은 실제로 바뀌는 행만 고르도록 조건을 두었다 — 바뀌지 않는 행이 계속 걸리면 반복이 일찍 멈춘다)
-- 운영 메모
--   - 각 UPDATE 는 인덱스 없이 테이블 전체를 훑고, REPEATABLE READ 에서 훑은 행에 next-key 락을 잡아 그동안 새 신고 INSERT 가 기다린다.
--     작은 테이블이면 수 ms 지만 트래픽이 적은 시간대에 mysql CLI 로 실행한다.
--   - MySQL Workbench 는 기본으로 Safe Updates 가 켜져 있어 키 없는 UPDATE 를 1175 오류로 거절한다.
--     GUI 로 돌려야 하면 이 세션에서만 SET SESSION sql_safe_updates = 0; 을 먼저 실행한다.

UPDATE community_report
   SET reason_code = 'SPAM',
       detail = NULLIF(TRIM(SUBSTRING(reason, CHAR_LENGTH('[스팸·홍보]') + 1)), '')
 WHERE reason_code = 'ETC' AND detail IS NULL
   AND reason LIKE '[스팸·홍보]%';

UPDATE community_report
   SET reason_code = 'ABUSE',
       detail = NULLIF(TRIM(SUBSTRING(reason, CHAR_LENGTH('[욕설·비방]') + 1)), '')
 WHERE reason_code = 'ETC' AND detail IS NULL
   AND reason LIKE '[욕설·비방]%';

UPDATE community_report
   SET reason_code = 'PRIVACY',
       detail = NULLIF(TRIM(SUBSTRING(reason, CHAR_LENGTH('[개인정보 노출]') + 1)), '')
 WHERE reason_code = 'ETC' AND detail IS NULL
   AND reason LIKE '[개인정보 노출]%';

UPDATE community_report
   SET reason_code = 'FALSE_INFO',
       detail = NULLIF(TRIM(SUBSTRING(reason, CHAR_LENGTH('[거짓 정보]') + 1)), '')
 WHERE reason_code = 'ETC' AND detail IS NULL
   AND reason LIKE '[거짓 정보]%';

-- 「기타」 접두도 접두를 떼어 ETC + 상세로 둔다. 상세 없는 「[기타]」 는 detail NULL 로 남는다(레거시는 기타 상세를 강제하지 않는다).
-- 상세 없는 「[기타]」 는 바꿀 것이 없으므로 조건에서 뺀다 — 넣으면 매번 걸리지만 바뀌지 않아 LIMIT 반복이 일찍 멈춘다.
UPDATE community_report
   SET detail = TRIM(SUBSTRING(reason, CHAR_LENGTH('[기타]') + 1))
 WHERE reason_code = 'ETC' AND detail IS NULL
   AND reason LIKE '[기타]%'
   AND TRIM(SUBSTRING(reason, CHAR_LENGTH('[기타]') + 1)) <> '';

-- 접두가 없거나 모르는 라벨인 행(사유 코드 이전 자유 입력)은 원문 전체를 상세로 둔다. 위에서 상세 없이 남은 「[기타]」 는 건드리지 않는다.
UPDATE community_report
   SET detail = reason
 WHERE reason_code = 'ETC' AND detail IS NULL
   AND reason NOT LIKE '[기타]%';

-- ── 4. 백필 검증 ──────────────────────────────────────────────────────
-- 코드별 건수와 상세 없는 건수. detail_null_count 는 접두만 있던 행(「[스팸·홍보]」 등) 수다.
SELECT reason_code, COUNT(*) AS report_count, SUM(detail IS NULL) AS detail_null_count
FROM community_report
GROUP BY reason_code
ORDER BY reason_code;

-- 0 이어야 한다 — 아직 옮기지 않은 행(ETC·상세 없음·「[기타]」 접두 아님).
SELECT COUNT(*) AS remaining_count
FROM community_report
WHERE reason_code = 'ETC' AND detail IS NULL AND reason NOT LIKE '[기타]%';

-- 0 이어야 한다 — 상세가 있는 「[기타] 상세」 인데 아직 detail 로 옮기지 않은 행.
SELECT COUNT(*) AS unparsed_etc_detail_count
FROM community_report
WHERE reason_code = 'ETC' AND detail IS NULL
  AND reason LIKE '[기타]%'
  AND TRIM(SUBSTRING(reason, CHAR_LENGTH('[기타]') + 1)) <> '';

-- 아는 라벨 접두인데 ETC 로 남은 행. 0 이 아니면 아래 눈 확인 쿼리로 행을 본다.
-- 새 버전이 저장한 정상 행도 걸릴 수 있다 — 신규 요청이 ETC 를 고르고 상세를 「[스팸·홍보] …」 처럼 썼으면 reason = 상세라 이 조건에 맞는다.
-- 그 행은 created_at 이 배포 이후다. 배포 이전 행이 남았으면 3절 라벨 UPDATE 가 맞지 않은 것이다(콜레이션·문자 확인).
SELECT COUNT(*) AS unparsed_label_count
FROM community_report
WHERE reason_code = 'ETC'
  AND (reason LIKE '[스팸·홍보]%' OR reason LIKE '[욕설·비방]%' OR reason LIKE '[개인정보 노출]%' OR reason LIKE '[거짓 정보]%');

-- 눈으로 확인 — ETC 로 남은 접두 행은 모르는 라벨이거나 「[기타]」 여야 한다.
SELECT id, reason_code, detail, reason
FROM community_report
WHERE reason_code = 'ETC' AND reason LIKE '[%]%'
ORDER BY created_at DESC
LIMIT 50;

-- 실행계획 — 모더레이션 사유 필터. 기대: key 가 idx_community_report_status, reason_code 는 잔여 조건(Using where), PENDING 건수만큼 filesort.
EXPLAIN
SELECT * FROM community_report
WHERE status = 'PENDING' AND reason_code = 'SPAM'
ORDER BY created_at;
