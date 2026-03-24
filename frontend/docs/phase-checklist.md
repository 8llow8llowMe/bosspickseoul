# Phase Checklist

## 운영 규칙

- 각 Phase는 완료 시 체크한다.
- 사용자 요청으로 순서를 건너뛴 경우, 비고에 명시한다.
- Phase 완료 후 관련 문서와 인벤토리 상태를 함께 갱신한다.

## Phase 0. 부트스트랩

상태: 완료

- [x] `pnpm` 기준 Next.js App Router 프로젝트 생성
- [x] TypeScript, ESLint, alias 설정
- [x] `Prettier` 설치 및 포맷 스크립트 추가
- [x] `styled-components` SSR registry 구성
- [x] 글로벌 스타일과 기본 디자인 토큰 추가
- [x] 사이트 공통 metadata 기본값 추가
- [x] `.env.local.example` 추가
- [x] 기본 빌드 검증 완료

## Phase 1. 공통 인프라 이관

상태: 완료

- [x] React Query provider 이관
- [x] 공통 axios 클라이언트 이관
- [x] auth/cookie/storage helper 이관
- [x] 공통 hooks/stores/types/util 구조 보강
- [x] public 자산 본격 이관
- [x] `robots.txt`, `sitemap.xml` 기본 파일 추가

비고:

- 사용자 요청에 따라 Phase 2를 먼저 진행했다.

## Phase 2. 라우트 골격 생성

상태: 완료

- [x] 레거시 URL 기준 Next 라우트 골격 생성
- [x] `shell` / `auth` route group 분리
- [x] 헤더/푸터 공통 레이아웃 추가
- [x] 동적 세그먼트 경로 생성
- [x] placeholder 페이지 추가
- [x] 공개/비공개 SEO 색인 정책 분리
- [x] 인벤토리 문서 상태 갱신

## Phase 3. Main/Auth/Profile

상태: 완료

- [x] 메인 페이지 실제 UI 이관
- [x] 로그인/회원가입/소셜 콜백 실제 로직 이관
- [x] 프로필/설정/북마크 실제 UI 및 로직 이관
- [x] 인증 상태 기반 헤더/드롭다운 이관

비고:

- `상권추천` 북마크는 레거시에서도 미구현 상태라 안내형 화면으로 우선 이관했다.

## Phase 4. Status/Recommend

상태: 완료

- [x] status 실제 UI 및 데이터 흐름 이관
- [x] recommend 실제 UI 및 저장 기능 이관
- [x] 지도/차트/필터 UI 이관

비고:

- Kakao Map SDK 기반 지도 시각화는 이번 Phase에서 직접 이식하지 않고, 자치구 surface grid와 데이터 카드 구조로 우선 대체했다.
- 차트는 레거시 D3/커스텀 그래프 대신 Next 친화적인 bar metric 패널로 우선 이관했다.

## Phase 5. Analysis/Simulation/Report

상태: 완료

- [x] 분석 입력 플로우 이관
- [x] 분석 결과 화면 이관
- [x] 시뮬레이션/리포트/비교 화면 이관
- [x] 카카오 공유 로직 이관

비고:

- `analysis/result`, `analysis/simulation/*`, `simulation/*`, `share/[token]`를 query param 기반 흐름으로 재구성해 새로고침과 직접 진입을 안정화했다.
- 공유는 `POST /share`와 Kakao SDK를 우선 사용하고, SDK 사용이 불가능한 환경에서는 링크 복사 fallback으로 처리한다.

## Phase 6. Community

상태: 완료

- [x] 목록/상세/등록 UI 이관
- [x] 댓글/이미지 업로드 이관
- [x] 공개 페이지 metadata 고도화

비고:

- `/community/list`는 카테고리 query param 기반 필터와 인기 게시글 섹션으로 재구성했다.
- `/community/[communityId]`는 동적 metadata와 댓글 CRUD, 비슷한 게시글 섹션을 포함한다.
- `/community/register`는 생성/수정 겸용 폼으로 정리하고 다중 이미지 업로드를 지원한다.

## Phase 7. Chatting/Realtime

상태: 완료

- [x] 채팅 목록/상세 UI 이관
- [x] websocket/STOMP 연결 이관
- [x] FCM/서비스 워커 이관
- [x] 실시간 상태 정리

비고:

- `/chatting/list`는 좌측 rail, 인기 채팅방, 전체 채팅방 목록, 내 채팅방 검색, 방 생성 모달까지 포함하는 구조로 이관했다.
- `/chatting/[roomId]`는 room detail 조회, 메시지 history, STOMP 실시간 수신, Enter 전송, 나가기 흐름을 포함한다.
- FCM은 `NEXT_PUBLIC_FIREBASE_VAPID_KEY`가 없거나 권한이 거부된 경우에도 채팅 자체는 동작하도록 fallback 처리한다.

## Phase 8. QA/Cutover

상태: 대기

- [ ] 회귀 테스트
- [ ] 공개 페이지 SEO 최종 점검
- [ ] 성능/번들 점검
- [ ] 배포 전환 준비
