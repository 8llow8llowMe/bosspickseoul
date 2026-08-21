-- 분석 보관함(analysis_bookmark) 테이블 생성 runbook
--
-- 배경: commercial-service에 analysisbookmark 컨텍스트가 추가되었다.
-- 회원이 분석 화면 상태(payload)를 만료 없이 저장하는 보관함으로,
-- payload 포맷/정규화 규칙은 공유 링크(share_link)와 동일하지만 소유권 모델이 다르므로 별도 테이블을 쓴다.
-- dev는 ddl-auto=update로 테이블이 자동 생성되지만, prod는 ddl-auto=none이므로
-- 배포 전에 아래 DDL을 수동 적용해야 한다. 스키마는 dev에서 Hibernate가 생성한 것과 동치다.
--
-- 주의: id는 애플리케이션의 Snowflake 생성기가 부여하므로 AUTO_INCREMENT가 아니다.
--
-- 대상 DB: commercial-service DB (dev 자동 생성 / prod 수동 적용)

-- 1. 분석 보관함
CREATE TABLE IF NOT EXISTS analysis_bookmark (
    id            BIGINT        NOT NULL COMMENT '보관함 항목 아이디 (애플리케이션 Snowflake 생성, AUTO_INCREMENT 아님)',
    member_id     BIGINT        NOT NULL COMMENT '회원 아이디 (FK: member.id)',
    share_type    VARCHAR(30)   NOT NULL COMMENT '분석 화면 타입 (공유 링크와 동일 enum)',
    payload       VARCHAR(2000) NOT NULL COMMENT '화면 진입 상태 payload (정규화된 JSON, 백엔드는 해석하지 않음)',
    payload_hash  VARCHAR(64)   NOT NULL COMMENT 'shareType + 정규화 payload 의 SHA-256 해시 (회원별 중복 저장 방지)',
    bookmark_name VARCHAR(50)   NULL COMMENT '사용자 지정 보관함 이름 (미지정이면 null)',
    created_at    DATETIME(6)   NOT NULL COMMENT '저장 시각',
    PRIMARY KEY (id),
    UNIQUE KEY uk_analysis_bookmark_member_id_payload_hash (member_id, payload_hash),
    KEY idx_analysis_bookmark_member_id_created_at (member_id, created_at)
) COMMENT '회원의 분석 화면 보관함 (공유 링크와 동일한 payload 포맷, 만료 없음)';

-- 2. 적용 검증
SHOW TABLES LIKE 'analysis_bookmark';
SHOW INDEX FROM analysis_bookmark;
