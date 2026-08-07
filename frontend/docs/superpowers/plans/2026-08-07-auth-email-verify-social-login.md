# 회원(auth) — 이메일 인증 회원가입 + 소셜 로그인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회원가입을 백엔드가 요구하는 이메일 인증(발송→검증→가입) 3단계로 고치고, 카카오 소셜 로그인을 BFF 세션 방식으로 추가하며, 로그인/가입 화면의 입력 UX·카피를 정리한다.

**Architecture:** 회원가입·이메일 인증은 모두 공개 엔드포인트라 기존 범용 BFF 프록시(`/api/bff/...`)를 그대로 경유한다(새 BFF 라우트 불필요). 소셜 로그인 콜백만 refreshToken 세션 봉인이 필요하므로 로그인 라우트(`app/api/auth/login/route.ts`)와 동형의 **전용 서버 라우트**를 추가한다. 회원가입 화면은 로컬 단계 상태 머신(순수 함수)으로 흐름을 제어한다.

**Tech Stack:** Next.js App Router, TypeScript, styled-components, Vitest(순수 로직·라우트 핸들러), 브라우저 프리뷰(UI 검증).

## Global Constraints

- **DESIGN.md 토큰만 사용** — 임의 색상·radius·shadow·spacing 토큰 추가 금지. 소셜 버튼은 기존 공식 브랜드 이미지 자산(`public/images/KakaoBtnSmall.png` 등)을 재사용한다.
- **비밀번호 정규식은 백엔드와 정확히 동일**: `^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|])\S{8,20}$` (register-form.tsx 기존 `PASSWORD_PATTERN` 유지).
- **브라우저는 백엔드를 직접 호출하지 않는다** — same-origin `/api/bff/*` 또는 전용 라우트만 호출.
- **토큰은 브라우저 JS에 노출 금지** — accessToken/refreshToken은 서버에서만 다루고 암호화 세션쿠키로 봉인.
- **카피 브랜딩은 `BossPickSeoul`로 통일** — `NowDoBoss` 잔존 문구 제거.
- **검증 관문**: `pnpm test` 통과 + `pnpm qa:verify`(format:check·lint·typecheck·build) 통과. 미실행 통과 보고 금지.
- **작업 디렉터리**: `BossPickSeoul/frontend`. 브랜치: `feature/fe/home-redesign-auth`.

### 확정된 백엔드 계약 (dev 실측, 2026-08-07)

| 호출 | 요청 | 성공 | 실패(확인된 코드) |
|---|---|---|---|
| `POST /api/v1/auth/email/send-code` | `{email}` | `Response<Void>` success=true | - |
| `POST /api/v1/auth/email/verify-code` | `{email, code}` | success=true | `AUTH_004` 인증코드 불일치 |
| `POST /api/v1/members/signup` | `{email,password,name,nickname}` | success=true | `MEMBER_006` 이메일 인증 미완료 |
| `GET /api/v1/auth/{provider}/authorize` | - | `Response<{authorizationUrl}>` | - |
| `GET /api/v1/auth/{provider}/login?code&state` | query | `Response<{accessToken,memberId}>` + Set-Cookie(refreshToken) | - |

- 인증 상태는 **백엔드가 서버측에서 이메일 기준으로 기억** → signup 바디에 인증 토큰/플래그 없음. 동일 이메일로 send→verify→signup 순서면 성공.
- ⚠️ dev 카카오 OAuth는 아직 `client_id`/`redirect_uri` 미설정 → 소셜 로그인 **end-to-end 검증은 백엔드 OAuth 설정 완료 후** 가능. FE 구현·단위검증은 이번에 완료한다.

---

## 파일 구조

