[//]: # '저장 경로: docs/features/auth/session-bff.md'

# 인증(auth) — BFF 세션/토큰 커스터디 세부 명세서

> **작성일**: 2026-07-21
> **공통 명세**: [인증 공통 명세](./auth.md)
> **대상**: 웹 (Next.js App Router)
> **작성자**: FE
> **상태**: 초안

이 문서는 [인증 공통 명세](./auth.md)의 **BFF 세션/토큰 커스터디** 메커니즘을 구현 수준으로 상세화한다. 로그인/로그아웃/재발급/가드/세션복원의 **서버측 동작**을 정의하며, 로그인·회원가입 화면은 각각 [login](./login.md)·[register](./register.md)에 위임한다. 이 메커니즘은 모든 인증 필요 Feature의 전제다.

[[_TOC_]]

---

## D0. 배경 / 기획 의도

| 항목              | 내용                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| 충족 요구사항     | 공통 명세 S2-1~S2-8 전부                                                                                 |
| 해결하려는 문제   | 클라이언트 토큰 보관의 XSS 노출 위험 제거, 토큰 갱신 로직의 클라이언트 분산 제거                         |
| 목표 동작 (to-be) | 토큰을 Next 서버가 암호화 쿠키로 단독 보관, S2S로 게이트웨이 호출, 재발급·재시도·가드를 서버가 투명 처리 |
| 구현 제외 범위    | 소셜 로그인·2단계 가입(D8 미결), WebSocket 인증(chatting Feature)                                        |
| 연관 세부 기능    | [login](./login.md), [register](./register.md)                                                           |

---

## D1. 기능 개요

Next 서버가 인증 세션의 단일 소유자다. 로그인 시 백엔드 토큰을 암호화 세션 쿠키로 봉인하고, 이후 모든 백엔드 호출을 BFF 프록시가 대행하며 토큰 주입·재발급·재시도를 담당한다.

```
로그인 → 세션 봉인(암호화 쿠키) → BFF 프록시(Bearer 주입) → 401 시 재발급→재시도 → 세션 복원(/me)
```

### D1-1. UI 진입점 / 기능 연결

이 기능은 **UI 화면이 없는 서버측 인프라**다. 진입점은 라우트 핸들러·미들웨어이며, 화면 트리거는 [login](./login.md)/[register](./register.md) 및 각 Feature의 데이터 호출이다.

| UI 요소     | 사용자 동작      | 트리거 기능        | 결과 / 상태                  |
| ----------- | ---------------- | ------------------ | ---------------------------- |
| (화면 없음) | 보호 라우트 진입 | D4-4 미들웨어 가드 | 미인증 → `/login` 리다이렉트 |
| (화면 없음) | 앱 로드/새로고침 | D4-5 세션 복원     | 인증 상태·회원정보 hydrate   |

---

## D2. 동작 요구사항

| #   | 요구사항                                                 | 상세 참조  |
| --- | -------------------------------------------------------- | ---------- |
| 1   | 토큰은 암호화 HttpOnly·Secure·SameSite=Lax 쿠키에만 존재 | D4-1       |
| 2   | 브라우저의 모든 백엔드 호출은 `/api/bff/*`를 경유        | D3-1, D4-3 |
| 3   | access 만료(401) 시 서버가 1회 재발급 후 원요청 재시도   | D4-3, D5   |
| 4   | 재발급 실패 시 세션 제거 + 401 반환                      | D4-3, D5   |
| 5   | 보호 라우트 미인증 접근 시 `/login` 리다이렉트           | D4-4       |

---

## D3. 아키텍처 / 시스템 설계

### D3-1. 시스템 구성

| 모듈 / 컴포넌트                  | 책임                                                                                | 비고                          |
| -------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------- |
| `src/lib/auth/session.ts`        | 세션 payload 암·복호화(jose JWE), 세션 쿠키 read/write/clear                        | **유일한 토큰 접점**          |
| `app/api/auth/login/route.ts`    | 로그인 대행: 백엔드 호출 → 토큰 캡처 → 세션 봉인                                    | [login](./login.md) D4가 호출 |
| `app/api/auth/logout/route.ts`   | 로그아웃 대행: 백엔드 logout(Bearer) → 세션 제거                                    |                               |
| `app/api/bff/[...path]/route.ts` | catch-all 프록시: 세션 복호화 → Bearer 주입 → 게이트웨이 포워드 → 401 재발급·재시도 | 데이터 호출 정본 경로         |
| `middleware.ts`                  | 보호 라우트 가드(세션 쿠키 존재 검사)                                               | Edge 런타임                   |
| `src/lib/api/client.ts`          | baseURL = `/api/bff`; 토큰 로직 없음                                                | React Query 유지              |
| `src/stores/auth-store.ts`       | 서버 세션에서 파생된 얕은 상태(memberId, isAuthenticated, me)                       | 토큰 미보관                   |

:::mermaid
flowchart LR
B[Browser] -->|same-origin, 세션쿠키| N[Next BFF]
N -->|Bearer 주입 S2S| G[API Gateway]
G --> A[auth-service]
N -. 암호화 세션쿠키 .- S[(HttpOnly Cookie)]
:::

### D3-2. 데이터 흐름

:::mermaid
flowchart LR
L([login form]) --> LR[/api/auth/login/] --> BE[auth-service /auth/login]
BE -->|accessToken(body)+refreshToken(Set-Cookie)| LR
LR -->|jose 암호화 봉인| CK[(세션쿠키)]
RQ([React Query]) --> PX[/api/bff/*/] --> G[Gateway] --> SVC[백엔드]
:::

### D3-3. 데이터 모델

| 모델           | 필드                                                                | 타입   | 설명                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SessionPayload | `accessToken`                                                       | string | 백엔드 발급 JWT (암호화되어 쿠키에 보관)                                                                                                                                                                                     |
| SessionPayload | `refreshToken`                                                      | string | 백엔드 발급 refresh (암호화되어 쿠키에 보관)                                                                                                                                                                                 |
| SessionPayload | `memberId`                                                          | string | 로그인 응답의 memberId                                                                                                                                                                                                       |
| MeInfo         | `memberId, email, name, nickname, profileImageUrl` (string), `role` | 객체   | `GET /members/me` 응답. **`role`은 중첩 객체** `{ code, name, description }` (백엔드 `CodeNameDescriptionMetadata`, 코드 확인 2026-07-21). ⚠️ 백엔드 계약이 초기 명세 이후 드리프트됨 — flat `roleCode/roleDescription` 아님 |

### D3-4. 사용 라이브러리 / 기술 (역할 기준)

| 역할        | 요구 사항                              | 구현                                            |
| ----------- | -------------------------------------- | ----------------------------------------------- |
| 세션 암호화 | JWE로 토큰 봉인, Edge/Node 런타임 호환 | **jose 직접 사용** (신규 의존성)                |
| 세션 시크릿 | 서버 전용 대칭키                       | `AUTH_SESSION_SECRET` env (`NEXT_PUBLIC_` 아님) |
| HTTP        | S2S fetch                              | Next `fetch` (route handler)                    |

세션 쿠키 속성: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. `docs/engineering/client-boundary.md`·`docs/engineering/data-fetching-rules.md` 준수.

---

## D4. 상세 동작 정의

> **API 문서**: auth-service 컨트롤러 기준. Swagger/OpenAPI 정본 URL은 **D8 미결**(응답 래퍼·에러코드 확정 대상).

### D4-1. 로그인 세션 봉인

| 사용 엔드포인트           | 용도                | 응답 → 내부 모델 매핑                                                                    | 비고                                                                             |
| ------------------------- | ------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `POST /api/v1/auth/login` | 자격 검증·토큰 발급 | body `{accessToken, memberId}` + `Set-Cookie: refreshToken`(HttpOnly) → `SessionPayload` | Next가 Set-Cookie의 refreshToken을 **파싱해 세션에 흡수**(브라우저로 전달 안 함) |

동작: `/api/auth/login`이 백엔드 `/auth/login` 호출 → 응답 body의 accessToken·memberId + Set-Cookie의 refreshToken을 모아 `SessionPayload` 구성 → jose로 암호화 → HttpOnly 세션 쿠키 설정 → 브라우저엔 `{memberId}`만 반환.

### D4-2. 로그아웃

| 사용 엔드포인트            | 용도                       | 비고                            |
| -------------------------- | -------------------------- | ------------------------------- |
| `POST /api/v1/auth/logout` | 서버측 세션·refresh 무효화 | Bearer(세션의 accessToken) 주입 |

동작: 세션에서 accessToken 추출 → 백엔드 logout 호출 → 성공/실패와 무관하게 Next 세션 쿠키 제거 → 미인증 전환.

### D4-3. BFF 프록시 + 자동 재발급

| 사용 엔드포인트                    | 용도                       | 비고                                              |
| ---------------------------------- | -------------------------- | ------------------------------------------------- |
| (임의 경로) `→ Gateway /api/v1/**` | 모든 인증 데이터 호출 대행 | 세션 accessToken을 `Authorization: Bearer`로 주입 |
| `POST /api/v1/auth/token/reissue`  | 401 시 재발급              | 세션의 refreshToken을 쿠키로 전달                 |

동작: `/api/bff/<path>` 요청 → 세션 복호화 → Bearer 주입 후 게이트웨이 포워드 → **401이면** refreshToken으로 `/auth/token/reissue` 호출 → 새 accessToken(+회전된 refresh)으로 세션 갱신 → 원요청 1회 재시도. 재발급도 실패하면 세션 제거 + 401 반환.

### D4-4. 미들웨어 인증 가드

보호 라우트 매처(`(shell)/**` 등 인증 필요 경로)에서 세션 쿠키 부재 시 `/login?redirect=<원경로>`로 리다이렉트. 공개 경로(`/login`, `/register`, 공개 랜딩)는 통과.

### D4-5. 세션 복원

| 사용 엔드포인트          | 용도                     | 응답 → 내부 모델                         |
| ------------------------ | ------------------------ | ---------------------------------------- |
| `GET /api/v1/members/me` | 앱 로드 시 회원정보 조회 | `MemberMyInfoResponse` → auth-store `me` |

동작: 서버 컴포넌트 또는 `/api/bff/members/me`로 `/members/me` 호출(만료면 D4-3이 재발급) → auth-store에 memberId·me hydrate. localStorage 의존 제거.

---

## D5. 비즈니스 로직

### 401 → 재발급 → 재시도 상태 흐름

:::mermaid
flowchart LR
A([BFF 요청]) --> B[Bearer 주입 포워드]
B --> C{응답 401?}
C -- No --> Z[응답 반환]
C -- Yes --> D[refresh로 reissue]
D --> E{재발급 성공?}
E -- Yes --> F[세션 갱신 후 1회 재시도] --> Z
E -- No --> G[세션 제거 + 401] --> H[클라이언트 /login]
:::

규칙: 재시도는 **정확히 1회**(재발급 후에도 401이면 세션 제거). reissue 동시성은 요청별 독립 처리(단순), 최적화(single-flight)는 후속.

---

## D6. 주의사항

| 항목            | 내용                                                                                                                                                                                                                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Set-Cookie 흡수 | 백엔드가 refreshToken을 Set-Cookie로 주는데, S2S fetch 응답의 Set-Cookie는 **브라우저로 전파하지 말고** Next가 파싱해 세션에 흡수한다                                                                                                                                                                                                          |
| 응답 래퍼       | 백엔드 `Response<T>` = `{ dataHeader: { success: boolean, resultCode: string\|null, resultMessage: object\|null }, dataBody: T }`. **성공 판별 = `dataHeader.success === true`** (코드 확인 완료). 현재 FE `types/api.ts`는 legacy 형태(`successCode: number`)라 신규 shape로 교체 필요. 에러코드(resultCode) 카탈로그만 Swagger 확정 대상(D8) |
| 쿠키 크기       | 토큰 2개 암호화 시 4KB 한계 주의. 초과하면 세션저장소 방식 재검토(현재는 stateless)                                                                                                                                                                                                                                                            |
| SSR 안전        | 쿠키 접근은 서버 컨텍스트에서만. 클라이언트 컴포넌트는 auth-store 파생 상태만 참조                                                                                                                                                                                                                                                             |
| Edge 런타임     | 미들웨어/jose가 Edge에서 동작하도록 Node 전용 API 회피                                                                                                                                                                                                                                                                                         |
| 로그아웃 실패   | 백엔드 logout 실패해도 로컬 세션은 반드시 제거                                                                                                                                                                                                                                                                                                 |

---

## D7. 테스트케이스

세부 TC. TC 템플릿의 세부 범위(D) 표 사용. ID: `TC-BFF-NNN`.

| TC ID      | 목적              | 실행                       | 기대 결과                                              |
| ---------- | ----------------- | -------------------------- | ------------------------------------------------------ |
| TC-BFF-001 | 세션 봉인         | 로그인 성공                | HttpOnly 암호화 세션 쿠키 설정, 브라우저에 토큰 미노출 |
| TC-BFF-002 | Bearer 주입       | `/api/bff/members/me` 호출 | 게이트웨이에 Bearer 포함 요청 → 200                    |
| TC-BFF-003 | 자동 재발급       | access 만료 상태 호출      | reissue 후 재시도 → 200(사용자 무인지)                 |
| TC-BFF-004 | 재발급 실패       | refresh 만료/블랙리스트    | 세션 제거 + 401 → `/login`                             |
| TC-BFF-005 | 미들웨어 가드     | 세션 없이 보호 경로        | `/login?redirect=` 리다이렉트                          |
| TC-BFF-006 | Set-Cookie 미전파 | 로그인 응답 검사           | refreshToken이 브라우저 쿠키로 노출되지 않음           |

---

## D8. 미결 사항

| #   | 항목                                                                                                                                                   | 담당    | 기한    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------- |
| 1   | 소셜 로그인(OAuth) — 백엔드 엔드포인트 부재. 추가 시 콜백을 BFF에서 세션 봉인하도록 설계                                                               | BE 선행 | 미정    |
| 2   | 2단계 가입·이메일 인증·중복확인 — 백엔드 미지원                                                                                                        | BE 선행 | 미정    |
| 3   | Swagger/OpenAPI 정본 URL 확인 → **에러코드(resultCode) 카탈로그·재발급 실패 코드** 확정 (래퍼 shape·성공 판별 `dataHeader.success`는 코드로 확인 완료) | FE/BE   | 구현 전 |
| 4   | 세션 쿠키 4KB 초과 여부 실측 → 초과 시 서버 세션저장소 전환                                                                                            | FE      | 구현 중 |

---

## 변경 이력

| 버전 | 날짜       | 변경 내용                      | 작성자 |
| ---- | ---------- | ------------------------------ | ------ |
| 1.0  | 2026-07-21 | 최초 작성 (brainstorming 산출) | FE     |
