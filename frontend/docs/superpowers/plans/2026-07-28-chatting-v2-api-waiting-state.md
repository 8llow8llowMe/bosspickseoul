# Chatting V2 API Waiting State Implementation Plan

**Goal:** V2 채팅 계약이 없는 상태에서 죽은 REST·STOMP·FCM 연결을 차단하고,
두 채팅 라우트에 일관된 대기 화면을 제공한다.

**Architecture:** 정적인 서버 컴포넌트 하나가 목록과 상세 변형을 렌더한다. 기존
middleware 보호 경로와 동적 roomId 검증은 유지하되, 라우트에서 레거시 client
chatting 컴포넌트를 더 이상 import하지 않는다.

**Tech Stack:** Next.js App Router, React 19, TypeScript,
styled-components, Vitest.

## Task 1: 실패하는 라우트 계약 테스트

- 목록과 상세 라우트 소스가 레거시 채팅 컴포넌트를 import하지 않는지 검사한다.
- 대기 컴포넌트의 필수 안내와 이동 링크를 정적 렌더링으로 검사한다.
- 기존 코드에서 테스트가 실패하는지 확인한다.

## Task 2: 대기 화면 구현

- 목록/상세 변형을 지원하는 반응형 서버 컴포넌트를 만든다.
- 선행 계약(REST, STOMP, FCM)과 후속 이동(`/community/list`, `/`)을 안내한다.
- 두 라우트의 metadata와 렌더링을 대기 상태에 맞춘다.
- 상세 route의 roomId 유효성 검증은 유지한다.

## Task 3: 검증과 전달

- `format:check`, `lint`, `typecheck`, `test`, `build`를 실행한다.
- 인증 리다이렉트와 모바일·데스크톱 레이아웃을 브라우저에서 검증한다.
- Conventional Commit으로 커밋하고 `feature/fe/chatting` Draft PR을 생성한다.