| 파일 | 책임 | 신규/수정 |
|---|---|---|
| `docs/api/openapi/*.json`, `manifest.json`, `endpoints.md` | OpenAPI 스냅샷 최신화 | 수정(스크립트 생성) |
| `src/lib/api/auth-errors.ts` | resultCode → 필드 분류·문구 헬퍼(순수) | 신규 |
| `src/lib/api/auth-errors.test.ts` | 위 테스트 | 신규 |
| `src/components/auth/register-machine.ts` | 회원가입 단계 상태 머신(순수 함수) | 신규 |
| `src/components/auth/register-machine.test.ts` | 위 테스트 | 신규 |
| `src/components/auth/register-form.tsx` | 이메일 인증 3단계 UI 연결 | 수정(재작성) |
| `app/api/auth/social/[provider]/route.ts` | 소셜 콜백 교환·세션 봉인·리다이렉트 | 신규 |
| `app/api/auth/social/[provider]/route.test.ts` | 위 라우트 테스트 | 신규 |
| `src/components/auth/social-login.tsx` | 소셜 버튼 + authorize 요청/리다이렉트 | 신규 |
| `src/components/auth/login-form.tsx` | 비밀번호 토글·카피·소셜 섹션 연결 | 수정 |
| `src/components/auth/auth-shell.tsx` | 필요 시 프리미티브 추가(PasswordField 등) | 수정(선택) |

---

## Task 1: OpenAPI 스냅샷 최신화 (chore)

**Files:**
- Modify: `docs/api/openapi/auth-member.json` 외 스크립트 생성물

**Interfaces:**
- Produces: 최신 `auth-member.json`(email/social 엔드포인트 포함). 이후 태스크는 이를 참조만 함.

- [ ] **Step 1: 스냅샷 재생성**

Run:
```bash
node scripts/sync-openapi.mjs
```
Expected: `인증/회원: N operations, ...` 로그 출력. `docs/api/openapi/auth-member.json`에 `/auth/email/send-code`, `/auth/email/verify-code`, `/auth/{provider}/authorize`, `/auth/{provider}/login` 경로가 포함됨.

- [ ] **Step 2: 변경 확인**

Run: `git status --short docs/api/openapi`
Expected: `auth-member.json`(및 기타 서비스 스냅샷) 갱신. 네트워크 실패로 스크립트가 에러 나면 이 태스크는 건너뛰고(비차단) 다음 태스크로 진행한다.

- [ ] **Step 3: 커밋**

```bash
git add docs/api/openapi
git commit -m "[FE] chore: OpenAPI 스냅샷 갱신 (인증 이메일 인증·소셜 로그인 반영)"
```

---

## Task 2: 인증 에러 분류 헬퍼 (순수, TDD)

resultCode를 받아 (1) 어떤 입력 필드로 안내할지, (2) 사용자 문구를 반환한다. 백엔드 `resultMessage`가 이미 한국어로 친절하므로 문구는 그대로 쓰되, 특정 코드만 필드 타겟팅을 위해 분류한다.

**Files:**
- Create: `src/lib/api/auth-errors.ts`
- Test: `src/lib/api/auth-errors.test.ts`

**Interfaces:**
- Consumes: `ApiResponse`(`@/types/api`), `getApiMessage`(`@/lib/api/response`)
- Produces:
  - `type AuthErrorField = 'email' | 'code' | 'general'`
  - `classifyAuthError(resultCode: string | null | undefined): AuthErrorField`
  - `getAuthErrorMessage(response, fallback?): string` (= `getApiMessage` 위임)

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/api/auth-errors.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { classifyAuthError, getAuthErrorMessage } from './auth-errors'
import type { ApiResponse } from '@/types/api'

describe('classifyAuthError', () => {
  it('maps code-related resultCodes to the code field', () => {
    expect(classifyAuthError('AUTH_004')).toBe('code')
  })
  it('maps email-verification resultCode to the email field', () => {
    expect(classifyAuthError('MEMBER_006')).toBe('email')
  })
  it('defaults to general for unknown/null codes', () => {
    expect(classifyAuthError('SOMETHING_ELSE')).toBe('general')
    expect(classifyAuthError(null)).toBe('general')
  })
})

