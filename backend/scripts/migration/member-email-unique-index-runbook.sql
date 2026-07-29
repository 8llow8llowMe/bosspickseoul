-- member.email unique 인덱스 전환 runbook
--
-- 배경: MemberEntity의 idx_member_email(비유니크)을 uk_member_email(유니크)로 전환했다.
-- ddl-auto=update는 (a) 기존 비유니크 인덱스를 drop하지 않고,
-- (b) 중복 email이 이미 존재하면 unique 인덱스 생성을 "경고만 남기고" 건너뛴다.
-- 따라서 dev/prod DB에는 아래 절차를 수동 적용해 실제 제약을 확정해야 한다.
--
-- 대상 DB: bosspickseoul_auth_dev / bosspickseoul_auth_prod

-- 1. 중복 email 사전 점검 (0건이어야 함. 있으면 정리 후 진행)
SELECT email, COUNT(*) AS cnt
FROM member
GROUP BY email
HAVING COUNT(*) > 1;

-- 2. (선택) 기존 이메일을 정규화 정책(소문자)에 맞춤 — 애플리케이션은 이후 소문자로 저장한다.
--    충돌 여부 먼저 확인:
SELECT LOWER(email), COUNT(*)
FROM member
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;
--    충돌이 없으면:
-- UPDATE member SET email = LOWER(email);

-- 3. 인덱스 전환
ALTER TABLE member DROP INDEX idx_member_email;
ALTER TABLE member ADD UNIQUE INDEX uk_member_email (email);

-- 4. 적용 검증 (uk_member_email의 Non_unique = 0 확인)
SHOW INDEX FROM member;
