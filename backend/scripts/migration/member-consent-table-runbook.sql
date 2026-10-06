-- 회원 가입 동의 이력(member_consent) 테이블 생성 runbook (이슈 #494)
--
-- 배경: 가입 때 이용약관·개인정보 처리방침 동의와 만 14세 이상 확인을 받고, 어떤 문서의 어느 판에 언제 동의했는지
-- 이력으로 남긴다. 일반 가입·소셜 첫 가입·개발용 가입이 모두 같은 이력(가입 1건당 3행, 같은 agreed_at)을 남긴다.
-- dev 는 ddl-auto=update 로 테이블이 자동 생성되지만, prod 는 ddl-auto=none 이므로 배포 전에 아래 DDL 을 수동 적용해야 한다.
-- 테이블이 없으면 prod 의 가입(일반·소셜 첫 가입)이 INSERT 에서 실패한다. 기존 회원 로그인은 이 테이블을 읽지 않는다.
--
-- 주의
--   - id 는 애플리케이션의 Snowflake 생성기가 부여하므로 AUTO_INCREMENT 가 아니다.
--   - (member_id, consent_type) 에 unique 를 걸지 않는다. 문서 개정 뒤 재동의하면 같은 항목에 행이 더 쌓인다.
--   - consent_type 은 VARCHAR(30) 이다. Hibernate 6 의 MySQL 방언은 @Enumerated(STRING) 를 네이티브 ENUM 으로 만들기 때문에,
--     엔티티에 @JdbcTypeCode(SqlTypes.VARCHAR) 를 붙여 dev(ddl-auto)도 varchar(30) 으로 만들게 고정했다. ENUM 이면 항목을
--     늘릴 때마다 ALTER 가 필요하고, ddl-auto=update 는 기존 컬럼 타입을 고치지 않아 새 항목 INSERT 가 실패한다.
--     이 고정 전에 dev 에 ENUM 으로 생긴 테이블은 아래 4번의 ALTER 로 맞춘다.
--   - 동의 이전에 가입한 기존 회원은 이력이 없다(소급 동의를 받지 않는다). 이력이 없으면 "동의 도입 전 가입"으로 본다.
--   - 탈퇴 회원의 이력은 탈퇴 후 1년(legal.withdrawn-retention) 뒤 파기한다. 파기 작업은 후속 이슈다.
--   - 컬럼을 바꾸면 MemberConsentEntity 와 MemberConsentSchemaContractTest 가 함께 움직여야 한다.
--
-- 대상 DB: bosspickseoul_auth_dev (자동 생성) / bosspickseoul_auth_prod (수동 적용)

-- 1. 동의 이력
CREATE TABLE IF NOT EXISTS member_consent (
    id               BIGINT       NOT NULL COMMENT '동의 이력 아이디 (Snowflake)',
    created_at       TIMESTAMP    NOT NULL COMMENT '생성 날짜',
    updated_at       TIMESTAMP    NOT NULL COMMENT '수정 날짜',
    member_id        BIGINT       NOT NULL COMMENT '회원 아이디 (FK: member.id)',
    consent_type     VARCHAR(30)  NOT NULL COMMENT '동의·확인 항목 (TERMS / PRIVACY / AGE_OVER_14) - AGE_OVER_14 는 자기신고 확인이라 철회 대상이 아니다',
    document_version VARCHAR(20)  NOT NULL COMMENT '동의한 문서 판 - legal.*-version 설정값. AGE_OVER_14 는 만 14세 기준을 규정한 이용약관 판',
    agreed_at        DATETIME(6)  NOT NULL COMMENT '동의 시각 - 한 가입의 항목들은 같은 시각이다. 행 생성 시각(created_at)과 별개로 둔다',
    PRIMARY KEY (id),
    KEY idx_member_consent_member_id (member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT '회원 가입 동의·확인 이력';

-- 2. 적용 검증
SHOW TABLES LIKE 'member_consent';
SHOW INDEX FROM member_consent;

-- 3. 컬럼 모양 검증. CREATE TABLE IF NOT EXISTS 는 모양이 다른 기존 테이블이 있으면 아무 말 없이 넘어가므로 실제 타입을 본다.
--    consent_type 은 DATA_TYPE = 'varchar', CHARACTER_MAXIMUM_LENGTH = 30 이어야 한다. 'enum' 이면 4번을 적용한다.
--    document_version 은 varchar / 20 이어야 한다(legal.*-version 은 기동 때 20자 이하로 검사한다).
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'member_consent'
ORDER BY ORDINAL_POSITION;

SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'member_consent' AND COLUMN_NAME = 'consent_type'
  AND NOT (DATA_TYPE = 'varchar' AND CHARACTER_MAXIMUM_LENGTH = 30);
--    위 쿼리는 0건이어야 한다.

-- 4. (dev 에 ENUM 으로 먼저 생긴 경우에만) consent_type 을 VARCHAR(30) 으로 바꾼다. 기존 값(TERMS 등)은 그대로 문자열로 남는다.
-- ALTER TABLE member_consent
--     MODIFY consent_type VARCHAR(30) NOT NULL COMMENT '동의·확인 항목 (TERMS / PRIVACY / AGE_OVER_14) - AGE_OVER_14 는 자기신고 확인이라 철회 대상이 아니다';

-- 5. 가입 직후 확인 (가입 1건당 3행, 같은 agreed_at, 설정한 판)
-- SELECT member_id, consent_type, document_version, agreed_at FROM member_consent WHERE member_id = <가입한 회원 아이디>;