describe('getAuthErrorMessage', () => {
  it('returns backend resultMessage when present', () => {
    const res: ApiResponse<null> = {
      dataHeader: {
        success: false,
        resultCode: 'AUTH_004',
        resultMessage: '인증코드가 일치하지 않습니다.',
      },
      dataBody: null,
    }
    expect(getAuthErrorMessage(res)).toBe('인증코드가 일치하지 않습니다.')
  })
  it('falls back when message missing', () => {
    expect(getAuthErrorMessage(null, '기본 오류')).toBe('기본 오류')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run src/lib/api/auth-errors.test.ts`
Expected: FAIL (`auth-errors` 모듈 없음).

- [ ] **Step 3: 구현**

Create `src/lib/api/auth-errors.ts`:
```ts
import type { ApiResponse } from '@/types/api'
import { getApiMessage } from './response'

export type AuthErrorField = 'email' | 'code' | 'general'

// 백엔드 resultCode → 안내할 입력 필드. 확인된 코드만 매핑하고 나머지는 general.
const CODE_FIELD: Record<string, AuthErrorField> = {
  AUTH_004: 'code', // 인증코드 불일치
  AUTH_005: 'code', // 인증코드 만료(추정) — 확인 시 유지, 아니면 무해
  MEMBER_006: 'email', // 이메일 인증 미완료
}

export const classifyAuthError = (
  resultCode: string | null | undefined,
): AuthErrorField =>
  (resultCode && CODE_FIELD[resultCode]) || 'general'

export const getAuthErrorMessage = (
  response: ApiResponse<unknown> | null | undefined,
  fallback?: string,
): string => getApiMessage(response, fallback)
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm exec vitest run src/lib/api/auth-errors.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api/auth-errors.ts src/lib/api/auth-errors.test.ts
git commit -m "[FE] feat: 인증 에러 resultCode 분류·문구 헬퍼"
```

---

## Task 3: 회원가입 단계 상태 머신 (순수, TDD)

회원가입 흐름을 UI에서 분리한 순수 로직으로 만든다. 단계 전이·제출 가능 판정·이메일 변경 시 리셋을 테스트한다.

**Files:**
- Create: `src/components/auth/register-machine.ts`
- Test: `src/components/auth/register-machine.test.ts`

**Interfaces:**
- Produces:
  - `type RegisterStep = 'email-entry' | 'code-sent' | 'verified'`
  - `type RegisterState = { step: RegisterStep; verifiedEmail: string | null }`
  - `const INITIAL_REGISTER_STATE: RegisterState`
  - `onCodeSent(state): RegisterState` — `code-sent`로 전이
  - `onVerified(state, email): RegisterState` — `verified` + `verifiedEmail=email`
  - `onEmailChanged(state, email): RegisterState` — 현재 `verifiedEmail`과 다르면 초기화(`email-entry`, verifiedEmail=null), 같으면 유지
  - `canSubmit(state, form): boolean` — `verified` && form.email===verifiedEmail && 필수필드 유효
  - `EMAIL_PATTERN`, `PASSWORD_PATTERN`, `NAME_MAX_LENGTH`, `NICKNAME_MAX_LENGTH` 재노출(기존 register-form 값과 동일)

- [ ] **Step 1: 실패 테스트 작성**

Create `src/components/auth/register-machine.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  INITIAL_REGISTER_STATE,
  onCodeSent,
  onVerified,
  onEmailChanged,
  canSubmit,
} from './register-machine'

const validForm = {
  email: 'a@b.com',
  password: 'Passw0rd!',
  name: '홍길동',
  nickname: '길동짱',
}

describe('register-machine', () => {
  it('starts at email-entry with no verified email', () => {
    expect(INITIAL_REGISTER_STATE).toEqual({
      step: 'email-entry',
      verifiedEmail: null,
    })
  })

  it('onCodeSent moves to code-sent', () => {
    expect(onCodeSent(INITIAL_REGISTER_STATE).step).toBe('code-sent')
  })

  it('onVerified records the verified email', () => {
    const s = onVerified(onCodeSent(INITIAL_REGISTER_STATE), 'a@b.com')
    expect(s).toEqual({ step: 'verified', verifiedEmail: 'a@b.com' })
  })

  it('onEmailChanged resets when email differs from verified', () => {
    const verified = onVerified(INITIAL_REGISTER_STATE, 'a@b.com')
    expect(onEmailChanged(verified, 'other@b.com')).toEqual(
      INITIAL_REGISTER_STATE,
    )
  })

  it('onEmailChanged keeps state when email unchanged', () => {
    const verified = onVerified(INITIAL_REGISTER_STATE, 'a@b.com')
    expect(onEmailChanged(verified, 'a@b.com')).toEqual(verified)
  })

  it('canSubmit only when verified, email matches, and form valid', () => {
    const verified = onVerified(INITIAL_REGISTER_STATE, 'a@b.com')
    expect(canSubmit(verified, validForm)).toBe(true)
    expect(canSubmit(INITIAL_REGISTER_STATE, validForm)).toBe(false)
    expect(canSubmit(verified, { ...validForm, email: 'x@y.com' })).toBe(false)
    expect(canSubmit(verified, { ...validForm, password: 'weak' })).toBe(false)
    expect(canSubmit(verified, { ...validForm, name: '' })).toBe(false)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run src/components/auth/register-machine.test.ts`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현**

Create `src/components/auth/register-machine.ts`:
```ts
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 백엔드 비밀번호 제약과 정확히 동일(register.md D4-3):
export const PASSWORD_PATTERN = new RegExp(
  String.raw`^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|])\S{8,20}$`,
)
export const NAME_MAX_LENGTH = 10
export const NICKNAME_MAX_LENGTH = 10

export type RegisterStep = 'email-entry' | 'code-sent' | 'verified'
export type RegisterState = {
  step: RegisterStep
  verifiedEmail: string | null
}
export type RegisterForm = {
  email: string
  password: string
  name: string
  nickname: string
}

export const INITIAL_REGISTER_STATE: RegisterState = {
  step: 'email-entry',
  verifiedEmail: null,
}

export const onCodeSent = (state: RegisterState): RegisterState => ({
  ...state,
  step: 'code-sent',
})

export const onVerified = (
  state: RegisterState,
  email: string,
): RegisterState => ({ step: 'verified', verifiedEmail: email })

export const onEmailChanged = (
  state: RegisterState,
  email: string,
): RegisterState =>
  state.verifiedEmail && state.verifiedEmail !== email
    ? INITIAL_REGISTER_STATE
    : state

export const canSubmit = (
  state: RegisterState,
  form: RegisterForm,
): boolean => {
  if (state.step !== 'verified') return false
  if (form.email !== state.verifiedEmail) return false
  const name = form.name.trim()
  const nickname = form.nickname.trim()
  return (
    EMAIL_PATTERN.test(form.email) &&
    PASSWORD_PATTERN.test(form.password) &&
    name.length > 0 &&
    name.length <= NAME_MAX_LENGTH &&
    nickname.length > 0 &&
    nickname.length <= NICKNAME_MAX_LENGTH
  )
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm exec vitest run src/components/auth/register-machine.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/auth/register-machine.ts src/components/auth/register-machine.test.ts
git commit -m "[FE] feat: 회원가입 단계 상태 머신(순수 로직)"
```

---

## Task 4: register-form.tsx — 이메일 인증 3단계 UI

Task 2·3의 헬퍼를 사용해 UI를 재작성한다. 이메일 입력→발송, 코드 입력→검증, 검증 후 나머지 필드 활성화→가입. 재전송 쿨다운(180초), 이메일 변경 리셋, 비밀번호 보기 토글, 카피 BossPickSeoul.

**Files:**
- Modify: `src/components/auth/register-form.tsx` (재작성)
- (선택) Modify: `src/components/auth/auth-shell.tsx` — `SecondaryButton`은 이미 존재. 인라인 발송/확인 버튼은 기존 프리미티브 재사용.

**Interfaces:**
- Consumes: `register-machine`(INITIAL_REGISTER_STATE, onCodeSent, onVerified, onEmailChanged, canSubmit, PATTERN/LENGTH 상수), `auth-errors`(classifyAuthError, getAuthErrorMessage), `AuthShell` 프리미티브, `useAuthStore`(불필요 — 가입 후 로그인 유도), `ApiResponse`.

- [ ] **Step 1: 호출 로직 구현**

`register-form.tsx`를 `'use client'`로 유지하고 다음 3개의 async 핸들러를 구현한다. 모두 `/api/bff/...` 경유.

```ts
// 인증코드 발송
const res = await fetch('/api/bff/auth/email/send-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
})
const data = (await res.json().catch(() => null)) as ApiResponse<unknown> | null
if (res.ok && data?.dataHeader?.success) {
  setState(onCodeSent) // + 쿨다운 시작
} else {
  setError(getAuthErrorMessage(data, '인증코드 발송에 실패했습니다.'))
}
```
```ts
// 인증코드 검증
const res = await fetch('/api/bff/auth/email/verify-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, code }),
})
const data = (await res.json().catch(() => null)) as ApiResponse<unknown> | null
if (res.ok && data?.dataHeader?.success) {
  setState(s => onVerified(s, email))
} else {
  setError(getAuthErrorMessage(data, '인증코드 확인에 실패했습니다.'))
}
```
```ts
// 가입 (기존 로직 유지, 엔드포인트 동일)
const res = await fetch('/api/bff/members/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, name: name.trim(), nickname: nickname.trim() }),
})
const data = (await res.json().catch(() => null)) as ApiResponse<unknown> | null
if (res.ok && data?.dataHeader?.success) { router.replace('/login') ; return }
setError(getAuthErrorMessage(data, '가입에 실패했습니다.'))
```

- [ ] **Step 2: UI 상태·게이팅 구현**

- 이메일 필드 onChange 시 `setState(s => onEmailChanged(s, next))`로 리셋 판정.
- `state.step === 'email-entry'`: 이메일 + "인증코드 발송" 버튼만.
- `state.step === 'code-sent'`: 이메일(수정 가능) + 코드 입력 + "인증 확인" + 재전송 쿨다운 표시(남은 초, 0이면 재발송 가능).
- `state.step === 'verified'`: 이메일/코드 잠금(`readOnly`) + 성공 `Notice`($tone="success") "이메일 인증 완료" + 비밀번호/이름/닉네임 활성화 + "회원가입" 버튼.
- 가입 버튼 `disabled = !canSubmit(state, form) || isSubmitting`.
- 에러 표시: `classifyAuthError(data?.dataHeader?.resultCode)`가 `'code'`면 코드 필드 근처, `'email'`이면 이메일 근처, 그 외 상단 `Notice`.
- 비밀번호 보기 토글: `type`을 `password`/`text` 토글하는 버튼(aria-label "비밀번호 표시/숨기기").

- [ ] **Step 3: 쿨다운 타이머**

`useEffect` + `setInterval`로 남은 초 감소. 언마운트/재발송 시 정리. 초기값 180. 표시: "재전송 (NN초)" 비활성 → 0에서 "인증코드 재전송" 활성.

- [ ] **Step 4: 카피 정리**

`AuthShell` title `"NowDoBoss 계정을 시작합니다."` → `"BossPickSeoul 계정을 시작합니다."`, description은 이메일 인증 안내 포함 문구로 갱신. 저장소 전체에서 잔존 `NowDoBoss` 사용자 노출 문구 확인:
Run: `git grep -n "NowDoBoss" src app | grep -viE "test|legacy|comment"`
필요 시 사용자 노출 문구만 교정(코드 식별자·주석은 제외).

- [ ] **Step 5: 브라우저 검증(실 dev API)**

`.env.local`에 `BACKEND_API_URL`/`AUTH_SESSION_SECRET` 설정 후 dev 서버로 검증. **본인이 수신 가능한 실제 이메일**로:
1. preview_start `{name}` 로 dev 서버 기동, `/register` 이동.
2. 이메일 입력 → 발송 → 받은 코드 입력 → 확인 → 나머지 입력 → 가입 → `/login` 이동 확인.
3. read_console_messages / read_network_requests 로 오류 없음, 각 호출 200·success 확인.
4. 이메일 변경 시 리셋, 미인증 상태 버튼 비활성, 쿨다운 동작 스크린샷.

> 실제 수신 이메일이 없으면 send/verify UI 전이와 에러 경로(AUTH_004 오답 코드)까지 검증하고, 최종 signup 성공은 사용자 확인 요청.

- [ ] **Step 6: 커밋**

```bash
git add src/components/auth/register-form.tsx src/components/auth/auth-shell.tsx
git commit -m "[FE] feat: 회원가입 이메일 인증 3단계 UI + 비밀번호 토글·카피 정리"
```

---

## Task 5: 소셜 로그인 콜백 서버 라우트 (TDD)

`app/api/auth/login/route.ts`와 동형. provider 화이트리스트, 백엔드 콜백 호출, refreshToken 세션 봉인, 리다이렉트.

**Files:**
- Create: `app/api/auth/social/[provider]/route.ts`
- Test: `app/api/auth/social/[provider]/route.test.ts`

**Interfaces:**
- Consumes: `getServerEnv`, `setSession`, `extractCookieValue`, `isApiSuccess`, `ApiResponse`
- Produces: `GET(request, ctx)` — 성공 시 302 `/`, 실패 시 302 `/login?error=social`

- [ ] **Step 1: 실패 테스트 작성**

Create `app/api/auth/social/[provider]/route.test.ts` (login route.test.ts 패턴):
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const setSession = vi.fn()
vi.mock('@/lib/auth/session', () => ({ setSession }))
vi.mock('next/headers', () => ({
  cookies: async () => ({ set: vi.fn(), get: vi.fn(), delete: vi.fn() }),
}))

beforeEach(() => {
  process.env.AUTH_SESSION_SECRET = 'test-secret-key-at-least-32-chars-long!!'
  process.env.BACKEND_API_URL = 'http://backend:8080'
  setSession.mockReset()
})

const ctx = (provider: string) => ({ params: Promise.resolve({ provider }) })

describe('GET /api/auth/social/[provider]', () => {
  it('exchanges code/state, seals session, redirects to /', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          dataHeader: { success: true, resultCode: null, resultMessage: null },
          dataBody: { accessToken: 'a.t.k', memberId: '7' },
        }),
        { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': 'refreshToken=r.t.k; Path=/; HttpOnly' } },
      ),
    )
    const { GET } = await import('./route')
    const res = await GET(new Request('http://x/api/auth/social/kakao?code=c&state=s'), ctx('kakao'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://x/')
    expect(setSession).toHaveBeenCalledWith({ accessToken: 'a.t.k', refreshToken: 'r.t.k', memberId: '7' })
  })

  it('rejects providers outside the whitelist', async () => {
    const { GET } = await import('./route')
    const res = await GET(new Request('http://x/api/auth/social/evil?code=c&state=s'), ctx('evil'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://x/login?error=social')
    expect(setSession).not.toHaveBeenCalled()
  })

  it('redirects to /login?error=social on backend failure', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ dataHeader: { success: false, resultCode: 'AUTH_010', resultMessage: '실패' }, dataBody: null }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    const { GET } = await import('./route')
    const res = await GET(new Request('http://x/api/auth/social/kakao?code=c&state=s'), ctx('kakao'))
    expect(res.headers.get('location')).toBe('http://x/login?error=social')
    expect(setSession).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run "app/api/auth/social/[provider]/route.test.ts"`
Expected: FAIL (라우트 없음).

- [ ] **Step 3: 구현**

Create `app/api/auth/social/[provider]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import { setSession } from '@/lib/auth/session'
import { extractCookieValue } from '@/lib/auth/set-cookie'
import { isApiSuccess } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'

type LoginBody = { accessToken: string; memberId: string }
const PROVIDERS = new Set(['kakao']) // google/naver는 백엔드 준비 후 추가

export async function GET(
  request: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params
  const url = new URL(request.url)
  const fail = () =>
    NextResponse.redirect(new URL('/login?error=social', url))

  if (!PROVIDERS.has(provider)) return fail()

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) return fail()

  const { backendApiUrl } = getServerEnv()
  const upstream = await fetch(
    `${backendApiUrl}/api/v1/auth/${provider}/login?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    { method: 'GET', headers: { Accept: 'application/json' } },
  )
  const data = (await upstream.json().catch(() => null)) as
    | ApiResponse<LoginBody>
    | null

  if (!upstream.ok || !isApiSuccess(data) || !data?.dataBody) return fail()

  const setCookie =
    upstream.headers.getSetCookie?.() ?? upstream.headers.get('set-cookie')
  const refreshToken = extractCookieValue(setCookie, 'refreshToken')
  if (!refreshToken) return fail()

  await setSession({
    accessToken: data.dataBody.accessToken,
    refreshToken,
    memberId: data.dataBody.memberId,
  })
  return NextResponse.redirect(new URL('/', url))
}
```

> `NextResponse.redirect`는 기본 307. 테스트의 status 기대값(307)과 일치.

- [ ] **Step 4: 통과 확인**

Run: `pnpm exec vitest run "app/api/auth/social/[provider]/route.test.ts"`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add "app/api/auth/social/[provider]/route.ts" "app/api/auth/social/[provider]/route.test.ts"
git commit -m "[FE] feat: 소셜 로그인 콜백 서버 라우트(세션 봉인)"
```

---

## Task 6: 소셜 버튼 컴포넌트 + 로그인/가입 화면 연결

authorize URL을 받아 리다이렉트하는 클라이언트 컴포넌트를 만들고 로그인·가입 화면에 붙인다. 로그인 화면 비밀번호 토글·에러 안내(`?error=social`)도 정리.

**Files:**
- Create: `src/components/auth/social-login.tsx`
- Modify: `src/components/auth/login-form.tsx`
- (선택) Modify: `src/components/auth/register-form.tsx` (하단에 동일 소셜 섹션)

**Interfaces:**
- Consumes: `Divider`(auth-shell), 브랜드 이미지 `public/images/KakaoBtnSmall.png`
- Produces: `default function SocialLogin()` — "또는" 구분선 + 카카오 버튼. onClick 시 authorize 요청.

- [ ] **Step 1: 소셜 컴포넌트 구현**

Create `src/components/auth/social-login.tsx` (`'use client'`):
```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import styled from 'styled-components'
import { Divider } from '@/components/auth/auth-shell'
import type { ApiResponse } from '@/types/api'

const PROVIDERS = [
  { id: 'kakao', label: '카카오로 계속하기', img: '/images/KakaoBtnSmall.png' },
] as const

const List = styled.div`
  display: grid;
  gap: 8px;
`
const ProviderButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  cursor: pointer;
  &:disabled { cursor: not-allowed; opacity: var(--button-disabled-opacity-color); }
`

export default function SocialLogin() {
  const [busy, setBusy] = useState<string | null>(null)
  const start = async (provider: string) => {
    setBusy(provider)
    try {
      const res = await fetch(`/api/bff/auth/${provider}/authorize`)
      const data = (await res.json().catch(() => null)) as
        | ApiResponse<{ authorizationUrl: string }>
        | null
      const url = data?.dataBody?.authorizationUrl
      if (res.ok && data?.dataHeader?.success && url) {
        window.location.href = url
        return
      }
      setBusy(null)
    } catch {
      setBusy(null)
    }
  }
  return (
    <>
      <Divider>또는</Divider>
      <List>
        {PROVIDERS.map(p => (
          <ProviderButton key={p.id} type="button" onClick={() => start(p.id)} disabled={busy !== null}>
            <Image src={p.img} alt="" width={20} height={20} aria-hidden />
            {p.label}
          </ProviderButton>
        ))}
      </List>
    </>
  )
}
```

> 브랜드 이미지 규격상 별도 색상 토큰을 만들지 않는다. 이미지가 버튼 전체 규격이면 `ProviderButton` 대신 이미지 버튼만 사용해도 됨 — 자산 크기 확인 후 택1.

- [ ] **Step 2: 로그인 화면 연결**

`login-form.tsx`: `<AuthForm>` 아래에 `<SocialLogin />` 삽입. 비밀번호 보기 토글 추가(register와 동일 패턴). `useSearchParams().get('error') === 'social'`이면 상단 `Notice($tone="error")` "소셜 로그인에 실패했습니다. 다시 시도해 주세요." 표시.

- [ ] **Step 3: (선택) 가입 화면 연결**

`register-form.tsx` 하단 FooterRow 위에 `<SocialLogin />` 삽입(일관성). 스코프 넘치면 생략 가능 — 로그인 화면만으로 충분.

- [ ] **Step 4: 브라우저 검증**

dev 서버에서 `/login` 진입 → 카카오 버튼 클릭 → `/api/bff/auth/kakao/authorize` 200 확인 → `kauth.kakao.com`으로 리다이렉트 시도 확인(네트워크 로그). **dev OAuth 미설정(client_id/redirect_uri 공백)으로 카카오 화면 완료는 불가** — 요청·리다이렉트 발생까지만 검증하고 로그로 근거 남김. `?error=social` 진입 시 에러 배너 표시 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/components/auth/social-login.tsx src/components/auth/login-form.tsx src/components/auth/register-form.tsx
git commit -m "[FE] feat: 카카오 소셜 로그인 버튼·에러 안내 연결"
```

---

## Task 7: 전체 검증 & 문서 상태 갱신

**Files:**
- Modify: `docs/features/_index.md`(auth 상태), `docs/features/auth/social-login.md`(D8 실측 결과 반영)

- [ ] **Step 1: 단위 테스트 전체**

Run: `pnpm test`
Expected: 모든 테스트 PASS(신규 auth-errors, register-machine, social route 포함).

- [ ] **Step 2: 품질 관문**

Run: `pnpm qa:verify`
Expected: format:check·lint·typecheck·build 모두 PASS. 실패 시 수정 후 재실행.

- [ ] **Step 3: 실측 결과를 명세에 반영**

`social-login.md` D8-1(redirect_uri)·D8-2(provider) 상태를 실측 결과(dev OAuth 미설정)로 갱신. `register.md` D8-1(인증 상태 전달)을 "dev 실측: 서버측 이메일 기억 방식 확인"으로 확정. `_index.md`의 auth 행 비고 갱신.

- [ ] **Step 4: 커밋**

```bash
git add docs/features
git commit -m "[FE] docs: 인증 구현 실측 결과·상태 반영"
```

---

## Self-Review (작성자 점검 결과)

- **Spec coverage**: register.md(D4-1~3, D5, D7) → Task 3·4 / social-login.md(D4-1~2, D6 provider 화이트리스트) → Task 5·6 / auth.md S2 #7(Response 래퍼 보존) → Task 2 / 카피·UX → Task 4·6 / 검증 → Task 7. 실시간 중복확인(register D8-3)은 백엔드 미지원으로 범위 외 유지.
- **Placeholder scan**: 모든 코드 스텝에 실제 코드 포함. "적절한 에러처리" 류 없음.
- **Type consistency**: `RegisterState`/`RegisterStep`/`canSubmit`/`onEmailChanged` 시그니처가 Task 3 정의와 Task 4 사용에서 일치. 라우트 `GET(request, ctx)` 시그니처가 테스트와 일치.
- **열린 항목**: 소셜 end-to-end는 백엔드 OAuth 설정 의존(비차단, Task 6에서 요청·리다이렉트까지 검증). 최종 signup 성공은 실 수신 이메일 필요(Task 4에서 사용자 확인 경로 명시).
