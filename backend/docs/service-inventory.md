# Backend Service Inventory

## Auth Service

- 책임: 회원 인증, 인가 진입점, 토큰 발급/재발급/로그아웃, 소셜 로그인(kakao/naver), 이메일 인증코드 발송·검증, 회원 기본 정보, 북마크
- 컨텍스트: `auth`, `member`
- 특징: `AuthSecurityConfigurer` 기반 인증/인가 서비스

## Commercial Service

- 책임: 상권 상세 분석, 자치구 분석, 상권 요약 조회, 분석 화면 공유 링크
- 컨텍스트: `commercial`, `district`, `sharelink`
- 특징: 조회 중심 서비스, Presenter/Info 구조 사용. `sharelink`는 유일한 write 컨텍스트로,
  Resource Server(JWT) 기반 선택적 인증(`POST /api/v1/share-links`, 토큰 있으면 공유자 기록)을 사용한다.

## District Service

- 책임: 지역 계층 탐색, 코드 조회, 지도 영역 조회
- 컨텍스트: `region`, `map`
- 특징: `/api/v1/regions`, `/api/v1/map` 체계로 정리 완료

## Community Service

- 책임: 자치구/행정동/상권 대상 커뮤니티, 게시글/댓글/좋아요/신고
- 컨텍스트: `community`
- 특징: `SliceResponse`, 소프트 삭제, 도메인 중심 write 흐름 사용

## Batch Service

- 책임: 영역 좌표 적재 등 일회성/수동 실행 배치
- 특징: Spring Batch 기반, 실행 파라미터 중심 운영

## AI Service

- 책임: 상권/자치구/행정동/비교 분석 데이터를 LLM 으로 요약하는 AI 리포트 서비스
- 컨텍스트: `aireport`
- 특징: Ollama / OpenAI 어댑터 분기, Redis 기반 결과 캐시, 인증된 사용자 한정 리포트 4종(상권/비교/자치구/행정동) 비동기 제출 + 폴링/SSE 조회 (`POST` 제출 + `GET /jobs/{id}`, `GET /jobs/{id}/stream`), 토큰 사용량 카운터
