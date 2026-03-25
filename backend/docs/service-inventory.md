# Backend Service Inventory

## Auth Service

- 책임: 회원 인증, 인가 진입점, 토큰 발급/재발급/로그아웃, 회원 기본 정보
- 컨텍스트: `auth`, `member`
- 특징: `AuthSecurityConfigurer` 기반 인증/인가 서비스

## Commercial Service

- 책임: 상권 상세 분석, 자치구 분석, 상권 요약 조회
- 컨텍스트: `commercial`, `district`
- 특징: 조회 중심 서비스, Presenter/Info 구조 사용

## District Service

- 책임: 지역 계층 탐색, 코드 조회, 지도 영역 조회
- 컨텍스트: `region`, `map`
- 특징: `/api/v1/regions`, `/api/v1/map` 체계로 정리 중

## Community Service

- 책임: 자치구/행정동/상권 대상 커뮤니티, 게시글/댓글/좋아요/신고
- 컨텍스트: `community`
- 특징: `SliceResponse`, 소프트 삭제, 도메인 중심 write 흐름 사용

## Batch Service

- 책임: 영역 좌표 적재 등 일회성/수동 실행 배치
- 특징: Spring Batch 기반, 실행 파라미터 중심 운영

## AI Service

- 책임: 향후 AI 리포트/LLM 연동 진입점
- 상태: 초기 골격만 존재, 실제 도메인/기능은 후속 설계 예정
