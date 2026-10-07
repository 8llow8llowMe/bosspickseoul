# 소셜 state 쿠키 결속(#527) · 가입 동의(#495) 구현 명세

> **작성일**: 2026-10-07
> **대상 이슈**: #527 `[FE] fix: 소셜 로그인 state 를 BFF 쿠키로 브라우저에 묶는다`, #495 `[FE] feat: 가입 화면에 약관·처리방침 동의와 만 14세 이상 확인을 추가한다`
> **선행 BE**: PR #528(#494) — **2026-10-06 develop 머지, `backend-auth-service` 라벨**
> **실행 방식**: 하위 에이전트 구현(PR 1 → PR 2 순서), 메인이 검토·통합
> **정본 계약**: `backend/docs/auth-account-frontend-guide.md` §0 (이슈 본문과 다르면 **계약이 이긴다**)

---

## 0. 왜 지금, 왜 이 순서인가

- #528 이 이미 develop 에 머지됐다. 원래 #495 와 함께 머지하려고 draft 로 두었던 PR 이다. 배포되면 아래가 깨진다.
  - 동의 필드 없는 이메일 가입 → `MEMBER_114` 로 막힘
  - 신규 카카오 가입 → `AUTH_021` 로 막힘
  - 기존 회원 로그인은 영향 없음
