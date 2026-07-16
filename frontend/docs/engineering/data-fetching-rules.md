# Data Fetching Rules

## 기본 원칙

- 1차 이관에서는 레거시 API 계약과 인증 흐름을 보존한다.
- backend API spec은 프론트 마이그레이션 중 임의로 바꾸지 않는다.
- React Query와 Zustand는 기존 흐름을 유지한다.
- BFF 또는 Server Action 재설계는 마이그레이션 parity 이후에 검토한다.

## API Client

- 레거시 `customAxios`에 해당하는 공통 axios client 흐름을 유지한다.
- auth header, cookie, token refresh 흐름은 기존 동작과 같게 옮긴다.
- endpoint path, request body, response shape를 임의로 바꾸지 않는다.
- response wrapper가 있으면 기존 성공/실패 판별 방식을 보존한다.

## Session과 Storage

- `localStorage`, `sessionStorage`, cookie 접근은 SSR 안전 helper를 통해 수행한다.
- token이나 user state 초기화는 hydrate 시점 차이를 고려한다.
- auth guard는 loading 상태, unauthenticated 상태, authenticated 상태를 구분한다.
- logout, withdraw, token refresh 실패 시 기존 redirect와 storage cleanup 동작을 보존한다.

## React Query

- query key는 기능별로 안정적으로 유지한다.
- loading, error, empty state를 레거시와 같은 UX로 처리한다.
- mutation 성공 후 invalidate 또는 optimistic update 규칙을 명확히 둔다.
- 재시도, stale time, enabled 조건을 임의로 바꾸지 않는다.

## 완료 확인

- 네트워크 요청 URL, method, payload가 레거시와 호환된다.
- token refresh와 인증 실패 분기가 기존과 맞다.
- SSR 중 storage 접근 오류가 없다.
- API 실패 시 사용자에게 보이는 상태가 누락되지 않는다.
