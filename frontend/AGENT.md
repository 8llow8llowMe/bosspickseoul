# NowDoBoss Frontend Migration Agent Guide

## 1. 목적

- 이 문서는 `frontend/` 영역의 마이그레이션 작업 기준 문서다.
- 목표는 기존 React/Vite 프론트엔드(`../../NowDoBoss/FrontEnd`)를 `NowDoBoss-V2/frontend` 안의 Next.js App Router 구조로 단계적으로 이관하는 것이다.
- 우선순위는 다음 순서를 따른다.
  - `동작 동일성`
  - `라우팅/상태/데이터 흐름 안정화`
  - `디자인 통일성`
  - `구조 정리와 최적화`

## 2. 읽는 순서

작업 시작 전 아래 문서를 순서대로 확인한다.

1. `docs/README.md`
2. `docs/migration-playbook.md`
3. `docs/migration-inventory.md`
4. `docs/design-guide.md`
5. `docs/seo-guide.md`
6. `docs/done-checklist.md`

## 3. 필수 작업 원칙

- 한 번에 전체를 옮기지 않는다. 반드시 기능 단위로 자른다.
- 새 기능 개발보다 기존 기능 재현을 우선한다.
- 라우팅 교체, 상태관리 교체, 디자인 리뉴얼을 같은 작업 묶음에서 동시에 하지 않는다.
- 첫 이관에서는 서버 컴포넌트 최적화보다 안정적인 클라이언트 동작을 우선한다.
- 브라우저 전용 코드(`window`, `document`, `localStorage`, `sessionStorage`, `navigator`, `Notification`, `serviceWorker`, `WebSocket`)는 명시적으로 분리한다.
- Kakao Map, Firebase Messaging, 차트, 실시간 채팅은 필요 시 `dynamic(..., { ssr: false })` 또는 클라이언트 전용 래퍼로 감싼다.
- API 계약은 백엔드와 호환되도록 유지한다. 프론트 이관 과정에서 임의로 API 스펙을 바꾸지 않는다.
- 패키지 매니저는 `pnpm`을 기본으로 사용한다.
- 코드 포맷은 `Prettier`를 기본으로 사용하고, 초기 부트스트랩 단계에서 반드시 설정한다.
- 새 화면을 만들 때는 `docs/design-guide.md`의 토큰과 컴포넌트 규칙을 따른다.
- 공개 페이지는 `docs/seo-guide.md` 기준으로 metadata, canonical, Open Graph를 함께 설계한다.

## 4. 마이그레이션 우선순위

반드시 아래 순서로 진행한다.

1. Next.js 앱 부트스트랩과 공통 인프라
2. 전역 스타일, 폰트, provider, public 자산 이관
3. 라우트 골격 생성과 layout 분리
4. 메인, 로그인, 회원가입, 소셜 로그인
5. 프로필, 설정, 북마크
6. status, recommend
7. analysis, simulation, report, share
8. community
9. chatting, websocket, FCM
10. QA, 성능 점검, 배포 전환 준비

채팅은 마지막에 이관한다. 인증, 세션, FCM, websocket이 동시에 걸려 있어 선행 기능 안정화가 필요하다.

## 5. 기술 기준선

- 프레임워크: Next.js App Router + TypeScript
- 패키지 매니저: `pnpm`
- 상태관리: 기존 Zustand 유지
- 데이터 패칭: 기존 React Query 유지
- 스타일링: 기존 `styled-components` 유지, MUI/Joy 공존 허용
- 코드 포맷: `Prettier`
- 폰트: Pretendard 유지, `next/font/local` 사용 우선
- 환경변수: `VITE_*` 제거 후 `NEXT_PUBLIC_*` 체계로 통일
- 경로 alias: `@/*` 또는 기존 `@src/*`와 동등한 단일 규칙으로 고정

## 6. 권장 디렉터리 구조

```text
frontend/
  AGENT.md
  docs/
  app/
    (main)/
    (auth)/
    profile/
    status/
    analysis/
    recommend/
    simulation/
    community/
    chatting/
    share/
  src/
    components/
    containers/
    hooks/
    lib/
    providers/
    stores/
    styles/
    types/
    utils/
  public/
```

## 7. 구현 규칙

### 7.1 라우팅

