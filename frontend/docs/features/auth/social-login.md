[//]: # '저장 경로: docs/features/auth/social-login.md'

# 인증(auth) — 소셜 로그인 세부 명세서

> **작성일**: 2026-08-07
> **공통 명세**: [인증 공통 명세](./auth.md)
> **대상**: 웹 (Next.js App Router)
> **작성자**: Claude Code
> **상태**: 초안

이 문서는 [인증 공통 명세](./auth.md)의 **소셜 로그인(OAuth) 화면 및 플로우**를 상세화한다. 백엔드 `auth-service`에 소셜 로그인 엔드포인트가 추가되어 미결(D8)이던 항목을 구현으로 전환한다.

[[_TOC_]]

---

## D0. 배경 / 기획 의도

| 항목              | 내용                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| 충족 요구사항     | 공통 명세 S3-5(소셜 로그인)                                                                       |
| 기존 동작 (as-is) | 백엔드 미지원으로 FE 미구현(공통명세 D8 미결). legacy(NowDoBoss)에는 google/naver/kakao 버튼 존재 |
| 목표 동작 (to-be) | authorize URL 생성 → 공급자 인증 → 콜백(code/state) 교환 → BFF가 토큰을 세션쿠키로 봉인 → 홈 이동 |
| 이번 라운드 대상  | **카카오 우선**. 코드는 provider-agnostic. google/naver는 백엔드 지원·키 확인 후 확장(D8)         |
| 연관 세부 기능    | [login](./login.md), [session-bff](./session-bff.md)                                              |

---

## D1. 기능 개요

```
[소셜 버튼] → GET /api/bff/auth/{provider}/authorize → { authorizationUrl }
   → window.location = authorizationUrl (공급자 인증 페이지)
   → 공급자가 redirect_uri(FE 콜백)로 ?code&state 반환
   → 콜백(서버 라우트) → GET /auth/{provider}/login?code&state → { accessToken, memberId } + Set-Cookie(refresh)
   → setSession(암호화 세션쿠키 봉인) → / 로 리다이렉트
```

토큰 커스터디 원칙([session-bff](./session-bff.md))을 그대로 따른다: **브라우저 JS는 토큰을 보지 못한다.**

---

## D2. 동작 요구사항

| #   | 요구사항                                                                               | 상세 참조 |
| --- | -------------------------------------------------------------------------------------- | --------- |
| 1   | authorize URL은 BFF 경유로 받고, 반환된 URL로 브라우저를 이동시킨다                    | D4-1      |
| 2   | 콜백 교환은 **서버 라우트**에서 수행하고, Set-Cookie의 refreshToken을 세션에 봉인한다  | D4-2      |
| 3   | state는 백엔드가 authorize URL에 포함(CSRF 방어). FE는 콜백의 code/state를 그대로 전달 | D4-2      |
| 4   | 교환 실패/취소 시 `/login`으로 복귀하고 사용자에게 사유를 안내한다                     | D5        |
| 5   | 성공 후 세션 복원(`/members/me`)·인증 상태 전환은 일반 로그인과 동일                   | D4-2, D5  |

---

## D3. 아키텍처 / 시스템 설계

| 모듈                                          | 책임                                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/components/auth/social-login.tsx`        | 소셜 버튼 UI + authorize URL 요청/리다이렉트(client)                                           |
| `app/api/auth/social/[provider]/route.ts`     | 콜백 교환 서버 라우트(GET). 백엔드 login 호출 → 세션 봉인 → 302 redirect                       |
| `app/(auth)/social/[provider]/page.tsx`(선택) | 콜백 로딩/에러 표시 페이지(서버 라우트를 직접 redirect_uri로 쓰면 생략 가능)                   |
| 재사용                                        | `setSession`, `extractCookieValue`, `isApiSuccess`, `getApiMessage`(로그인 라우트와 동일 패턴) |

**설계 결정**: 콜백 교환은 로그인 응답과 동일하게 refreshToken이 Set-Cookie로 오고 세션 봉인이 필요하다. 범용 프록시(`/api/bff/...`)는 Set-Cookie를 strip하므로 **전용 서버 라우트**를 둔다(`app/api/auth/login/route.ts`와 동형).

---

## D4. 상세 동작 정의

### D4-1. 인가 URL 요청

| 엔드포인트                                                                         | 요청 | 응답                                     |
| ---------------------------------------------------------------------------------- | ---- | ---------------------------------------- |
| `GET /api/bff/auth/{provider}/authorize` → `GET /api/v1/auth/{provider}/authorize` | -    | `Response<{ authorizationUrl: string }>` |

- 성공 시 `window.location.href = authorizationUrl`.

### D4-2. 콜백 교환(서버 라우트)

| 엔드포인트                                       | 요청(query)     | 응답                                                        |
| ------------------------------------------------ | --------------- | ----------------------------------------------------------- |
| `GET /auth/{provider}/login?code&state` (백엔드) | `code`, `state` | `Response<{ accessToken, memberId }>` + Set-Cookie(refresh) |

- 서버 라우트가 위를 호출 → refreshToken 추출 → `setSession({accessToken, refreshToken, memberId})` → `NextResponse.redirect('/')`.
- 실패 시 `/login?error=social`로 redirect.

---

## D5. 비즈니스 로직

| 조건                    | 결과                                                      |
| ----------------------- | --------------------------------------------------------- |
| authorize URL 수신 성공 | 공급자 페이지로 이동                                      |
| 콜백 교환 성공          | 세션 봉인 → `/` 이동 → 인증 상태 전환                     |
| 공급자 취소/에러        | `/login`으로 복귀 + 안내                                  |
| refreshToken 누락       | 502 처리 → `/login`으로 복귀 + 안내(로그인 라우트와 동일) |

---

## D6. 주의사항

| 항목           | 내용                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| redirect_uri   | 백엔드가 authorize URL 생성 시 넣는 콜백 경로가 FE 콜백 라우트와 **정확히 일치**해야 함(D8-1로 백엔드 확인) |
| provider 값    | 경로 파라미터 문자열(`kakao` 등) — 백엔드 규약과 일치 확인. 화이트리스트로 제한(오픈 리다이렉트·오용 방지)  |
| state          | FE는 검증하지 않고 그대로 전달(백엔드가 발급·검증). FE 임의 state 생성 금지                                 |
| 토큰 노출 금지 | 콜백 교환은 반드시 서버에서. code/state를 클라이언트 로직으로 백엔드에 직접 노출하지 않음                   |

---

## D7. 테스트케이스

| TC ID      | 목적           | 실행                     | 기대 결과                       |
| ---------- | -------------- | ------------------------ | ------------------------------- |
| TC-SOC-001 | 인가 URL 이동  | 카카오 버튼 클릭         | authorize URL로 이동            |
| TC-SOC-002 | 콜백 교환 성공 | 유효 code/state 콜백     | 세션 봉인 → `/` 이동, 인증 전환 |
| TC-SOC-003 | 콜백 실패      | 잘못된/만료 code         | `/login` 복귀 + 안내            |
| TC-SOC-004 | provider 제한  | 화이트리스트 외 provider | 요청 차단/무시                  |

---

## D8. 미결 사항

| #   | 항목                                                                                                                                                                                                                                    | 담당  | 기한    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------- |
| 1   | 백엔드 redirect_uri 콜백 경로 확정(FE 라우트와 정합) — **dev 실측**: dev 카카오 OAuth의 client_id/redirect_uri가 **비어있음(empty)** 확인. FE 구현·단위테스트는 완료했으나 end-to-end 인가는 백엔드 dev OAuth 설정 전까지 차단(BLOCKED) | FE/BE | BE 선행 |
| 2   | 지원 provider 목록(카카오 외 google/naver 백엔드 키 준비 여부) — **dev 실측**: 현재 카카오만 화이트리스트 등록, google/naver 키 미확인. FE 코드는 provider-agnostic으로 확장 준비만 완료                                                | BE    | 미정    |
| 3   | 소셜 신규가입 시 닉네임/이름 추가 입력 필요 여부(백엔드 응답 확인)                                                                                                                                                                      | FE/BE | 구현 중 |

---

## 변경 이력

| 버전 | 날짜       | 변경 내용 | 작성자      |
| ---- | ---------- | --------- | ----------- |
| 1.0  | 2026-08-07 | 최초 작성 | Claude Code |
