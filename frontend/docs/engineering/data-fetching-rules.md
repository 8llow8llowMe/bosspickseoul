# Data Fetching Rules

## 기본 원칙

- **데이터 페칭 표준은 BFF(server-to-server)다.** 브라우저는 백엔드를 직접 호출하지 않고, same-origin Next 서버(BFF)를 경유한다. (개정 2026-07-21: 기존 "BFF는 parity 이후" 규칙 대체 — 근거·설계: [auth/session-bff](../features/auth/session-bff.md))
- 백엔드 API 계약(엔드포인트·요청·응답)은 FE에서 임의로 바꾸지 않는다. 계약 정본은 실행 중 Swagger/OpenAPI.
- React Query와 Zustand는 유지한다. 단 데이터 호출의 baseURL은 `/api/bff`(BFF 프록시)를 향한다.

## API Client (BFF)

- 모든 브라우저→백엔드 호출은 catch-all 프록시 `app/api/bff/[...path]/route.ts`를 경유한다. `src/lib/api/client.ts`의 baseURL은 `/api/bff`.
- 토큰(access/refresh)은 **Next 서버만** 보관·주입한다. 클라이언트 코드·React Query는 토큰을 다루지 않는다.
- access 만료(401) 시 BFF가 `/auth/token/reissue`로 재발급 후 원요청을 1회 재시도한다. 재발급 실패 시 세션 제거 + 401.
- 백엔드 공통 응답 래퍼 `Response<T>`의 성공/실패 판별을 보존한다.
- endpoint path·request body·response shape는 백엔드 계약과 일치시킨다.

## Session과 Storage

- **토큰은 `localStorage`/`sessionStorage`에 저장하지 않는다.** accessToken·refreshToken은 Next 서버가 **jose로 암호화한 HttpOnly·Secure·SameSite=Lax 세션 쿠키**에만 보관한다.
- 클라이언트의 인증 상태(`auth-store`)는 서버 세션에서 파생된 얕은 상태(memberId, isAuthenticated, me)만 가진다.
- 세션 복원은 `GET /members/me`(BFF 경유)로 수행한다. hydrate 시점 차이를 고려한다.
- auth guard(미들웨어)는 loading / unauthenticated / authenticated 상태를 구분하고, 미인증 시 `/login`으로 리다이렉트한다.
- logout·token refresh 실패 시 세션 쿠키를 제거하고 미인증 상태로 전환한다.
- 비-토큰 브라우저 저장소 접근은 SSR 안전 helper를 통해 수행한다.

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