- `react-router-dom` 사용을 중단하고 App Router 파일 구조로 전환한다.
- 페이지 단위 진입점은 `app/**/page.tsx`로 만든다.
- 공통 UI는 layout으로 올리고, 경로 예외는 route group으로 분리한다.
- `useNavigate`는 `useRouter`, `useLocation`은 `usePathname` 또는 `useSearchParams`, `useParams`는 Next 내장 hook으로 전환한다.

### 7.2 클라이언트 경계

- 아래 조건 중 하나라도 해당하면 해당 파일은 기본적으로 클라이언트 컴포넌트로 시작한다.
  - 브라우저 API 접근
  - Zustand 사용
  - React Query hook 사용
  - DOM 이벤트 직접 제어
  - 차트/지도/웹소켓 사용
- 이후 안정화가 끝난 뒤 서버 컴포넌트 분리 여부를 검토한다.

### 7.3 데이터/세션

- 현재 레거시의 `customAxios`, cookie, `localStorage`, `sessionStorage` 흐름은 1차 이관에서 보존한다.
- 단, SSR 시점 접근 오류가 없도록 모든 스토리지 접근은 함수 또는 effect 안으로 밀어 넣는다.
- 토큰 재발급 로직은 먼저 동일하게 옮기고, 이후 필요 시 BFF 구조로 재설계한다.

### 7.4 스타일

- 임의 색상 추가 금지
- 임의 border-radius 추가 금지
- 임의 shadow 추가 금지
- 디자인 토큰 없이 숫자 하드코딩 금지
- 공통 버튼, 카드, 입력, 탭은 재사용 컴포넌트로 정리한다.

### 7.5 SEO

- SEO는 전 기능 이관 후 일괄 처리하지 않는다.
- 공개 페이지는 이관 시점에 기본 metadata를 같이 넣는다.
- 비공개 페이지는 색인 제외 정책을 명확히 둔다.
- title, description, canonical, Open Graph는 `docs/seo-guide.md` 기준으로 통일한다.

### 7.6 Tooling

- 의존성 설치와 스크립트 실행은 `pnpm` 기준으로 작성한다.
- lockfile은 `pnpm-lock.yaml`을 기준으로 관리한다.
- `Prettier` 설정 파일과 format 스크립트는 초기 단계에서 추가한다.
- 새 파일 작성 후에는 포맷 기준이 흔들리지 않도록 `Prettier` 기준을 우선 적용한다.

## 8. 작업 단위 규칙

각 작업은 반드시 아래 단위로 자른다.

1. 라우트 골격 생성
2. 정적 UI 이관
3. 상태/폼 로직 이관
4. API 연결
5. 예외 처리
6. 반응형 보정
7. 완료 체크리스트 검증

한 작업에서 둘 이상의 대기능을 동시에 완료하려고 하지 않는다.

## 9. 완료 처리 규칙

- 한 기능을 마치면 `docs/done-checklist.md` 기준으로 자체 점검한다.
- 경로가 이관되면 `docs/migration-inventory.md`의 상태를 함께 갱신한다.
- 디자인 규칙 예외가 발생하면 `docs/design-guide.md`에 예외 사유를 남기고 일회성 스타일 남발을 피한다.
- SEO 규칙 예외가 발생하면 `docs/seo-guide.md` 기준을 먼저 갱신하고 구현한다.

## 10. 금지 사항

- 레거시와 동작이 다른 구조 개선을 선반영하지 않는다.
- 인증/세션이 얽힌 페이지를 임시 mock 데이터로 고정하지 않는다.
- 화면 단위로 스타일링 방식을 섞지 않는다.
- 기존 톤과 무관한 새 브랜드 해석을 추가하지 않는다.
- 채팅 기능 이전 전에 FCM 및 공통 인증 처리가 끝나지 않은 상태로 websocket 화면부터 만들지 않는다.

## 11. 빠른 판단 기준

- 빨리 옮겨야 하면: 클라이언트 컴포넌트 우선
- 오래 유지해야 하면: 공통 토큰과 재사용 컴포넌트 먼저
- SSR 이슈가 보이면: 브라우저 의존 코드 분리
- 디자인이 흔들리면: 새 스타일 추가보다 `docs/design-guide.md` 기준에 맞춰 기존 컴포넌트 정리
