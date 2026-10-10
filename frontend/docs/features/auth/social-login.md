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
[소셜 버튼] → GET /api/auth/social/{provider}/authorize (BFF 전용 라우트)
   → BFF: GET /auth/{provider}/authorize → { authorizationUrl }
   → BFF: authorizationUrl 의 state 를 Set-Cookie social_state (HttpOnly · SameSite=Lax · Path=/api/auth/social · 10분)
   → window.location = authorizationUrl (공급자 인증 페이지)
   → 공급자가 redirect_uri(FE 콜백)로 ?code&state 반환
   → 콜백(서버 라우트): social_state 쿠키를 읽고 곧바로 지운다
       ├ code/state 없음 → /login?error=social
       ├ 쿼리 state ≠ 쿠키(또는 쿠키 없음) → 백엔드를 부르지 않고 /login?error=social_state
       └ GET /auth/{provider}/login?code&state → { accessToken, memberId } + Set-Cookie(refresh)
   → setSession(암호화 세션쿠키 봉인) → 복귀 경로로 리다이렉트

[가입 모드 — /register · /register/social 의 카카오 버튼] (#495)
   필수 동의 3개가 모두 켜졌을 때만 시작한다. 모자라면 이동하지 않고 빠진 항목을 강조한다
   → GET /api/auth/social/{provider}/authorize?termsAgreed=true&privacyAgreed=true&ageOver14Confirmed=true
   → (위와 같은 흐름) → 신규면 백엔드가 가입 + 동의 이력, 기존 회원이면 그냥 로그인

[로그인 화면에서 동의 없이 시작한 신규 회원]
   콜백 → 백엔드 400 AUTH_021 / AUTH_022 (회원 미생성, code·state 는 이미 소비)
   → /register/social?provider=kakao&reason=terms|age[&redirect=<복귀 경로>]
   → 동의 후 authorize 부터 다시 (카카오 앱 동의를 마친 사용자는 대개 곧바로 콜백으로 돌아온다)
```

토큰 커스터디 원칙([session-bff](./session-bff.md))을 그대로 따른다: **브라우저 JS는 토큰을 보지 못한다.**

---

## D2. 동작 요구사항

| #   | 요구사항                                                                                                                                  | 상세 참조      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | authorize URL은 BFF 경유로 받고, 반환된 URL로 브라우저를 이동시킨다                                                                       | D4-1           |
| 2   | 콜백 교환은 **서버 라우트**에서 수행하고, Set-Cookie의 refreshToken을 세션에 봉인한다                                                     | D4-2           |
| 3   | state는 백엔드가 authorize URL에 포함한다. BFF 는 그 state 를 HttpOnly 쿠키에 묶고, 콜백에서 쿠키와 대조한 뒤에만 백엔드에 전달한다(#527) | D4-1, D4-2, D6 |
| 4   | 교환 실패/취소 시 `/login`으로 복귀하고 사용자에게 사유를 안내한다                                                                        | D5             |
| 5   | 성공 후 세션 복원(`/members/me`)·인증 상태 전환은 일반 로그인과 동일                                                                      | D4-2, D5       |

---

## D3. 아키텍처 / 시스템 설계

| 모듈                                                 | 책임                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/auth/social-login.tsx`               | 소셜 버튼 UI + authorize URL 요청/리다이렉트(client)                                                                                  |
| `app/api/auth/social/[provider]/authorize/route.ts`  | 인가 URL 서버 라우트(GET). 백엔드 authorize 호출 → state 를 `social_state` 쿠키로 심음 → 본문 그대로 반환                             |
| `app/api/auth/social/[provider]/route.ts`            | 콜백 교환 서버 라우트(GET). `social_state` 대조 → 백엔드 login 호출 → 세션 봉인 → 307 redirect                                        |
| `src/lib/auth/social-state.ts`                       | provider 화이트리스트, `social_state` 쿠키 상수·옵션, state 추출·대조(SHA-256 + timingSafeEqual), 동의 쿼리 선별, 콜백 실패 kind 판정 |
| `src/lib/auth/social-errors.ts`                      | `/login?error=<kind>` 경로·문구(로그인 화면)                                                                                          |
| `src/lib/auth/signup-consent.ts`                     | 가입 동의 판정·authorize 동의 쿼리(`signupConsentQuery`)·동의 화면 경로(`socialSignupPath`)·`reason` 판정(#495)                       |
| `app/(auth)/register/social/page.tsx`                | 카카오 첫 가입 동의 화면 라우트(서버). `resolveSocialSignupQuery` 로 provider·reason·redirect 를 거른다. 메타 `index: false`          |
| `src/components/auth/social-signup-consent-page.tsx` | 동의 화면(client, `GuestOnly`) — 동의 fieldset + 가입 모드 카카오 버튼                                                                |
| `app/(auth)/social/[provider]/page.tsx`(선택)        | 콜백 로딩/에러 표시 페이지(서버 라우트를 직접 redirect_uri로 쓰면 생략 가능)                                                          |
| 재사용                                               | `setSession`, `extractCookieValue`, `isApiSuccess`, `getApiMessage`(로그인 라우트와 동일 패턴)                                        |

**설계 결정**: 콜백 교환은 로그인 응답과 동일하게 refreshToken이 Set-Cookie로 오고 세션 봉인이 필요하다. 범용 프록시(`/api/bff/...`)는 Set-Cookie를 strip하므로 **전용 서버 라우트**를 둔다(`app/api/auth/login/route.ts`와 동형).

---

## D4. 상세 동작 정의

### D4-1. 인가 URL 요청

| 엔드포인트                                                                            | 요청                                                      | 응답                                                                 |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| `GET /api/auth/social/{provider}/authorize` → `GET /api/v1/auth/{provider}/authorize` | (선택) `termsAgreed`·`privacyAgreed`·`ageOver14Confirmed` | `Response<{ authorizationUrl: string }>` + Set-Cookie `social_state` |

- 동의 쿼리는 값이 정확히 `true` 인 것만 백엔드로 넘기고 나머지 쿼리는 버린다(`pickConsentQuery`). 로그인 화면은 보내지 않고, 가입 모드(D4-3)만 보낸다.
- 백엔드 실패는 상태·본문을 그대로 넘기고 쿠키를 심지 않는다. 인가 URL 에 state 가 없으면 502, 화이트리스트 밖 provider 는 404.
- 성공 시 `window.location.href = authorizationUrl`.
- 범용 BFF 경로(`/api/bff/auth/{provider}/authorize`)는 막지 않았지만 **쓰지 않는다.** 그 경로로 받은 URL 은 쿠키가 없어 콜백에서 `social_state` 로 거절된다.

### D4-2. 콜백 교환(서버 라우트)

| 엔드포인트                                       | 요청(query)     | 응답                                                        |
| ------------------------------------------------ | --------------- | ----------------------------------------------------------- |
| `GET /auth/{provider}/login?code&state` (백엔드) | `code`, `state` | `Response<{ accessToken, memberId }>` + Set-Cookie(refresh) |

- 서버 라우트가 위를 호출 → refreshToken 추출 → `setSession({accessToken, refreshToken, memberId})` → 복귀 경로로 redirect.
- 판정 순서(바꾸지 않는다): ① provider 화이트리스트 → ② code·state 존재 → ③ `social_state` 쿠키 대조 → ④ 백엔드 호출. ③ 이 ④ 보다 늦으면 남이 보낸 콜백이 정상 state 를 백엔드에서 먼저 소비할 수 있다.
- 실패 redirect(`socialCallbackFailure`):

| 결과                                               | redirect                                     |
| -------------------------------------------------- | -------------------------------------------- |
| provider 밖 · code/state 없음                      | `/login?error=social`                        |
| state 불일치 · 쿠키 없음(BE 미호출)                | `/login?error=social_state`                  |
| 같은 이름 `social_state` 쿠키가 둘 이상(BE 미호출) | `/login?error=social_state`                  |
| `AUTH_010` (state 재사용·만료)                     | `/login?error=social_state`                  |
| `AUTH_021` (신규 · 문서 동의 없음·부족)            | `/register/social?provider=<p>&reason=terms` |
| `AUTH_022` (신규 · 만 14세 미확인)                 | `/register/social?provider=<p>&reason=age`   |
| 그 밖                                              | `/login?error=social`                        |

- `socialCallbackFailure(resultCode, { provider, returnPath })` 가 kind 가 아니라 **경로**를 돌려준다(#495). 콜백의 `fail` 은 복귀 경로 쿠키를 늘 지우고, 동의 화면으로 갈 때만 그 값이 루트가 아니면 `&redirect=<인코딩>` 으로 넘긴다. 동의 화면의 카카오 버튼이 그 값으로 쿠키를 다시 남긴다.
- 판정 순서·`social_state` 쿠키 삭제·중복 쿠키 거절은 #527 그대로다.

### D4-3. 가입 모드와 카카오 첫 가입 동의 화면 (#495)

`SocialLogin` props: `consent?: SignupConsent`, `onConsentIncomplete?(missing)`, `showDivider?: boolean`(기본 `true`), `label?: '카카오 로그인' | '카카오로 시작하기'`(기본 「카카오 로그인」, #577).

> **버튼 규격(#577, 사용자 결정 D-5)**: 카카오 디자인 가이드 규격 — 컨테이너 `#FEE500`, 라벨 `rgba(0, 0, 0, 0.85)`, 검정 말풍선 심볼(`aria-hidden`). 토큰 체계 밖 예외라 `social-login.tsx` 의 `KAKAO_BRAND` 상수 한 곳에만 두고 DESIGN.md 「외부 브랜드 예외」 절이 근거를 적는다. 로그인·가입 화면에서는 **맨 위**에 두고, 「또는 이메일로」 구분선은 버튼 **아래**에 붙는다(이메일 폼이 그 아래로 이어진다). 데스크톱도 같은 순서다.

| 상황                        | 동작                                                                                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `consent` 없음(로그인 화면) | 지금처럼 동의 없이 시작. 기존 회원은 그대로 로그인, 신규는 콜백이 동의 화면으로 보낸다                                                                                           |
| `consent` 있음 + 미완료     | 버튼은 비활성화하지 않는다. 누르면 이동하지 않고 `onConsentIncomplete(missing)` — 부모가 해당 체크박스를 강조·포커스하고 「카카오로 가입하려면 필수 항목에 모두 동의해 주세요.」 |
| `consent` 있음 + 완료       | `/api/auth/social/{provider}/authorize` + `signupConsentQuery(consent)`                                                                                                          |

`/register/social` 화면(`AuthShell`):

| 요소                  | 내용                                                                                                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 쿼리                  | `provider` — 화이트리스트(`kakao`) 밖이면 `/register` 로 redirect. `reason` — `terms`·`age`, 그 밖은 `terms`. `redirect` — `safeReturnPath`                                                                |
| eyebrow · 제목 · 설명 | 「카카오로 가입」 · 「약관에 동의하면 가입이 끝납니다.」 · 「필수 항목에 동의한 뒤 「카카오로 시작하기」를 누르면 가입이 끝나요.」                                                                         |
| `reason=terms`        | Notice(info) 「카카오 계정으로 처음 오셨어요. 아래 필수 항목에 동의해 주세요.」                                                                                                                            |
| `reason=age`          | Notice(info) 「카카오 가입을 마치려면 만 14세 이상인지 확인해 주세요.」 + 만 14세 체크박스를 처음부터 `aria-invalid`(인라인 오류 「만 14세 이상만 가입할 수 있어요.」). 빨간 표시는 인라인 오류 하나뿐이다 |
| 본문                  | `SignupConsentFieldset` + `SocialLogin`(가입 모드, `showDivider={false}`, `returnTo`, `label="카카오로 시작하기"`)                                                                                         |
| 하단                  | 「이메일로 가입하기」 `/register` · 「로그인으로 돌아가기」 `/login` (구분자 `·` 는 `aria-hidden`)                                                                                                         |
| 로그인 상태           | `/register` 와 같이 `GuestOnly`                                                                                                                                                                            |

---

## D5. 비즈니스 로직

| 조건                         | 결과                                                                                                                                                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| authorize URL 수신 성공      | 공급자 페이지로 이동                                                                                                                                                                                                                                |
| 콜백 교환 성공               | 세션 봉인 → `/` 이동 → 인증 상태 전환                                                                                                                                                                                                               |
| 공급자 취소/에러             | `/login`으로 복귀 + 안내                                                                                                                                                                                                                            |
| refreshToken 누락            | 502 처리 → `/login`으로 복귀 + 안내(로그인 라우트와 동일)                                                                                                                                                                                           |
| `/login?error=social`        | 「소셜 로그인에 실패했습니다. 다시 시도해 주세요.」                                                                                                                                                                                                 |
| `/login?error=social_state`  | 「로그인 요청이 만료됐거나 다른 브라우저에서 시작됐어요. 이 화면에서 다시 시도해 주세요.」                                                                                                                                                          |
| `/login?error=social_signup` | 「카카오 계정으로 처음 오셨어요. 회원가입에서 약관에 동의한 뒤 카카오로 가입해 주세요.」 + `/register` 링크(「회원가입하기」, 복귀 경로가 있으면 `?redirect=` 를 들고 간다 — #576). #495 뒤에는 콜백이 보내지 않지만 오래된 탭·북마크를 위해 남긴다 |
| 그 밖의 `?error=` 값         | 안내를 표시하지 않는다                                                                                                                                                                                                                              |

- 문구 정본은 이 표다. 코드는 `src/lib/auth/social-errors.ts`(`socialLoginErrorMessage`)이며 `login-form.tsx` 가 `Notice`(error)로 그린다.

---

## D6. 주의사항

| 항목           | 내용                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| redirect_uri   | 백엔드가 authorize URL 생성 시 넣는 콜백 경로가 FE 콜백 라우트와 **정확히 일치**해야 함(D8-1로 백엔드 확인)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| provider 값    | 경로 파라미터 문자열(`kakao` 등) — 백엔드 규약과 일치 확인. 화이트리스트로 제한(오픈 리다이렉트·오용 방지)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| state          | 백엔드가 발급·보관·1회 소비한다. **BFF 가 authorize 응답의 state 를 `social_state` HttpOnly 쿠키에 묶고, 콜백에서 쿠키와 대조한 뒤에만 백엔드를 부른다**(#527). 대조 없이 넘기면 남이 만든 인가 URL 로 피해자 브라우저에 남의 세션이 생기거나(login CSRF), 남이 정한 동의 값으로 피해자 이름의 회원·동의 이력이 생긴다(계약 §0-4). 쿠키는 콜백 맨 앞에서 읽고 **path 와 함께** 즉시 지운다. 원본 `Cookie` 헤더에 같은 이름이 둘 이상이면 거절한다 — 형제 서브도메인이 `Domain=.bosspickseoul.com; Path=/` 로 심은 쿠키가 Next 파서에서 마지막 값으로 이기고 path 가 달라 지워지지도 않기 때문이다(`cookies().getAll()` 은 Map 파싱이라 중복을 못 봐서 원본 헤더를 센다). FE 임의 state 생성 금지 |
| 토큰 노출 금지 | 콜백 교환은 반드시 서버에서. code/state를 클라이언트 로직으로 백엔드에 직접 노출하지 않음                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

---

## D7. 테스트케이스

| TC ID      | 목적                | 실행                                                                   | 기대 결과                                                                                                                                                                                                                      |
| ---------- | ------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TC-SOC-001 | 인가 URL 이동       | 카카오 버튼 클릭                                                       | authorize URL로 이동                                                                                                                                                                                                           |
| TC-SOC-002 | 콜백 교환 성공      | 유효 code/state 콜백                                                   | 세션 봉인 → `/` 이동, 인증 전환                                                                                                                                                                                                |
| TC-SOC-003 | 콜백 실패           | 잘못된/만료 code                                                       | `/login` 복귀 + 안내                                                                                                                                                                                                           |
| TC-SOC-004 | provider 제한       | 화이트리스트 외 provider                                               | 요청 차단/무시                                                                                                                                                                                                                 |
| TC-SST-001 | state 대조 성공     | 쿠키 state = 쿼리 state, BE 성공                                       | 세션 봉인, 복귀 경로 이동, `social_state` 가 path 와 함께 지워짐                                                                                                                                                               |
| TC-SST-002 | state 불일치        | 쿠키 state ≠ 쿼리 state                                                | BE 미호출, `/login?error=social_state`, 쿠키 지워짐                                                                                                                                                                            |
| TC-SST-003 | 쿠키 없음           | `social_state` 없음                                                    | BE 미호출, `/login?error=social_state`                                                                                                                                                                                         |
| TC-SST-004 | 콜백 재사용         | 같은 콜백 두 번                                                        | 두 번째는 BE 미호출, `social_state`                                                                                                                                                                                            |
| TC-SST-005 | 신규 가입 동의 부족 | BE `AUTH_021` / `AUTH_022`                                             | (#495 에서 TC-CON-005 로 대체) 복귀 경로 쿠키 지워짐                                                                                                                                                                           |
| TC-SST-006 | state 만료          | BE `AUTH_010`                                                          | `/login?error=social_state`                                                                                                                                                                                                    |
| TC-SST-007 | 공급자 취소         | `?error=access_denied&state=s`                                         | BE 미호출, `/login?error=social`, state 쿠키 지워짐                                                                                                                                                                            |
| TC-SST-008 | state 쿠키 중복     | 원본 헤더 `social_state=s; social_state=attacker`, 쿼리 state=attacker | BE 미호출, `/login?error=social_state`                                                                                                                                                                                         |
| TC-SAU-001 | 인가 URL + 쿠키     | BE 성공(`state=abc`)                                                   | 200, 본문 그대로, `social_state=abc`·HttpOnly·SameSite=lax·Path=/api/auth/social·Max-Age=600                                                                                                                                   |
| TC-SAU-002 | 동의 쿼리 선별      | `termsAgreed=true&privacyAgreed=false&ageOver14Confirmed=true&evil=1`  | BE 쿼리 `termsAgreed=true&ageOver14Confirmed=true`                                                                                                                                                                             |
| TC-SAU-003 | state 없는 인가 URL | `authorizationUrl` 에 state 없음                                       | 502, 쿠키 없음                                                                                                                                                                                                                 |
| TC-SAU-004 | BE 실패             | BE 400                                                                 | 400, 본문 그대로, 쿠키 없음                                                                                                                                                                                                    |
| TC-SAU-005 | provider 제한       | provider `evil`                                                        | 404, BE 미호출                                                                                                                                                                                                                 |
| TC-CON-004 | 동의 화면           | `/register/social` 렌더(`reason=age`·`terms`)                          | `age` 면 info 안내 + 만 14세 인라인 오류 1회·체크박스 강조, `terms` 면 안내 문구, 「또는」 없음. 동의 미완료 클릭 시 강조 뒤 포커스, `redirect` 가 `auth_return` 쿠키로 남음(`social-signup-consent-page.interaction.test.ts`) |
| TC-CON-005 | 콜백 동의 분기      | BE `AUTH_021` / `AUTH_022`, 복귀 경로 쿠키 `/community?tab=1`          | `/register/social?provider=kakao&reason=terms` / `reason=age` + `&redirect=%2Fcommunity%3Ftab%3D1`, 쿠키 지워짐                                                                                                                |
| TC-CON-006 | 가입 모드           | 동의 미완료 / 완료로 카카오 클릭                                       | 미완료면 fetch 미호출 + `onConsentIncomplete(missing)`, 완료면 동의 쿼리를 붙여 fetch                                                                                                                                          |

---

## D8. 미결 사항

| #   | 항목                                                                                                                                                                                                                                    | 담당  | 기한      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------- |
| 1   | 백엔드 redirect_uri 콜백 경로 확정(FE 라우트와 정합) — **dev 실측**: dev 카카오 OAuth의 client_id/redirect_uri가 **비어있음(empty)** 확인. FE 구현·단위테스트는 완료했으나 end-to-end 인가는 백엔드 dev OAuth 설정 전까지 차단(BLOCKED) | FE/BE | BE 선행   |
| 2   | 지원 provider 목록(카카오 외 google/naver 백엔드 키 준비 여부) — **dev 실측**: 현재 카카오만 화이트리스트 등록, google/naver 키 미확인. FE 코드는 provider-agnostic으로 확장 준비만 완료                                                | BE    | 미정      |
| 3   | 소셜 신규가입 시 추가 입력 — **동의(약관·처리방침·만 14세)는 #495 로 해소**: authorize 단계에서 받는다(D4-3). 닉네임/이름 추가 입력은 계약 §0-2 에 없어 FE 가 받지 않는다(필요하면 BE 계약 선행)                                        | FE/BE | 부분 해소 |

---

## 변경 이력

| 버전 | 날짜       | 변경 내용                                                                                                                                                                                           | 작성자      |
| ---- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1.0  | 2026-08-07 | 최초 작성                                                                                                                                                                                           | Claude Code |
| 1.1  | 2026-10-07 | #527 소셜 state 를 BFF `social_state` 쿠키로 브라우저에 묶음 — authorize 전용 라우트 신설, 콜백 대조·판정 순서, AUTH_010/021/022 분기, 중복 state 쿠키 거절, 로그인 화면 문구(D1·D2·D3·D4·D5·D6·D7) | Claude Code |
| 1.2  | 2026-10-07 | #495 가입 모드(`consent`·`onConsentIncomplete`·`showDivider`), 카카오 첫 가입 동의 화면 `/register/social`, AUTH_021/022 → 동의 화면 경로(복귀 경로 `redirect`), D8-3 부분 해소(D1·D3·D4·D5·D7·D8)  | Claude Code |
| 1.3  | 2026-10-10 | #577 카카오 규격 버튼(`#FEE500`·85% 검정·심볼, 라벨 「카카오 로그인」/「카카오로 시작하기」), 로그인·가입 맨 위 배치와 「또는 이메일로」 구분선, `label` prop(D4-3·D5)                              | Claude Code |
