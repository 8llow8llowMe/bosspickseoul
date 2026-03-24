# Migration Playbook

## 1. 목표

- 기존 Vite 기반 React 앱을 Next.js App Router 기반 프론트엔드로 이관한다.
- 초기 목표는 `기능 동일성`과 `배포 가능한 구조 확보`다.
- 서버 컴포넌트 최적화, BFF 재설계, 대규모 UI 리뉴얼은 2차 단계로 미룬다.

## 2. 현재 레거시 기준선

- 소스 위치: `../../NowDoBoss/FrontEnd`
- 핵심 기술:
  - React + TypeScript + Vite
  - `react-router-dom`
  - `@tanstack/react-query`
  - `zustand`
  - `styled-components`
  - MUI / Joy UI
  - Kakao Map
  - Firebase Messaging
  - websocket + STOMP

## 3. 작업 단계

### Phase 0. 부트스트랩

목표: Next.js 앱이 실행되고, 공통 규칙을 담을 뼈대를 만든다.

작업:

- `pnpm` 기준으로 `frontend/`에 Next.js App Router 앱 생성
- TypeScript, ESLint, alias 설정
- `Prettier` 설치 및 설정 파일 추가
- `package.json`에 `format`, `format:check` 스크립트 추가
- `next.config.*`에 `styledComponents` 지원 설정
- `src/` 기반 디렉터리 구조 생성
- `public/` 폴더 생성
- `.env.local.example` 또는 동등 문서 준비
- metadata 기본 정책과 사이트 기본값 정리

완료 기준:

- 기본 페이지가 로컬에서 실행된다.
- `app/layout.tsx`와 글로벌 스타일 주입 경로가 정해진다.
- Pretendard 폰트 적용 방식이 결정된다.
- 사이트 공통 metadata 골격이 정해진다.
- `pnpm` 기반 스크립트와 `Prettier` 포맷 명령이 동작한다.

### Phase 1. 공통 인프라 이관

목표: 이후 페이지를 옮길 수 있는 공통 기반을 먼저 만든다.

작업:

- React Query provider 이관
- 전역 스타일, reset, viewport 보정 로직 이관
- 공통 axios 클라이언트와 인증 헤더 처리 이관
- cookie, `localStorage`, `sessionStorage` 접근을 안전한 helper로 분리
- 공통 hooks, stores, types, util 폴더 골격 생성
- `public/fonts`, `public/images`, `public/icons`, `public/gifs` 자산 이관
- `robots.txt`, `sitemap.xml`, 기본 Open Graph 전략 정리

완료 기준:

- 최소 1개 페이지에서 provider, store, asset import가 정상 동작한다.
- 브라우저 전용 접근이 서버 렌더 시점에 실행되지 않는다.
- 공통 SEO 파일 생성 위치와 책임이 정해진다.

### Phase 2. 라우트 골격 생성

목표: 기존 URL을 Next 구조로 1:1 대응시킨다.

작업:

- `app/`에 기존 URL 구조를 기준으로 page 파일 생성
- 공통 헤더/푸터 레이아웃과 예외 레이아웃(route group) 분리
- 동적 세그먼트 경로 생성
- 임시 플레이스홀더 페이지로 전체 링크 구조 확인
- 공개/비공개 라우트의 색인 정책 분리

완료 기준:

- 주요 URL이 404 없이 열린다.
- 헤더/푸터 노출 규칙이 기존과 동일하게 동작할 수 있는 구조가 된다.
- 공개 페이지와 비공개 페이지의 SEO 정책이 구분된다.

### Phase 3. Main/Auth/Profile

목표: 진입 경로와 계정 흐름을 먼저 안정화한다.

작업:

- 메인 페이지 이관
- 로그인, 회원가입, 소셜 로그인 콜백 이관
- 프로필, 설정, 북마크 이관
- 인증 상태에 따른 헤더/드롭다운 이관
- 메인과 인증 페이지 metadata 기본값 반영

완료 기준:

- 로그인/로그아웃 흐름이 정상 동작한다.
- 프로필 수정과 북마크 조회가 정상 동작한다.
- 메인 페이지 SEO 기본값이 적용된다.

### Phase 4. Status/Recommend

목표: 비교적 독립적인 조회 화면을 먼저 이관해 패턴을 고정한다.

작업:

- `status` 페이지와 상세 컴포넌트 이관
- `recommend` 페이지와 저장 기능 이관
- 지도/차트/필터 UI 이관

완료 기준:

- 필터 상태와 API 호출 흐름이 레거시와 동일하다.
- 모바일과 데스크톱 레이아웃이 모두 깨지지 않는다.

### Phase 5. Analysis/Simulation/Report

목표: 핵심 비즈니스 기능을 이관한다.

작업:

- 분석 입력 플로우 이관
- 결과 화면과 탭 섹션 이관
- 시뮬레이션 입력, 보고서, 비교 화면 이관
- 카카오 공유 흐름 이관

