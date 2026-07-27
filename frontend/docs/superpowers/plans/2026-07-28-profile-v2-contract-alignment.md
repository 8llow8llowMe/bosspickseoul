# Profile V2 Contract Alignment Implementation Plan

**Goal:** 프로필 화면의 죽은 V1 호출을 제거하고 실제 V2 회원·북마크 계약만
사용하는 예측 가능한 화면을 제공한다.

**Architecture:** 기존 인증 프로필 셸과 V2 `members/me` 조회는 유지한다. 회원
북마크 수집 로직을 대상 타입과 무관한 공통 로직으로 확장하고, 프로필의 지역/상권
탭이 이를 필터링해 표현한다. 서버 계약이 없는 계정 쓰기 기능과 시뮬레이션 저장
목록은 공통 대기 UI를 렌더한다.

**Tech Stack:** Next.js App Router, React 19, TypeScript, TanStack Query,
styled-components, Vitest.

## Task 1: 북마크 수집 계약 테스트

- `recommend-bookmarks`에 전체 대상 타입을 수집하는 테스트를 먼저 추가한다.
- 여러 커서 페이지, 중복 ID, 비정상 응답, 대상 타입 필터를 검증한다.
- 실패를 확인한 뒤 공통 수집 함수를 구현한다.

## Task 2: 프로필 북마크 화면 계약 테스트

- 지역/상권 분리와 대기 화면 문구를 순수 함수·소스 계약 테스트로 추가한다.
- 지역 북마크 화면을 V2 회원 북마크 훅으로 전환한다.
- 시뮬레이션 저장 화면은 네트워크 요청 없는 대기 상태로 전환한다.
- 북마크 탭 명칭과 설명을 V2 데이터 의미에 맞춘다.

## Task 3: 계정 설정 안전 상태

- 설정 화면이 레거시 쓰기 API를 import하지 않는 테스트를 먼저 추가한다.
- 회원 정보 화면은 현재 세션의 회원 정보를 읽기 전용으로 표시한다.
- 비밀번호 변경과 탈퇴 화면은 V2 계약 대기 상태로 전환한다.
- 설정 탭과 설명에서 실행 가능성을 과장하는 표현을 제거한다.

## Task 4: 검증과 전달

- `format:check`, `lint`, `typecheck`, `test`, `build`를 실행한다.
- 인증 리다이렉트와 프로필 레이아웃을 데스크톱·모바일 브라우저에서 검증한다.
- Conventional Commit으로 커밋하고 `feature/fe/profile` Draft PR을 생성한다.
