-- community-service 의 로컬 지역 참조 테이블(commercial_region_mapping) 제거 runbook
--
-- 배경: 커뮤니티 대상(자치구/행정동/상권) 검증이 로컬 참조 테이블 조회에서
-- district-service 실조회(Feign)로 전환됐다. 원천 테이블은 district-service DB 에 있고,
-- 서비스별 DB 분리 후 커뮤니티 쪽 복제본은 채우는 절차가 없어 늘 비어 있었다
-- (모든 대상 검증이 COMMUNITY_004 로 떨어지던 원인). 복제본을 시딩하면 지역 데이터
-- 갱신 때마다 원천과 불일치가 생기므로 실조회로 전환하고 테이블은 제거한다.
--
-- 주의: district-service DB 의 동명 테이블(commercial_region_mapping)은 원천이다.
-- 반드시 community 스키마에서만 실행할 것.
--
-- 대상 DB: community-service DB (dev: bosspickseoul_community_dev / prod: bosspickseoul_community_prod)
-- ddl-auto 는 엔티티 삭제 시 테이블을 지우지 않으므로 dev 도 수동 적용이 필요하다.

DROP TABLE IF EXISTS commercial_region_mapping;

-- 적용 검증
SHOW TABLES LIKE 'commercial_region_mapping';