완료 기준:

- 분석 결과와 시뮬레이션 결과가 정상 렌더링된다.
- 보고서 저장, 공유, 비교 흐름이 동작한다.

### Phase 6. Community

목표: 게시글 CRUD와 댓글 흐름을 이관한다.

작업:

- 목록, 상세, 등록 이관
- 이미지 업로드와 댓글 처리 이관
- 로그인 상태 분기 이관
- 커뮤니티 공개 페이지 metadata와 canonical 반영

완료 기준:

- 목록 조회, 상세 조회, 등록, 삭제, 댓글 작성이 동작한다.
- 공개 가능한 커뮤니티 페이지의 SEO 기본값이 적용된다.

### Phase 7. Chatting/Realtime

목표: 가장 복잡한 실시간 기능을 마지막에 안정적으로 이관한다.

작업:

- 채팅 목록, 상세, 방 입장 이관
- websocket/STOMP 클라이언트 래퍼 정리
- FCM 토큰 저장, 토픽 구독, 푸시 흐름 정리
- 서비스 워커 등록 처리 이관

완료 기준:

- 채팅방 입장, 메시지 수신, 구독, 퇴장이 모두 동작한다.
- 브라우저와 모바일 조건 분기가 깨지지 않는다.

### Phase 8. QA/Cutover

목표: 실제 교체 가능한 상태로 마무리한다.

작업:

- 회귀 테스트
- 환경변수와 배포 설정 문서화
- 성능과 번들 점검
- dead code 정리
- metadata, robots, sitemap, OG, canonical 최종 점검
- `Prettier` 포맷 점검

완료 기준:

- 주요 사용자 여정이 smoke test를 통과한다.
- 운영 전환에 필요한 문서와 환경변수가 정리된다.
- 공개 페이지 SEO 점검이 완료된다.
- 포맷 기준이 저장소 전반에 일관되게 적용된다.

## 4. 마이그레이션 레시피

### 4.1 react-router -> Next

- `useNavigate` -> `useRouter`
- `useLocation` -> `usePathname`, `useSearchParams`
- `useParams` -> Next `useParams`
- 중첩 라우트 -> 폴더 구조 + `layout.tsx`
- 공통 헤더/푸터 조건 분기 -> route group

### 4.2 Vite env -> Next env

- `import.meta.env.VITE_REACT_API_URL` -> `process.env.NEXT_PUBLIC_API_URL`
- `import.meta.env.VITE_REACT_APP_KAKAOMAP_API_KEY` -> `process.env.NEXT_PUBLIC_KAKAOMAP_API_KEY`
- `import.meta.env.VITE_REACT_FIREBASE_*` -> `process.env.NEXT_PUBLIC_FIREBASE_*`

### 4.3 브라우저 전용 코드 처리

- 파일 상단에서 바로 `window.innerWidth`를 읽지 않는다.
- `localStorage.getItem(...)`를 컴포넌트 바디 최상단에서 바로 호출하지 않는다.
- `document.cookie` 접근은 helper 함수 안으로 넣고 호출 시점을 제어한다.
- 서비스 워커 등록은 반드시 클라이언트 effect 안에서 처리한다.

### 4.4 styled-components 처리

- 초기 마이그레이션에서는 기존 스타일 파일을 최대한 유지한다.
- 대신 디자인 토큰은 새 구조에서 한 군데로 모은다.
- 새 파일부터는 토큰을 사용하고, 레거시 하드코드는 이관 뒤 점진적으로 걷어낸다.

### 4.5 SEO 처리

- 공개 페이지는 이관 시점에 `metadata`를 같이 작성한다.
- 비공개 페이지는 `noindex` 정책을 명시한다.
- title/description/canonical/OG 규칙은 `docs/seo-guide.md`를 따른다.
- 구조화 데이터와 성능 고도화는 2차 단계에서 보강하되, 기본 골격은 초기에 넣는다.

### 4.6 패키지 매니저 및 포맷터

- 패키지 매니저는 `pnpm`을 기본으로 사용한다.
- 새 프론트엔드 lockfile은 `pnpm-lock.yaml`을 기준으로 관리한다.
- 스크립트 실행 예시는 `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm format`, `pnpm format:check`로 통일한다.
- 포맷터는 `Prettier`를 사용한다.
- 초기 설정 단계에서 `.prettierrc` 또는 동등 설정 파일을 추가한다.
- ESLint와 Prettier의 역할을 섞지 않는다.
  - ESLint: 코드 품질, 잠재 버그, 규칙 위반
  - Prettier: 코드 포맷 일관성

## 5. 세션 단위 작업 규칙

- 한 세션에서 하나의 Phase 또는 그 하위 기능 묶음만 진행한다.
- 작업 전 관련 문서를 읽고, 작업 후 체크리스트를 반영한다.
- 공통 구조를 바꾸는 경우 해당 문서를 같이 업데이트한다.
