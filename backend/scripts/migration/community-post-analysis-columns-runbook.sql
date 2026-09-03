-- community_post 에 분석 첨부 컬럼 4종 추가 runbook
--
-- 배경: 상권 비교 초안(POST /community/posts/drafts/commercial-comparisons)이 내려주는
-- analysis* 4필드를 게시글 작성/상세에서 받을 곳이 없어 초안-게시글 배선이 반쪽이었다.
-- 작성 요청과 상세 응답에 4필드가 추가되면서 저장 컬럼이 필요하다.
-- 비교 초안에서 넘어온 글에만 값이 있고 일반 글은 전부 NULL 이다.
--
-- dev 는 ddl-auto=update 로 자동 추가되지만, prod 는 ddl-auto=none 이므로 수동 적용한다.
-- 대상 DB: community-service DB (prod: bosspickseoul_community_prod)

ALTER TABLE community_post
    ADD COLUMN analysis_type         VARCHAR(30)  NULL COMMENT '분석 첨부 타입 (비교 초안 글에만 값, 일반 글은 null)' AFTER content,
    ADD COLUMN analysis_ref_code     VARCHAR(100) NULL COMMENT '분석 참조 코드 (예: 좌상권:우상권:업종:분기)' AFTER analysis_type,
    ADD COLUMN analysis_ref_name     VARCHAR(200) NULL COMMENT '분석 참조 표시명 (예: A상권 vs B상권)' AFTER analysis_ref_code,
    ADD COLUMN analysis_snapshot_key VARCHAR(200) NULL COMMENT '분석 스냅샷 키 (프론트가 비교 화면 재진입에 사용)' AFTER analysis_ref_name;

-- 적용 검증
SHOW COLUMNS FROM community_post LIKE 'analysis%';