- #527 은 **#495 와 같은 릴리스나 그보다 먼저** 나가야 한다(계약 §0-4). 동의 값을 실은 인가 URL 을 남이 피해자에게 열게 하면, 피해자 이름으로 회원과 동의 이력이 생긴다.
- 그래서 **PR 1(#527) → PR 2(#495)** 순서로 올리고, 둘 다 `frontend-web` 라벨을 단다. PR 2 는 PR 1 위에 쌓되 **base 는 develop** 으로 둔다(FE `CLAUDE.md` 「PR 생성 규약」).

---

## 1. 이슈 본문과 달라지는 결정 (재논의하지 않는다)

| #   | 이슈 본문                                                    | 이 명세의 결정                                  | 근거                                                                                                                            |
| --- | ------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | #495 「가입 요청에 동의 필드와 문서 판(`version`)을 싣는다」 | **판은 보내지 않는다.** boolean 세 개만 보낸다  | 계약 §0: 「판은 서버 설정으로 정해지므로 프론트가 판을 보내지 않는다」                                                          |
| 2   | #527 쿠키 `Secure`                                           | `secure: process.env.NODE_ENV === 'production'` | `src/lib/auth/session.ts` 의 세션 쿠키와 같은 판정. 로컬 http 개발이 막히지 않게 한다                                           |
| 3   | #527 (선택) BE 도 쿠키로 강제                                | **이번 범위에서 뺀다**                          | FE 단독 범위. BFF 가 BE `/login` 을 부르기 전에 막으면 두 공격 모두 막힌다                                                      |
| 4   | #495 처리방침 제3조 「동의 기록」 + 판 올림                  | **이번 범위에서 뺀다**(§7 미결로 넘김)          | 판을 올리면 BE `legal.privacy-version` 도 같은 배포에 올려야 한다(계약 §0-4). 교차 워크스페이스 변경이라 사용자 결정이 필요하다 |

---

## 2. 전체 흐름 (to-be)

```
[로그인 화면 · 카카오]                       [가입 화면 · 카카오]  /  [동의 화면 · 카카오]
SocialLogin (동의 없음)                      SocialLogin (consent 3개 true 일 때만 시작)
   │ fetch GET /api/auth/social/kakao/authorize[?termsAgreed=true&privacyAgreed=true&ageOver14Confirmed=true]
   ▼
BFF authorize 라우트 (신규)
   ├─ BE GET /api/v1/auth/kakao/authorize?<동의 쿼리 그대로>
   ├─ authorizationUrl 에서 state 추출
   └─ Set-Cookie: social_state=<state>; HttpOnly; SameSite=Lax; Path=/api/auth/social; Max-Age=600 (+Secure in prod)
   ▼ JSON { authorizationUrl } (지금과 같은 ApiResponse 모양)
window.location.assign(authorizationUrl) → 카카오 → GET /api/auth/social/kakao?code&state
   ▼
BFF 콜백 라우트
   1. social_state 쿠키를 읽고 **곧바로 지운다** (모든 분기)
   2. code/state 없음 → /login?error=social
   3. 쿼리 state ≠ 쿠키 (timingSafeEqual) 또는 쿠키 없음 → **BE 를 부르지 않고** /login?error=social_state
   4. BE GET /api/v1/auth/kakao/login?code&state
   5. 실패 resultCode 분기 → AUTH_021 / AUTH_022 / AUTH_010 / 그 밖 (§3-3, §4-5)
   6. 성공 → setSession → 복귀 경로
```

---

## 3. PR 1 — #527 소셜 state 를 BFF 쿠키로 묶는다

- 브랜치: `fix/fe/social-state-cookie`
- 커밋 제목 예: `[FE] fix: 소셜 로그인 state 를 BFF 쿠키로 브라우저에 묶는다`
- PR: `--label frontend-web --assignee seonghoho`, 본문에 `close #527`

### 3-1. `src/lib/auth/social-state.ts` (신규, 순수 모듈 · 서버 전용)

| 내보내기                                                          | 동작                                                                                                                                                        |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SOCIAL_PROVIDERS`                                                | `new Set(['kakao'])`. 지금 콜백 라우트에 있는 화이트리스트를 여기로 옮기고 콜백·authorize 라우트가 함께 쓴다                                                |
| `SOCIAL_STATE_COOKIE = 'social_state'`                            |                                                                                                                                                             |
| `SOCIAL_STATE_COOKIE_PATH = '/api/auth/social'`                   | authorize(`/api/auth/social/kakao/authorize`)와 콜백(`/api/auth/social/kakao`) 둘 다 포함하는 접두                                                          |
| `SOCIAL_STATE_MAX_AGE_SECONDS = 600`                              | BE 가 state 를 10분 보관하는 것과 맞춘다                                                                                                                    |
| `socialStateCookieOptions()`                                      | `{ httpOnly: true, secure: NODE_ENV==='production', sameSite: 'lax', path: SOCIAL_STATE_COOKIE_PATH, maxAge: SOCIAL_STATE_MAX_AGE_SECONDS }`                |
| `extractStateFromAuthorizationUrl(url: string)`                   | `new URL(url).searchParams.get('state')`. 빈 문자열·파싱 실패는 `null`                                                                                      |
| `isSameState(query: string \| null, cookie: string \| undefined)` | 둘 중 하나라도 비면 `false`. 두 값을 **SHA-256 다이제스트로 바꾼 뒤** `crypto.timingSafeEqual` 로 비교한다(길이 차이로 throw 하지 않고 길이도 새지 않는다)  |
| `pickConsentQuery(searchParams: URLSearchParams)`                 | `termsAgreed`·`privacyAgreed`·`ageOver14Confirmed` 중 **값이 정확히 `'true'` 인 것만** 골라 `?a=true&b=true` 문자열(없으면 `''`)로 만든다. 다른 키는 버린다 |

> `pickConsentQuery` 는 PR 2 에서 쓰지만 authorize 라우트가 PR 1 에서 생기므로 여기서 같이 만든다. PR 1 단독 배포에서도 해가 없다 — 로그인 화면은 동의 쿼리를 보내지 않는다.

### 3-2. `app/api/auth/social/[provider]/authorize/route.ts` (신규, GET)

1. `provider` 가 `SOCIAL_PROVIDERS` 밖이면 404 + 실패 `ApiResponse` JSON.
2. BE `GET ${backendApiUrl}/api/v1/auth/${provider}/authorize${pickConsentQuery(searchParams)}` 를 부른다.
   - `cache: 'no-store'`, `withClientUserAgent(request, { Accept: 'application/json' })` (콜백 라우트와 같은 패턴).
3. BE 가 실패면 **상태 코드와 본문을 그대로** 돌려준다(쿠키 없음). 클라이언트는 지금처럼 Notice 를 띄운다.
4. 성공이면 `authorizationUrl` 에서 state 를 꺼낸다. 없으면 502 + 실패 JSON(쿠키 없음).
5. `NextResponse.json(data)` 에 `response.cookies.set(SOCIAL_STATE_COOKIE, state, socialStateCookieOptions())`, `Cache-Control: no-store`.

응답 모양은 지금 `/api/bff/auth/{provider}/authorize` 와 같다(`ApiResponse<{ authorizationUrl }>`). 그래서 클라이언트는 URL 만 바꾼다.

### 3-3. 콜백 `app/api/auth/social/[provider]/route.ts` 수정

- 맨 앞에서 `social_state` 쿠키를 읽고 **즉시 지운다.** 지울 때 **`path` 를 같이 넘긴다** — `store.delete({ name: SOCIAL_STATE_COOKIE, path: SOCIAL_STATE_COOKIE_PATH })`. path 가 다르면 브라우저가 쿠키를 지우지 않는다.
- 판정 순서(바꾸지 않는다 — 순서가 반대면 정상 state 를 BE 가 먼저 소비해, 공격자가 진행 중인 로그인을 깨뜨릴 수 있다):
  1. provider 화이트리스트 밖 → `fail('social')`
  2. `code` 또는 `state` 없음(카카오 취소 `?error=access_denied` 포함) → `fail('social')`
  3. `!isSameState(state, cookie)` → **fetch 하지 않고** `fail('social_state')`
  4. BE `/login` 호출
  5. 실패면 `resultCode` 로 분기(아래 표). JSON 파싱이 실패해도 `fail('social')`.
- `fail(kind)` 는 복귀 경로 쿠키를 지우고 `/login?error=<kind>` 로 보낸다. kind 를 만드는 부분은 순수 함수로 뺀다(`socialCallbackFailure(resultCode)` → kind). PR 2 가 이 함수만 바꾼다.

| BE 결과                            | PR 1 의 리다이렉트           | PR 2 에서 바뀌는 것                                   |
| ---------------------------------- | ---------------------------- | ----------------------------------------------------- |
| state 불일치·쿠키 없음(BE 미호출)  | `/login?error=social_state`  | 그대로                                                |
| `AUTH_010` (state 재사용·만료)     | `/login?error=social_state`  | 그대로                                                |
| `AUTH_021` (신규 · 문서 동의 부족) | `/login?error=social_signup` | `/register/social?provider=kakao&reason=terms` (§4-5) |
| `AUTH_022` (신규 · 만 14세 미확인) | `/login?error=social_signup` | `/register/social?provider=kakao&reason=age` (§4-5)   |
| 그 밖                              | `/login?error=social`        | 그대로                                                |

### 3-4. `src/components/auth/social-login.tsx`

- `fetch('/api/bff/auth/${provider}/authorize')` → `fetch('/api/auth/social/${provider}/authorize', { cache: 'no-store' })`. 나머지(복귀 경로 쿠키, 에러 Notice)는 그대로.
- 범용 BFF 경로(`/api/bff/auth/kakao/authorize`)는 막지 않는다. 그 경로로 받은 URL 은 쿠키가 없어 콜백에서 거절된다. 아무도 쓰지 않는다는 사실만 명세에 적는다.

### 3-5. 로그인 화면 문구 — `src/lib/auth/social-errors.ts` (신규) + `login-form.tsx`

`socialLoginErrorMessage(kind: string | null): string | null` 순수 함수로 만들고 `login-form.tsx` 의 `isSocialError` 를 대체한다.

| `?error=`       | 문구                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `social`        | 소셜 로그인에 실패했습니다. 다시 시도해 주세요. (지금 문구 유지)                                        |
| `social_state`  | 로그인 요청이 만료됐거나 다른 브라우저에서 시작됐어요. 이 화면에서 다시 시도해 주세요.                  |
| `social_signup` | 카카오 계정으로 처음 오셨어요. 회원가입에서 약관에 동의한 뒤 카카오로 가입해 주세요. + `/register` 링크 |
| 그 밖·없음      | `null` (표시하지 않음)                                                                                  |

> `social_signup` 은 PR 2 머지 뒤에는 콜백이 보내지 않는다. PR 2 는 이 행을 지우지 않고 남겨도 된다 — 오래된 탭·북마크에서 들어와도 깨지지 않게.

### 3-6. 테스트 (vitest, node 환경)

`app/api/auth/social/[provider]/route.test.ts` 의 `next/headers` 목을 **이름별 쿠키 맵 + `delete` 인자 기록(문자열 또는 `{name, path}`)** 으로 넓힌다. 기존 복귀 경로 테스트는 그대로 통과해야 한다.

| TC         | 실행                                              | 기대                                                                       |
| ---------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| TC-SST-001 | 쿠키 state = 쿼리 state, BE 성공                  | `setSession` 호출, 복귀 경로로 이동, `social_state` 가 path 와 함께 지워짐 |
| TC-SST-002 | 쿠키 state ≠ 쿼리 state                           | `fetch` **미호출**, `/login?error=social_state`, 쿠키 지워짐               |
| TC-SST-003 | 쿠키 없음                                         | `fetch` 미호출, `/login?error=social_state`                                |
| TC-SST-004 | 재사용 — 같은 요청을 두 번(첫 호출이 쿠키를 지움) | 두 번째는 fetch 미호출, `social_state`                                     |
| TC-SST-005 | BE `AUTH_021` / `AUTH_022`                        | `/login?error=social_signup`, 복귀 경로 쿠키 지워짐                        |
| TC-SST-006 | BE `AUTH_010`                                     | `/login?error=social_state`                                                |
| TC-SST-007 | `?error=access_denied&state=s` (code 없음)        | fetch 미호출, `/login?error=social`, state 쿠키 지워짐                     |

`app/api/auth/social/[provider]/authorize/route.test.ts` (신규)

| TC         | 실행                                                                   | 기대                                                                                                                 |
| ---------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| TC-SAU-001 | BE 성공(`authorizationUrl=...&state=abc`)                              | 200, 본문 그대로, `Set-Cookie` 에 `social_state=abc`·`HttpOnly`·`SameSite=lax`·`Path=/api/auth/social`·`Max-Age=600` |
| TC-SAU-002 | `?termsAgreed=true&privacyAgreed=false&ageOver14Confirmed=true&evil=1` | BE URL 쿼리가 `termsAgreed=true&ageOver14Confirmed=true` 만 담음                                                     |
| TC-SAU-003 | `authorizationUrl` 에 state 없음                                       | 502, 쿠키 없음                                                                                                       |
| TC-SAU-004 | BE 400 실패                                                            | 400, BE 본문 그대로, 쿠키 없음                                                                                       |
| TC-SAU-005 | provider `evil`                                                        | 404, fetch 미호출                                                                                                    |

`src/lib/auth/social-state.test.ts`: `isSameState`(같음·다름·길이 다름·빈 값), `extractStateFromAuthorizationUrl`(정상·없음·깨진 URL), `pickConsentQuery`.
`src/lib/auth/social-errors.test.ts`: 표의 네 행.

### 3-7. 문서

- `docs/features/auth/social-login.md`
  - D1 흐름도·D3 모듈 표에 authorize BFF 라우트와 `social_state` 쿠키를 넣는다.
  - D6 「state: FE는 검증하지 않고 그대로 전달」 행을 **BFF 가 쿠키와 대조한 뒤에만 BE 를 부른다**로 바꾸고 이유(login CSRF·동의 위조, #527)를 적는다.
  - D7 에 TC-SST·TC-SAU 를 더하고, 변경 이력 1.1 을 남긴다.
- `docs/features/legal/legal.md` S2 쿠키 행에 `social_state`(HttpOnly, 10분, `/api/auth/social` 한정)를 더한다.

### 3-8. 완료 기준

- `pnpm vitest run app/api/auth/social src/lib/auth` 통과, `pnpm qa:verify` 통과.
- `rg "/api/bff/auth/.*/authorize" src app` 결과 0건(테스트 제외).

---

## 4. PR 2 — #495 가입 동의와 만 14세 이상 확인

- 브랜치: `feature/fe/signup-consent` (PR 1 브랜치 위에서 시작, PR base 는 `develop`)
- 커밋 제목 예: `[FE] feat: 가입 화면에 약관·처리방침 동의와 만 14세 이상 확인을 추가한다`
- PR: `--label frontend-web --assignee seonghoho`, 본문에 `close #495`, 「PR 1 위에 쌓였다」 명시

### 4-1. `src/lib/auth/signup-consent.ts` (신규, 순수)

```ts
export type SignupConsentKey =
  'termsAgreed' | 'privacyAgreed' | 'ageOver14Confirmed'
export type SignupConsent = Record<SignupConsentKey, boolean>
export const SIGNUP_CONSENT_KEYS: readonly SignupConsentKey[] // 선언 순서 = BE 오류 순서
export const EMPTY_SIGNUP_CONSENT: SignupConsent
export const isSignupConsentComplete: (c: SignupConsent) => boolean
export const setAllSignupConsent: (value: boolean) => SignupConsent
export const missingSignupConsent: (c: SignupConsent) => SignupConsentKey[]
export const signupConsentQuery: (c: SignupConsent) => string // '?termsAgreed=true&...'
/** 후보: MEMBER_114→[termsAgreed], 115→[privacyAgreed], 116→[ageOver14Confirmed],
 *  MEMBER_010(약관·처리방침 공용)→[termsAgreed, privacyAgreed], MEMBER_011→[ageOver14Confirmed], 그 밖 [] */
export const signupConsentErrorCandidates: (
  resultCode: string | null | undefined,
) => SignupConsentKey[]
/** 후보 중 지금 꺼진 것만 강조한다. 모두 켜져 있으면 후보를 모두 강조한다(리뷰 N1). */
export const signupConsentErrorKeys: (
  resultCode: string | null | undefined,
  consent: SignupConsent,
  fieldErrors: readonly ApiFieldError[],
) => SignupConsentKey[]
```

- `ApiResponse` 의 `resultMessage.errors[]` 가 여러 개면 **필드별 첫 오류**를 쓴다(계약 §0-1). 그 파싱이 필요하면 `src/lib/api/api-error.ts` 의 기존 유틸을 먼저 찾아 쓴다.

### 4-2. `src/components/auth/signup-consent-fieldset.tsx` (신규, client)

- props: `value: SignupConsent`, `onChange(next)`, `invalid?: SignupConsentKey[]`, `idPrefix: string`.
- 구조: `<fieldset>` + `<legend>약관 동의</legend>`
  - 「전체 동의」 체크박스 — 셋 다 켜지면 checked, 일부면 `indeterminate`(ref 로 설정). 누르면 셋을 한꺼번에 켜고 끈다. **서버에는 세 필드를 각각 보낸다.**
  - `[필수] 이용약관에 동의합니다` + 「보기」 링크 `LEGAL_HREF` 의 약관 경로
  - `[필수] 개인정보 처리방침에 동의합니다` + 「보기」 링크
  - `[필수] 만 14세 이상입니다`
- 「보기」 링크는 `target="_blank" rel="noopener noreferrer"` 로 연다 — 입력 중인 가입 흐름(인증 완료 상태 포함)을 잃지 않게 한다(#495 요구).
- 오류: `invalid` 에 든 항목은 `aria-invalid` + `aria-describedby` 로 오류 문구를 잇는다. 만 14세 문구는 「만 14세 이상만 가입할 수 있습니다」.
- 스타일: `DESIGN.md` 토큰만 쓴다. 체크박스 선례는 `src/components/profile/profile-ui.tsx`(탈퇴 동의)를 먼저 보고 맞춘다. 체크 영역 포함 터치 타깃 44px 이상. 새 토큰 추가 금지.
- 문구 톤과 레이아웃은 `DESIGN.md` 가입 화면 절(체크박스 = 필수, 버튼은 필수 동의 전 비활성)을 따른다.

### 4-3. 이메일 가입 — `register-machine.ts` · `register-form.tsx`

- `canSubmit(state, form, consent)` 로 인자를 늘리고 `isSignupConsentComplete(consent)` 를 조건에 더한다. 기존 테스트 호출부도 고친다.
- 동의 fieldset 은 **단계와 무관하게 항상 보인다.** 위치는 이름·닉네임 입력 아래, 「가입하기」 버튼 위. 같은 동의를 아래 카카오 버튼도 쓴다(§4-4).
- 가입 요청 바디에 `termsAgreed`·`privacyAgreed`·`ageOver14Confirmed` 를 더한다. **판(version)은 보내지 않는다.**
- 실패 응답의 `resultCode` 가 `signupConsentErrorKey` 로 잡히면 그 체크박스를 `invalid` 로 표시하고 포커스를 옮긴다. 이메일 인증 상태는 건드리지 않는다(동의로 거절돼도 인증은 소비되지 않는다 — 계약 §0-1).

### 4-4. `SocialLogin` 의 가입 모드

- props 를 더한다: `consent?: SignupConsent`, `onConsentIncomplete?: (missing: SignupConsentKey[]) => void`.
- `consent` 가 **주어지면 가입 모드**다.
  - 버튼은 비활성화하지 않는다. 누를 때 `isSignupConsentComplete` 가 아니면 이동하지 않고 `onConsentIncomplete(missing)` 를 부른다. 부모가 해당 체크박스를 `invalid` 로 표시하고 「카카오로 가입하려면 필수 항목에 모두 동의해 주세요.」를 보여 준다.
  - 완료면 `fetch('/api/auth/social/${provider}/authorize' + signupConsentQuery(consent))`.
- `consent` 가 없으면(로그인 화면) 지금처럼 동의 없이 시작한다. 기존 회원은 그대로 로그인되고, 신규면 콜백이 §4-5 로 보낸다.
- 가입 화면(`register-form.tsx`)은 `<SocialLogin consent={consent} onConsentIncomplete={...} />` 로 바꾼다.

### 4-5. 카카오 첫 가입 동의 화면 — `/register/social` (신규)

- 라우트 `app/(auth)/register/social/page.tsx`, 컴포넌트 `src/components/auth/social-signup-consent-page.tsx`. 메타데이터 `index: false`. 로그인 상태 처리는 같은 `(auth)` 그룹의 `/register` 와 같게 한다.
- 쿼리:
  - `provider` — `kakao` 만. 그 밖이면 `/register` 로 보낸다.
  - `reason` — `terms` | `age`. 그 밖이면 `terms` 로 본다.
  - `redirect` — 복귀 경로. `safeReturnPath` 를 거쳐 `SocialLogin returnTo` 로 넘긴다.
- 화면: `AuthShell`
  - eyebrow 「카카오로 가입」, 제목 「약관에 동의하면 가입이 끝나요」
  - `reason=terms`: Notice 「카카오 계정으로 처음 오셨어요. 아래 필수 항목에 동의해 주세요.」
  - `reason=age`: Notice(error) 「만 14세 이상만 가입할 수 있습니다.」 + 만 14세 체크박스를 처음부터 `invalid`
  - `SignupConsentFieldset` + `SocialLogin`(가입 모드). 이 화면에서는 「또는」 구분선을 숨긴다(`showDivider?: boolean` prop, 기본 `true`).
  - 하단 링크: 「이메일로 가입하기」 `/register`, 「로그인으로 돌아가기」 `/login`
- 콜백 수정(`socialCallbackFailure` 만 바꾼다):
  - `AUTH_021` → `/register/social?provider=<provider>&reason=terms`
  - `AUTH_022` → `/register/social?provider=<provider>&reason=age`
  - 둘 다 복귀 경로를 꺼내(쿠키는 지운다) 루트가 아니면 `&redirect=<encodeURIComponent>` 로 붙인다. 동의 화면의 `SocialLogin` 이 다시 쿠키에 남긴다.
  - 인가코드는 1회용이므로 이 화면은 반드시 `/authorize` 부터 다시 시작한다(계약 §0-2). 카카오 앱 동의를 이미 마친 사용자는 대개 곧바로 콜백으로 돌아온다.

### 4-6. 탈퇴 완료 화면 문구 — `account-deleted-page.tsx`

처리방침(`privacy-policy.ts` 제6조 탈퇴 절)과 맞춘다. **사실만 적는다.**

| 위치        | as-is                                                                                         | to-be                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| description | 개인 정보와 기존 세션이 정리되었습니다. 다시 서비스를 이용하려면 새 계정으로 가입해야 합니다. | 이름·닉네임을 지우고 모든 기기에서 로그아웃했습니다.                                                     |
| Notice      | …개인 설정과 로그인 세션은 모두 초기화되었습니다.                                             | 작성한 글과 댓글은 「탈퇴회원」으로 남습니다. 탈퇴한 이메일로는 다시 가입할 수 없습니다. + 처리방침 링크 |
| Footer      | 다시 시작하려면 · 새 계정 만들기                                                              | 다른 이메일로 다시 시작하려면 · 회원가입                                                                 |

> 문구를 쓰기 전에 `privacy-policy.ts` 의 탈퇴 표와 `backend/docs/services/auth-service.md` 탈퇴 절을 다시 확인한다. 어긋나면 처리방침 쪽 사실을 따르고 보고한다. #508(탈퇴 1년 뒤 파기)은 아직 열려 있으니 기간은 적지 않는다.

### 4-7. 테스트

| TC         | 대상                                  | 기대                                                                                                                 |
| ---------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| TC-CON-001 | `signup-consent.ts`                   | 완료 판정, 전체 동의, 누락 목록 순서, 쿼리 문자열, 오류 코드 매핑(114·115·116·010·011·그 밖)                         |
| TC-CON-002 | `register-machine.test.ts`            | 인증·입력이 모두 맞아도 동의 하나가 빠지면 `canSubmit === false`                                                     |
| TC-CON-003 | fieldset `renderToStaticMarkup`       | 체크박스 4개, 약관·처리방침 링크 `target="_blank"`, `invalid` 항목에 `aria-invalid`                                  |
| TC-CON-004 | 동의 화면 `renderToStaticMarkup`      | `reason=age` 면 14세 오류 문구, `reason=terms` 면 안내 문구, 「또는」 없음                                           |
| TC-CON-005 | 콜백 `route.test.ts`                  | `AUTH_021` → `/register/social?provider=kakao&reason=terms`, `AUTH_022` → `reason=age`, 복귀 경로 `redirect` 로 전달 |
| TC-CON-006 | `social-login` 가입 모드(가능한 범위) | 동의 미완료면 fetch 미호출 + 콜백 호출, 완료면 동의 쿼리를 붙여 fetch                                                |

이 저장소의 테스트는 jsdom 없이 node + `renderToStaticMarkup` 문자열 검사다. 상호작용 테스트가 필요하면 기존 `*.interaction.test.ts` 패턴을 먼저 찾아 따른다.

### 4-8. 문서

- `docs/features/auth/register.md` v3.0: D1 흐름에 동의, D4-3 요청 바디 표, D5 에 동의 행(미동의 제출 차단·MEMBER_114~116 처리), D6 「판은 보내지 않는다」, D7 TC-CON.
- `docs/features/auth/social-login.md` v1.2: 가입 모드, `/register/social` 화면, AUTH_021/022/010 분기, D8-3(신규 가입 추가 입력) 해소 여부.
- `docs/features/legal/legal.md` S3: 「가입 시 동의·만 14세 확인」·「account-deleted 문구」 행을 완료로 바꾸고, 「처리방침 동의 기록 항목」을 새 미결 행으로 넣는다(§7-1).
- `docs/features/_index.md` auth 행 한 줄 갱신.

### 4-9. 완료 기준

- `pnpm vitest run` 관련 파일 통과, `pnpm qa:verify` 통과.
- 브라우저: `/register`, `/register/social?provider=kakao&reason=age` 를 390·820·1440 폭에서 확인(체크박스 터치 타깃, 오류 표시, 「보기」 새 탭).

---

## 5. 하위 에이전트 배정

| 단계 | 에이전트                   | 모델   | 맡는 일                                                                         | 비고                                        |
| ---- | -------------------------- | ------ | ------------------------------------------------------------------------------- | ------------------------------------------- |
| 1    | `fe-implementer`           | opus   | PR 1 전체(§3) — 코드·테스트·문서·`qa:verify`·커밋                               | 보안 경계라 Opus. 커밋까지, push·PR 은 메인 |
| 2    | `fe-reviewer` + `reviewer` | opus   | PR 1 diff 검토(보안: 판정 순서, 쿠키 path 삭제, 타이밍 비교, 쿼리 화이트리스트) | 읽기 전용. 둘은 독립이라 병렬               |
| 3    | `fe-implementer`           | opus   | PR 2 전체(§4)                                                                   | PR 1 브랜치 위에서 시작                     |
| 4    | `fe-design-reviewer`       | opus   | PR 2 화면 실측(390·820·1440, 접근성)                                            | 브라우저 프리뷰                             |
| 4    | `fe-reviewer`              | opus   | PR 2 diff 검토                                                                  | 4단계 둘은 병렬                             |
| 5    | `crud-implementer`         | 정의값 | 리뷰 반영 중 주석·문구·가드 몇 줄 수준                                          | 설계 판단이 끼면 메인이 처리                |

**같은 워크트리에서 쓰기 에이전트는 한 번에 하나만** 돈다. PR 1 과 PR 2 구현을 병렬로 돌리지 않는다(같은 콜백 라우트를 고친다).

### 위임 브리프에 반드시 넣을 것

- 이 문서 경로와 맡은 절(§3 또는 §4), §1 결정은 재논의하지 않는다는 것
- 계약 정본 `backend/docs/auth-account-frontend-guide.md` §0
- `pnpm dev`·dev 서버 실행 금지(브라우저 확인은 메인·디자인 리뷰어가 한다). `pnpm qa:verify` 는 구현자만 돌린다
- 백엔드 코드·계약 수정 금지, `DESIGN.md` 수정 금지, 새 토큰 금지
- 커밋은 `[FE] <type>: <한국어>` + `Co-Authored-By` 줄, 기능별로 나눈다. push·PR 생성은 하지 않는다
- 완료 보고: 바꾼 파일, 테스트 수(전/후), `qa:verify` 결과, **명세에서 벗어난 곳과 근거**, 하지 못한 범위

---

## 6. 위험과 대응

| 위험                                                                                    | 대응                                                                                                                                                |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR 1 만 배포되고 PR 2 가 늦으면 신규 카카오 가입자가 `social_signup` 안내만 보고 막힌다 | #528 배포 상태에서는 어차피 막힌다. 안내가 「회원가입에서 동의」로 이끌지만, 그 화면도 PR 2 전에는 동의 필드가 없다 → **두 PR 을 같은 날 머지**한다 |
| 쿠키 삭제 path 불일치로 `social_state` 가 남는다                                        | 콜백 테스트에서 `delete` 인자에 path 가 있는지 고정(TC-SST-001)                                                                                     |
| 로컬 http 개발에서 쿠키가 안 실린다                                                     | `secure` 를 production 에서만 켠다(§1-2)                                                                                                            |
| 사용자가 카카오 탭을 두 개 열어 state 쿠키가 덮인다                                     | 먼저 연 탭은 `social_state` 로 실패하고 다시 시도하면 된다. 문구가 그 경우를 설명한다(§3-5)                                                         |
| 카카오 콘솔 redirect_uri 변경 필요?                                                     | 없다. 콜백 경로(`/api/auth/social/kakao`)는 그대로다                                                                                                |

---

## 7. 미결 (사용자 결정 필요)

1. **처리방침 「동의 기록」 처리 항목 추가 + 판 올림(1.1 → 1.2)** — FE `privacy-policy.ts` 와 BE `legal.privacy-version` 을 같은 배포에 바꿔야 한다. 1.1 은 시행일이 2026-10-09 라 아직 효력 전이지만, 이미 공지된 판의 본문을 바꾸는 것보다 1.2 를 새로 내는 쪽이 맞다. 별도 PR(`[FE]` + `[BE]` 커밋)로 할지 정한다.
   - **사용자 결정: 별도 PR.** 제9조 쿠키 표에 `social_state` 행(HttpOnly, 10분, `/api/auth/social` 한정)을 포함한다. PR 1(#527)은 처리방침 본문을 건드리지 않고, `legal.md` S2 에 「제9조 미반영」으로 적어 둔다.
2. **#528 의 dev 배포 여부** — 배포됐다면 지금 dev 에서 새 가입이 막혀 있다. PR 1·2 머지 전까지 공지할지 정한다.
