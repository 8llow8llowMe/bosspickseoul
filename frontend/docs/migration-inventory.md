# Migration Inventory

## 1. 레거시 프론트 요약

- 소스 위치: `../../NowDoBoss/FrontEnd`
- 페이지 수: `31`
- 컴포넌트 수: `153`
- 컨테이너 수: `66`
- 주요 API 모듈:
  - `analysisApi.tsx`
  - `chattingApi.tsx`
  - `communityApi.tsx`
  - `fcmApi.tsx`
  - `kakaoShareApi.tsx`
  - `mapApi.tsx`
  - `profileApi.tsx`
  - `recommendApi.tsx`
  - `simulationApi.tsx`
  - `statusApi.tsx`
  - `userApi.tsx`

## 2. 핵심 리스크

### SSR/클라이언트 경계 리스크

- `window`, `document`, `navigator` 직접 접근
- `localStorage`, `sessionStorage`, `document.cookie` 직접 접근
- `window.innerWidth`를 초기 state에서 바로 읽는 패턴
- DOM 이벤트를 직접 구독하는 스크롤/리사이즈 로직 다수 존재

### 외부 SDK 리스크

- Kakao Map SDK
- Firebase Messaging
- 서비스 워커 등록
- websocket / STOMP

### 구조 리스크

- 라우팅이 `App.tsx` 한 곳에 집중됨
- 레이아웃 조건이 라우터 위치 기반으로 제어됨
- 스타일 값 하드코딩이 많아 토큰화가 필요함

## 3. 레거시 라우트 매핑

| Legacy Route | Next Route | 우선순위 | 난이도 | 상태 |
| --- | --- | --- | --- | --- |
| `/` | `app/(main)/page.tsx` | 높음 | 중간 | 미착수 |
| `/register` | `app/(auth)/register/page.tsx` | 높음 | 낮음 | 미착수 |
| `/register/general` | `app/(auth)/register/general/page.tsx` | 높음 | 중간 | 미착수 |
| `/login` | `app/(auth)/login/page.tsx` | 높음 | 중간 | 미착수 |
| `/member/loading/:provider` | `app/(auth)/member/loading/[provider]/page.tsx` | 높음 | 중간 | 미착수 |
| `/profile/bookmarks` | `app/profile/bookmarks/page.tsx` | 높음 | 중간 | 미착수 |
| `/profile/bookmarks/analysis` | `app/profile/bookmarks/analysis/page.tsx` | 중간 | 중간 | 미착수 |
| `/profile/bookmarks/recommend` | `app/profile/bookmarks/recommend/page.tsx` | 중간 | 중간 | 미착수 |
| `/profile/bookmarks/simulation` | `app/profile/bookmarks/simulation/page.tsx` | 중간 | 중간 | 미착수 |
| `/profile/settings/edit` | `app/profile/settings/edit/page.tsx` | 높음 | 중간 | 미착수 |
| `/profile/settings/change-password` | `app/profile/settings/change-password/page.tsx` | 높음 | 중간 | 미착수 |
| `/profile/settings/withdraw` | `app/profile/settings/withdraw/page.tsx` | 높음 | 중간 | 미착수 |
| `/account-deleted` | `app/(auth)/account-deleted/page.tsx` | 중간 | 낮음 | 미착수 |
| `/status` | `app/status/page.tsx` | 중간 | 중간 | 미착수 |
| `/analysis` | `app/analysis/page.tsx` | 높음 | 중간 | 미착수 |
| `/analysis/result` | `app/analysis/result/page.tsx` | 높음 | 높음 | 미착수 |
| `/analysis/simulation` | `app/analysis/simulation/page.tsx` | 중간 | 높음 | 미착수 |
| `/analysis/simulation/report` | `app/analysis/simulation/report/page.tsx` | 중간 | 높음 | 미착수 |
| `/analysis/simulation/compare` | `app/analysis/simulation/compare/page.tsx` | 중간 | 높음 | 미착수 |
| `/recommend` | `app/recommend/page.tsx` | 중간 | 중간 | 미착수 |
| `/simulation` | `app/simulation/page.tsx` | 중간 | 높음 | 미착수 |
| `/simulation/report` | `app/simulation/report/page.tsx` | 중간 | 높음 | 미착수 |
| `/simulation/compare` | `app/simulation/compare/page.tsx` | 중간 | 높음 | 미착수 |
| `/community/list` | `app/community/list/page.tsx` | 중간 | 중간 | 미착수 |
| `/community/register` | `app/community/register/page.tsx` | 중간 | 중간 | 미착수 |
| `/community/:communityId` | `app/community/[communityId]/page.tsx` | 중간 | 높음 | 미착수 |
| `/chatting/list` | `app/chatting/list/page.tsx` | 낮음 | 높음 | 미착수 |
| `/chatting/:roomId` | `app/chatting/[roomId]/page.tsx` | 낮음 | 매우 높음 | 미착수 |
| `/share/:token` | `app/share/[token]/page.tsx` | 중간 | 중간 | 미착수 |

## 4. 선행 공통 모듈

다음 항목은 화면 이관 전에 먼저 준비한다.

- `src/providers/query-provider.tsx`
- `src/providers/app-providers.tsx`
- `src/lib/api/client.ts`
- `src/lib/auth/cookies.ts`
- `src/lib/auth/storage.ts`
- `src/lib/env.ts`
- `src/styles/tokens.css` 또는 동등 파일
- `src/styles/global-styles.ts`
- `src/components/layout/header`
- `src/components/layout/footer`

## 5. 브라우저 전용 패턴 정리 대상

우선 정리 대상 패턴은 아래와 같다.

- `useState(window.innerWidth ...)`
- 컴포넌트 바디 최상단 `localStorage.getItem(...)`
- 컴포넌트 바디 최상단 `navigator.userAgent`
- store 초기화 시 `document.cookie` 접근
- module scope의 websocket/Firebase 초기화

## 6. 환경변수 매핑

| Legacy | Target |
| --- | --- |
| `VITE_REACT_API_URL` | `NEXT_PUBLIC_API_URL` |
| `VITE_REACT_APP_KAKAOMAP_API_KEY` | `NEXT_PUBLIC_KAKAOMAP_API_KEY` |
| `VITE_REACT_FIREBASE_API_KEY` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `VITE_REACT_FIREBASE_MESSAGING_SENDER_ID` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `VITE_REACT_FIREBASE_APP_ID` | `NEXT_PUBLIC_FIREBASE_APP_ID` |
| `VITE_REACT_FIREBASE_MEASUREMENT_ID` | `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` |

## 7. 상태 업데이트 규칙

- 기능을 이관하면 해당 라우트의 상태를 `미착수 -> 진행중 -> 완료`로 갱신한다.
- 공통 인프라가 추가되면 `선행 공통 모듈` 목록도 실제 경로 기준으로 갱신한다.
