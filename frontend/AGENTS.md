# NowDoBoss Frontend Agent Guide

## 1. 목적

이 디렉터리는 기존 React/Vite 프론트엔드를 Next.js App Router 앱으로 옮기는 마이그레이션 작업 영역이다.

- 레거시 소스: `../../NowDoBoss/FrontEnd`
- 대상 위치: `NowDoBoss-V2/frontend`

우선순위는 다음 순서를 따른다.

1. 기존 동작 보존
2. 라우팅, 상태, 데이터 흐름 안정화
3. 디자인 통일
4. 동작 안정화 이후 구조 정리와 최적화

마이그레이션은 redesign, refactor, product expansion이 아니다. 1차 목표는 동작 동일성이다.

## 2. 문서 읽기 정책

항상 먼저 읽을 문서:

1. `docs/README.md`
2. `docs/migration-playbook.md`
3. `docs/migration-inventory.md`

작업 유형별 추가 문서:

- UI/디자인 작업: `docs/design-guide.md`, `docs/engineering/styling-rules.md`
- SEO/공개 페이지 작업: `docs/seo-guide.md`
- QA/완료 점검: `docs/done-checklist.md`, `docs/qa-runbook.md`
- 배포/전환 작업: `docs/cutover-runbook.md`, `docs/seo-performance-audit.md`
- 라우팅 작업: `docs/engineering/routing-rules.md`
- 브라우저 API/SSR 경계 작업: `docs/engineering/client-boundary.md`
- API/세션/데이터 작업: `docs/engineering/data-fetching-rules.md`
- 코드 스타일/의존성 작업: `docs/engineering/code-style.md`
- 역할별 작업: `docs/agents/*.md`

작은 작업마다 모든 문서를 읽지 않는다. 요청된 작업에 필요한 문서만 추가로 확인한다.

## 3. 기술 기준선

- Framework: Next.js App Router + TypeScript
- Package manager: `pnpm`
- State: 1차 이관에서는 기존 Zustand 유지
- Data fetching: 1차 이관에서는 기존 React Query 유지
- Styling: 기존 `styled-components` 유지, MUI/Joy는 이관 중 공존 가능
- Formatting: Prettier
- Font: Pretendard, 가능하면 `next/font/local`
- Env vars: 클라이언트 노출이 필요한 값은 `NEXT_PUBLIC_*`
- Path alias: 프로젝트에서 확정한 단일 alias 규칙 사용

## 4. 마이그레이션 순서

`docs/migration-playbook.md`의 Phase 순서를 따른다. 공통 인프라와 route skeleton을 먼저 안정화하고, main/auth/profile, status/recommend, analysis/simulation, community, chatting, QA/cutover 순서로 진행한다.

채팅은 인증, 세션, FCM, websocket 안정성이 필요하므로 마지막 단계로 둔다.

## 5. 작업 단위

각 작업은 작고 PR-sized여야 한다.

기능 이관은 아래 순서로 진행한다.

1. route skeleton
2. static UI
3. state/form logic
4. API integration
5. loading/error/empty states
6. responsive adjustment
7. done checklist verification

라우팅 교체, 상태관리 교체, 디자인 리뉴얼을 한 작업에 섞지 않는다.

## 6. 구현 기준

- `react-router-dom`은 새로 이관한 route에서 사용하지 않는다.
- 페이지 진입점은 `app/**/page.tsx`로 둔다.
- 공통 UI는 필요한 경우 `layout.tsx`로 올린다.
- `useNavigate`는 `useRouter`, `useLocation`은 `usePathname` 또는 `useSearchParams`, `useParams`는 Next params로 대체한다.
- 브라우저 API, Zustand, React Query hook, chart, Kakao Map, Firebase Messaging, WebSocket, realtime chat을 쓰면 client component로 시작한다.
- Kakao Map, Firebase Messaging, chart, websocket-heavy 화면은 필요하면 client-only wrapper 또는 `dynamic(..., { ssr: false })`를 사용한다.
- 레거시 `customAxios`, cookie, `localStorage`, `sessionStorage`, token refresh 흐름은 1차 이관에서 보존한다.
- 프론트 이관 중 backend API 계약을 바꾸지 않는다.

## 7. 스타일과 SEO

- 스타일 기준은 `docs/design-guide.md`와 `docs/engineering/styling-rules.md`를 따른다.
- 임의 색상, radius, shadow, spacing을 추가하지 않는다.
- 버튼, 카드, 입력, 탭, badge, modal, layout은 공통 컴포넌트를 우선한다.
- 공개 페이지는 이관 시점에 metadata, canonical, Open Graph를 함께 점검한다.
- 비공개 페이지는 noindex 정책을 명확히 둔다.

## 8. 검증 명령

가능한 경우 완료 보고 전 관련 명령을 실행한다.

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

명령이 없거나 실패하면 그대로 보고한다. 실행하지 않은 명령을 통과했다고 말하지 않는다.

## 9. 완료 규칙

route 또는 feature 이관 후 다음을 처리한다.

- `docs/migration-inventory.md` 갱신
- `docs/done-checklist.md` 확인
- 변경 파일 보고
- 실행한 명령 보고
- 알려진 제한 사항 보고
- 남은 후속 작업 보고

inventory에는 route path, legacy source file, target file, migration status, known gaps, validation result, remaining tasks를 남긴다.

## 10. 금지 사항

- 1차 이관 중 동작을 임의로 바꾸지 않는다.
- 인증/세션 의존 화면을 final implementation처럼 mock으로 고정하지 않는다.
- auth/session/FCM 기반이 안정되기 전에 websocket 화면부터 확장하지 않는다.
- 근거 없이 새 의존성을 추가하지 않는다.
- backend API spec을 바꾸지 않는다.
- 광범위한 무관 리팩터링을 하지 않는다.
- 기존 서비스 방향과 무관한 새 브랜딩을 적용하지 않는다.
