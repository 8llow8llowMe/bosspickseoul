# Auth (BFF Session) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BossPickSeoul FE의 인증을 Next 서버 기반 BFF 세션으로 구현한다 — 브라우저는 토큰을 보지 못하고, Next가 암호화 HttpOnly 쿠키로 토큰을 보관하며 server-to-server로 게이트웨이를 호출한다.

**Architecture:** 로그인 시 Next 라우트 핸들러가 백엔드 토큰(access=body, refresh=Set-Cookie)을 캡처해 jose로 암호화한 세션 쿠키에 봉인한다. 모든 데이터 호출은 catch-all 프록시 `/api/bff/[...path]`를 경유하며, 프록시가 Bearer 주입·401 재발급·1회 재시도를 담당한다. 미들웨어가 보호 라우트 가드를, `/members/me`가 세션 복원을 수행한다.

**Tech Stack:** Next.js 16 App Router, TypeScript, jose(JWE), vitest(신규 테스트 러너), axios(client, baseURL=/api/bff), zustand, styled-components.

## Global Constraints

- 명세 정본: [auth 공통](../../features/auth/auth.md), [session-bff 세부](../../features/auth/session-bff.md), [login](../../features/auth/login.md), [register](../../features/auth/register.md). 횡단 규칙: [data-fetching-rules](../../engineering/data-fetching-rules.md).
- 토큰(access/refresh)은 **브라우저 JS·localStorage·sessionStorage에 절대 저장하지 않는다.** Next 서버의 암호화 HttpOnly·Secure·SameSite=Lax 세션 쿠키에만 존재한다.
- 백엔드 계약(코드 확인): `POST /api/v1/auth/login` `{email,password}` → `{dataHeader,{accessToken,memberId}}` + `Set-Cookie: refreshToken`(HttpOnly). `POST /api/v1/auth/logout`(Bearer). `POST /api/v1/auth/token/reissue`(refreshToken 쿠키) → `{accessToken}` + rotate. `POST /api/v1/members/signup` `{email,password,name,nickname}`. `GET /api/v1/members/me`(Bearer) → `{memberId,email,name,nickname,profileImageUrl,roleCode,roleDescription}`.
- 응답 래퍼: `{ dataHeader: { success: boolean, resultCode: string|null, resultMessage: object|string|null }, dataBody: T }`. **성공 판별 = `dataHeader.success === true`.**
- 비밀번호 규칙(백엔드와 동일): 공백 없이 영문자+숫자+특수문자 포함 8~20자. 이름/닉네임 각 필수·최대 10자. 이메일 형식 필수.
- 백엔드 API 계약 변경 금지. 임의 엔드포인트 생성 금지(소셜 로그인·이메일 인증은 명세 D8 미결로 구현 제외).
- 커밋 컨벤션: `[FE] ...` (Co-Authored-By 없음). 브랜치 `feature/fe/auth`.
- 검증: `pnpm qa:verify`(format:check+lint+typecheck+build) + `pnpm test`(신규).
- 작업 디렉터리: `BossPickSeoul/frontend/`. 저장소 루트(git): `BossPickSeoul/`.

---

### Task 1: 인프라 — 의존성·서버 env·vitest

**Files:**
- Modify: `frontend/package.json` (deps, scripts)
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/lib/env.server.ts`
- Create: `frontend/src/lib/env.server.test.ts`

**Interfaces:**
- Produces: `serverEnv.authSessionSecret: string`, `serverEnv.backendApiUrl: string` (server-only). `pnpm test` 동작.

- [ ] **Step 1: 의존성 추가**

Run:
```bash
cd BossPickSeoul/frontend
pnpm add jose
pnpm add -D vitest
```
Expected: `jose`가 dependencies에, `vitest`가 devDependencies에 추가.

- [ ] **Step 2: test 스크립트 추가**

`package.json`의 `scripts`에 추가:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: vitest 설정 생성**

`frontend/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

- [ ] **Step 4: 서버 env 실패 테스트 작성**

`frontend/src/lib/env.server.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('serverEnv', () => {
  const OLD = process.env
  beforeEach(() => {
    process.env = { ...OLD }
  })
  afterEach(() => {
    process.env = OLD
  })

  it('reads AUTH_SESSION_SECRET and backend url', async () => {
    process.env.AUTH_SESSION_SECRET = 'x'.repeat(32)
    process.env.BACKEND_API_URL = 'http://gw:8080/'
    const { getServerEnv } = await import('./env.server')
    const env = getServerEnv()
    expect(env.authSessionSecret).toHaveLength(32)
    expect(env.backendApiUrl).toBe('http://gw:8080') // trailing slash trimmed
  })

  it('throws when AUTH_SESSION_SECRET missing', async () => {
    delete process.env.AUTH_SESSION_SECRET
    const { getServerEnv } = await import('./env.server')
    expect(() => getServerEnv()).toThrow(/AUTH_SESSION_SECRET/)
  })
})
```

- [ ] **Step 5: 테스트 실패 확인**

Run: `cd BossPickSeoul/frontend && pnpm test`
Expected: FAIL — `./env.server` 모듈 없음.

- [ ] **Step 6: env.server.ts 구현**

`frontend/src/lib/env.server.ts`:
```ts
import 'server-only'

const trimSlash = (v: string) => (v.endsWith('/') ? v.slice(0, -1) : v)

export type ServerEnv = {
  authSessionSecret: string
  backendApiUrl: string
}

export const getServerEnv = (): ServerEnv => {
  const secret = process.env.AUTH_SESSION_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SESSION_SECRET must be set (>=32 chars) for BFF session encryption',
    )
  }
  const backend =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    'http://localhost:8080'
  return { authSessionSecret: secret, backendApiUrl: trimSlash(backend) }
}
```
> `server-only`는 이 모듈이 클라이언트 번들에 포함되면 빌드 에러를 낸다(토큰 시크릿 유출 방지).

- [ ] **Step 7: 테스트 통과 확인**

Run: `cd BossPickSeoul/frontend && pnpm test`
Expected: PASS (2 tests). `server-only` 미설치 시 `pnpm add server-only`.

- [ ] **Step 8: .env.local.example 갱신 + 커밋**

`.env.local`에 `AUTH_SESSION_SECRET`, `BACKEND_API_URL` 항목 문서화(값은 예시). 그다음:
```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/vitest.config.ts frontend/src/lib/env.server.ts frontend/src/lib/env.server.test.ts
git commit -m "[FE] chore(auth): add jose, vitest, server-only env for BFF"
```

---

### Task 2: 응답 래퍼 타입·파싱 (신규 백엔드 shape)

**Files:**
- Modify: `frontend/src/types/api.ts`
- Modify: `frontend/src/lib/api/response.ts`
- Create: `frontend/src/lib/api/response.test.ts`

**Interfaces:**
- Produces: `ApiResponse<T> = { dataHeader: { success: boolean; resultCode: string | null; resultMessage: ApiMessage }; dataBody: T }`; `isApiSuccess(res): boolean`; `getApiMessage(res, fallback?): string`.

- [ ] **Step 1: 실패 테스트 작성**

`frontend/src/lib/api/response.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isApiSuccess, getApiMessage } from './response'
import type { ApiResponse } from '@/types/api'

const ok: ApiResponse<{ x: number }> = {
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: { x: 1 },
}
const fail: ApiResponse<null> = {
  dataHeader: { success: false, resultCode: 'AUTH_001', resultMessage: '자격 증명이 올바르지 않습니다.' },
  dataBody: null,
}

describe('response', () => {
  it('isApiSuccess reads dataHeader.success', () => {
    expect(isApiSuccess(ok)).toBe(true)
    expect(isApiSuccess(fail)).toBe(false)
    expect(isApiSuccess(null)).toBe(false)
  })
  it('getApiMessage returns backend message or fallback', () => {
    expect(getApiMessage(fail)).toBe('자격 증명이 올바르지 않습니다.')
    expect(getApiMessage(ok, '기본')).toBe('기본')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd BossPickSeoul/frontend && pnpm test src/lib/api/response.test.ts`
Expected: FAIL — 기존 `response.ts`가 `successCode`를 참조.

- [ ] **Step 3: types/api.ts 교체**

`frontend/src/types/api.ts`:
```ts
export type ApiMessage = string | Record<string, string> | null

export type ApiDataHeader = {
  success: boolean
  resultCode: string | null
  resultMessage: ApiMessage
}

export type ApiResponse<T> = {
  dataHeader: ApiDataHeader
  dataBody: T
}
```

- [ ] **Step 4: response.ts 교체**

`frontend/src/lib/api/response.ts`:
```ts
import type { ApiMessage, ApiResponse } from '@/types/api'

export const isApiSuccess = <T>(response: ApiResponse<T> | null | undefined) =>
  response?.dataHeader.success === true

const normalizeApiMessage = (message: ApiMessage | undefined) => {
  if (!message) return null
  if (typeof message === 'string') return message
  return Object.values(message).join('\n')
}

export const getApiMessage = (
  response: ApiResponse<unknown> | null | undefined,
  fallback = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
) => normalizeApiMessage(response?.dataHeader.resultMessage) ?? fallback
```
> fallback 문구는 금지 카피(`문제가 발생했습니다`) 회피 — DESIGN.md 카피 규칙 준수.

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd BossPickSeoul/frontend && pnpm test src/lib/api/response.test.ts`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/types/api.ts frontend/src/lib/api/response.ts frontend/src/lib/api/response.test.ts
git commit -m "[FE] refactor(auth): response wrapper to new dataHeader.success shape"
```

---

### Task 3: 세션 암·복호화 + 쿠키 (jose)

**Files:**
- Create: `frontend/src/lib/auth/session.ts`
- Create: `frontend/src/lib/auth/session.test.ts`

**Interfaces:**
- Produces:
  - `type SessionPayload = { accessToken: string; refreshToken: string; memberId: string }`
  - `encryptSession(payload: SessionPayload): Promise<string>`
  - `decryptSession(token: string): Promise<SessionPayload | null>` (변조/만료 시 null)
  - `SESSION_COOKIE = 'bps_session'`
  - `getSession(): Promise<SessionPayload | null>` / `setSession(p): Promise<void>` / `clearSession(): Promise<void>` (next/headers cookies)

- [ ] **Step 1: 암복호화 실패 테스트 작성**

`frontend/src/lib/auth/session.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'

beforeEach(() => {
  process.env.AUTH_SESSION_SECRET = 'test-secret-key-at-least-32-chars-long!!'
  process.env.BACKEND_API_URL = 'http://localhost:8080'
})

describe('session crypto', () => {
  it('encrypt then decrypt roundtrips payload', async () => {
    const { encryptSession, decryptSession } = await import('./session')
    const p = { accessToken: 'a', refreshToken: 'r', memberId: '1' }
    const token = await encryptSession(p)
    expect(typeof token).toBe('string')
    expect(await decryptSession(token)).toEqual(p)
  })
  it('returns null on tampered token', async () => {
    const { decryptSession } = await import('./session')
    expect(await decryptSession('not-a-valid-jwe')).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd BossPickSeoul/frontend && pnpm test src/lib/auth/session.test.ts`
Expected: FAIL — `./session` 없음.

- [ ] **Step 3: session.ts 구현**

`frontend/src/lib/auth/session.ts`:
```ts
import 'server-only'
import { EncryptJWT, jwtDecrypt } from 'jose'
import { createHash } from 'node:crypto'
import { cookies } from 'next/headers'
import { getServerEnv } from '@/lib/env.server'

export type SessionPayload = {
  accessToken: string
  refreshToken: string
  memberId: string
}

export const SESSION_COOKIE = 'bps_session'

const secretKey = () =>
  createHash('sha256').update(getServerEnv().authSessionSecret).digest() // 32 bytes for A256GCM

export const encryptSession = async (payload: SessionPayload): Promise<string> =>
  new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .encrypt(secretKey())

export const decryptSession = async (
  token: string,
): Promise<SessionPayload | null> => {
  try {
    const { payload } = await jwtDecrypt(token, secretKey())
    const { accessToken, refreshToken, memberId } = payload as Record<string, unknown>
    if (
      typeof accessToken === 'string' &&
      typeof refreshToken === 'string' &&
      typeof memberId === 'string'
    ) {
      return { accessToken, refreshToken, memberId }
    }
    return null
  } catch {
    return null
  }
}

export const getSession = async (): Promise<SessionPayload | null> => {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value
  return raw ? decryptSession(raw) : null
}

export const setSession = async (payload: SessionPayload): Promise<void> => {
  const token = await encryptSession(payload)
  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

export const clearSession = async (): Promise<void> => {
  ;(await cookies()).delete(SESSION_COOKIE)
}
```
> `alg: 'dir'` + `A256GCM` = 대칭 직접 암호화. 시크릿을 sha256으로 32바이트 키로 정규화.

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd BossPickSeoul/frontend && pnpm test src/lib/auth/session.test.ts`
Expected: PASS (2 tests). `getSession/setSession`은 next/headers 의존이라 여기선 crypto만 테스트.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/lib/auth/session.ts frontend/src/lib/auth/session.test.ts
git commit -m "[FE] feat(auth): encrypted session (jose JWE) + cookie helpers"
```

---

### Task 4: Set-Cookie 파싱 유틸

**Files:**
- Create: `frontend/src/lib/auth/set-cookie.ts`
- Create: `frontend/src/lib/auth/set-cookie.test.ts`

**Interfaces:**
- Produces: `extractCookieValue(setCookieHeaders: string[] | string | null, name: string): string | null`

- [ ] **Step 1: 실패 테스트 작성**

`frontend/src/lib/auth/set-cookie.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { extractCookieValue } from './set-cookie'

describe('extractCookieValue', () => {
  it('extracts named cookie from array of set-cookie headers', () => {
    const headers = [
      'refreshToken=abc.def.ghi; Path=/; HttpOnly; Secure; SameSite=Lax',
      'other=zzz; Path=/',
    ]
    expect(extractCookieValue(headers, 'refreshToken')).toBe('abc.def.ghi')
  })
  it('returns null when cookie absent', () => {
    expect(extractCookieValue(['x=1'], 'refreshToken')).toBeNull()
    expect(extractCookieValue(null, 'refreshToken')).toBeNull()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `cd BossPickSeoul/frontend && pnpm test src/lib/auth/set-cookie.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`frontend/src/lib/auth/set-cookie.ts`:
```ts
export const extractCookieValue = (
  setCookieHeaders: string[] | string | null,
  name: string,
): string | null => {
  if (!setCookieHeaders) return null
  const list = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : [setCookieHeaders]
  for (const header of list) {
    const first = header.split(';', 1)[0]?.trim() ?? ''
    const eq = first.indexOf('=')
    if (eq === -1) continue
    if (first.slice(0, eq) === name) return first.slice(eq + 1)
  }
  return null
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd BossPickSeoul/frontend && pnpm test src/lib/auth/set-cookie.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/lib/auth/set-cookie.ts frontend/src/lib/auth/set-cookie.test.ts
git commit -m "[FE] feat(auth): Set-Cookie value extractor"
```

---

### Task 5: 로그인 라우트 핸들러 `/api/auth/login`

**Files:**
- Create: `frontend/app/api/auth/login/route.ts`
- Create: `frontend/app/api/auth/login/route.test.ts`

**Interfaces:**
- Consumes: `setSession` (Task 3), `extractCookieValue` (Task 4), `getServerEnv` (Task 1), `isApiSuccess`/`getApiMessage` (Task 2).
- Produces: `POST /api/auth/login` — body `{email,password}` → 200 `{memberId}` (성공) / 4xx `{message}` (실패). 세션 쿠키 설정.

- [ ] **Step 1: 실패 테스트 작성 (fetch 모킹)**

`frontend/app/api/auth/login/route.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const setSession = vi.fn()
vi.mock('@/lib/auth/session', () => ({ setSession }))
vi.mock('next/headers', () => ({ cookies: async () => ({ set: vi.fn(), get: vi.fn(), delete: vi.fn() }) }))

beforeEach(() => {
  process.env.AUTH_SESSION_SECRET = 'test-secret-key-at-least-32-chars-long!!'
  process.env.BACKEND_API_URL = 'http://backend:8080'
  setSession.mockReset()
})

describe('POST /api/auth/login', () => {
  it('on backend success, seals session and returns memberId', async () => {
    const setCookie = 'refreshToken=r.t.k; Path=/; HttpOnly'
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ dataHeader: { success: true, resultCode: null, resultMessage: null }, dataBody: { accessToken: 'a.t.k', memberId: '42' } }),
        { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': setCookie } },
      ),
    )
    const { POST } = await import('./route')
    const res = await POST(new Request('http://x/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'a@b.com', password: 'Passw0rd!' }) }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ memberId: '42' })
    expect(setSession).toHaveBeenCalledWith({ accessToken: 'a.t.k', refreshToken: 'r.t.k', memberId: '42' })
  })

  it('on backend failure, returns 401 with message and no session', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ dataHeader: { success: false, resultCode: 'AUTH_001', resultMessage: '이메일 또는 비밀번호가 올바르지 않습니다.' }, dataBody: null }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      ),
    )
    const { POST } = await import('./route')
    const res = await POST(new Request('http://x/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'a@b.com', password: 'x' }) }))
    expect(res.status).toBe(401)
    expect((await res.json()).message).toContain('올바르지')
    expect(setSession).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `cd BossPickSeoul/frontend && pnpm test app/api/auth/login/route.test.ts`
Expected: FAIL — route 없음.

- [ ] **Step 3: 구현**

`frontend/app/api/auth/login/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import { setSession } from '@/lib/auth/session'
import { extractCookieValue } from '@/lib/auth/set-cookie'
import { isApiSuccess, getApiMessage } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'

type LoginBody = { accessToken: string; memberId: string }

export async function POST(request: Request) {
  const { backendApiUrl } = getServerEnv()
  const credentials = await request.json()

  const upstream = await fetch(`${backendApiUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  const data = (await upstream.json()) as ApiResponse<LoginBody>

  if (!upstream.ok || !isApiSuccess(data) || !data.dataBody) {
    return NextResponse.json(
      { message: getApiMessage(data, '로그인에 실패했습니다.') },
      { status: upstream.status === 200 ? 401 : upstream.status },
    )
  }

  const setCookie = upstream.headers.getSetCookie?.() ?? upstream.headers.get('set-cookie')
  const refreshToken = extractCookieValue(setCookie, 'refreshToken')
  if (!refreshToken) {
    return NextResponse.json({ message: '세션 초기화에 실패했습니다.' }, { status: 502 })
  }

  await setSession({
    accessToken: data.dataBody.accessToken,
    refreshToken,
    memberId: data.dataBody.memberId,
  })

  return NextResponse.json({ memberId: data.dataBody.memberId }, { status: 200 })
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd BossPickSeoul/frontend && pnpm test app/api/auth/login/route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: 커밋**

```bash
git add frontend/app/api/auth/login
git commit -m "[FE] feat(auth): /api/auth/login route seals BFF session"
```

---

### Task 6: BFF 프록시 `/api/bff/[...path]` + 401 재발급·재시도

**Files:**
- Create: `frontend/src/lib/auth/reissue.ts`
- Create: `frontend/src/lib/auth/reissue.test.ts`
- Create: `frontend/app/api/bff/[...path]/route.ts`

**Interfaces:**
- Consumes: `getSession`/`setSession`/`clearSession` (Task 3), `extractCookieValue` (Task 4), `getServerEnv`.
- Produces:
  - `reissueSession(current: SessionPayload, backendApiUrl: string, fetchImpl?): Promise<SessionPayload | null>` — refresh로 access 재발급, 실패 시 null.
  - route: `GET/POST/PUT/PATCH/DELETE /api/bff/*` → 게이트웨이 포워드, 401 시 1회 재발급·재시도.

- [ ] **Step 1: reissue 실패 테스트 작성**

`frontend/src/lib/auth/reissue.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { reissueSession } from './reissue'

const current = { accessToken: 'old', refreshToken: 'r1', memberId: '1' }

describe('reissueSession', () => {
  it('returns new session on success (rotates refresh if provided)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ dataHeader: { success: true, resultCode: null, resultMessage: null }, dataBody: { accessToken: 'new' } }),
        { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': 'refreshToken=r2; Path=/; HttpOnly' } },
      ),
    )
    const next = await reissueSession(current, 'http://b', fetchImpl)
    expect(next).toEqual({ accessToken: 'new', refreshToken: 'r2', memberId: '1' })
  })
  it('returns null on reissue failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }))
    expect(await reissueSession(current, 'http://b', fetchImpl)).toBeNull()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `cd BossPickSeoul/frontend && pnpm test src/lib/auth/reissue.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: reissue.ts 구현**

`frontend/src/lib/auth/reissue.ts`:
```ts
import type { SessionPayload } from '@/lib/auth/session'
import { extractCookieValue } from '@/lib/auth/set-cookie'
import { isApiSuccess } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'

type ReissueBody = { accessToken: string }

export const reissueSession = async (
  current: SessionPayload,
  backendApiUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SessionPayload | null> => {
  const res = await fetchImpl(`${backendApiUrl}/api/v1/auth/token/reissue`, {
    method: 'POST',
    headers: { Cookie: `refreshToken=${current.refreshToken}` },
  })
  if (!res.ok) return null
  const data = (await res.json()) as ApiResponse<ReissueBody>
  if (!isApiSuccess(data) || !data.dataBody?.accessToken) return null
  const setCookie = res.headers.getSetCookie?.() ?? res.headers.get('set-cookie')
  const rotated = extractCookieValue(setCookie, 'refreshToken')
  return {
    accessToken: data.dataBody.accessToken,
    refreshToken: rotated ?? current.refreshToken,
    memberId: current.memberId,
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd BossPickSeoul/frontend && pnpm test src/lib/auth/reissue.test.ts`
Expected: PASS.

- [ ] **Step 5: 프록시 라우트 구현**

`frontend/app/api/bff/[...path]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import { getSession, setSession, clearSession, type SessionPayload } from '@/lib/auth/session'
import { reissueSession } from '@/lib/auth/reissue'

const HOP = new Set(['host', 'connection', 'content-length', 'set-cookie', 'cookie'])

const buildHeaders = (req: Request, accessToken: string | null) => {
  const h = new Headers()
  req.headers.forEach((v, k) => {
    if (!HOP.has(k.toLowerCase())) h.set(k, v)
  })
  if (accessToken) h.set('Authorization', `Bearer ${accessToken}`)
  return h
}

const forward = async (
  req: Request,
  backendApiUrl: string,
  path: string,
  search: string,
  session: SessionPayload | null,
  body: ArrayBuffer | undefined,
) =>
  fetch(`${backendApiUrl}/${path}${search}`, {
    method: req.method,
    headers: buildHeaders(req, session?.accessToken ?? null),
    body: body && body.byteLength > 0 ? body : undefined,
    redirect: 'manual',
  })

async function handle(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { backendApiUrl } = getServerEnv()
  const { path } = await ctx.params
  const joined = path.join('/')
  const search = new URL(req.url).search
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer()

  let session = await getSession()
  let upstream = await forward(req, backendApiUrl, joined, search, session, body)

  if (upstream.status === 401 && session) {
    const next = await reissueSession(session, backendApiUrl)
    if (!next) {
      await clearSession()
      return NextResponse.json({ message: '세션이 만료되었습니다. 다시 로그인해 주세요.' }, { status: 401 })
    }
    await setSession(next)
    session = next
    upstream = await forward(req, backendApiUrl, joined, search, session, body)
  }

  const resBody = await upstream.arrayBuffer()
  const headers = new Headers()
  upstream.headers.forEach((v, k) => {
    if (k.toLowerCase() !== 'set-cookie') headers.set(k, v) // 백엔드 Set-Cookie 브라우저로 전파 금지
  })
  return new NextResponse(resBody, { status: upstream.status, headers })
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
```
> 백엔드 Set-Cookie는 절대 브라우저로 전파하지 않는다(session-bff D6). 재발급된 refresh는 세션 쿠키에만 반영.

- [ ] **Step 6: typecheck + 커밋**

Run: `cd BossPickSeoul/frontend && pnpm test src/lib/auth/reissue.test.ts && pnpm typecheck`
Expected: 테스트 PASS, 타입 통과.
```bash
git add frontend/src/lib/auth/reissue.ts frontend/src/lib/auth/reissue.test.ts frontend/app/api/bff
git commit -m "[FE] feat(auth): BFF catch-all proxy with 401 reissue+retry"
```

---

### Task 7: 로그아웃 라우트 `/api/auth/logout`

**Files:**
- Create: `frontend/app/api/auth/logout/route.ts`

**Interfaces:**
- Consumes: `getSession`/`clearSession`, `getServerEnv`.
- Produces: `POST /api/auth/logout` → 항상 세션 제거 후 200.

- [ ] **Step 1: 구현**

`frontend/app/api/auth/logout/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import { getSession, clearSession } from '@/lib/auth/session'

export async function POST() {
  const { backendApiUrl } = getServerEnv()
  const session = await getSession()
  if (session) {
    try {
      await fetch(`${backendApiUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
    } catch {
      // 백엔드 실패해도 로컬 세션은 반드시 제거 (session-bff D6)
    }
  }
  await clearSession()
  return NextResponse.json({ ok: true }, { status: 200 })
}
```

- [ ] **Step 2: typecheck + 커밋**

Run: `cd BossPickSeoul/frontend && pnpm typecheck`
Expected: 통과.
```bash
git add frontend/app/api/auth/logout
git commit -m "[FE] feat(auth): /api/auth/logout clears session"
```

---

### Task 8: 미들웨어 인증 가드

**Files:**
- Create: `frontend/middleware.ts`

**Interfaces:**
- Consumes: `SESSION_COOKIE` (Task 3) — 미들웨어는 Edge라 쿠키 **존재만** 검사(복호화는 라우트에서).
- Produces: 보호 라우트 미인증 시 `/login?redirect=<path>` 리다이렉트.

- [ ] **Step 1: 구현**

`frontend/middleware.ts`:
```ts
import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'

// 인증 필요한 보호 경로 접두사
const PROTECTED = ['/analysis', '/recommend', '/simulation', '/status', '/community', '/chatting', '/profile']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED.some(p => pathname === p || pathname.startsWith(`${p}/`))
  if (!isProtected) return NextResponse.next()

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value)
  if (hasSession) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.search = `?redirect=${encodeURIComponent(pathname)}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/analysis/:path*', '/recommend/:path*', '/simulation/:path*', '/status/:path*', '/community/:path*', '/chatting/:path*', '/profile/:path*'],
}
```
> `SESSION_COOKIE` import가 Edge에서 `server-only` 모듈(session.ts)을 끌어오면 안 되므로, `SESSION_COOKIE` 상수를 `session.ts`에서 분리해 `src/lib/auth/session-constants.ts`로 옮기고 양쪽에서 import한다. (session.ts는 이 상수를 재-export.)

- [ ] **Step 2: 상수 분리 반영**

`frontend/src/lib/auth/session-constants.ts`:
```ts
export const SESSION_COOKIE = 'bps_session'
```
`session.ts`에서 `export { SESSION_COOKIE } from './session-constants'`로 교체하고 내부 사용도 이 import로. `middleware.ts`는 `session-constants`에서 import.

- [ ] **Step 3: typecheck + 커밋**

Run: `cd BossPickSeoul/frontend && pnpm test src/lib/auth && pnpm typecheck`
Expected: 통과.
```bash
git add frontend/middleware.ts frontend/src/lib/auth/session-constants.ts frontend/src/lib/auth/session.ts
git commit -m "[FE] feat(auth): middleware guard for protected routes"
```

---

### Task 9: 세션 복원 + auth-store·client 리팩터

**Files:**
- Create: `frontend/app/api/auth/me/route.ts` (또는 `/api/bff/members/me` 사용; 여기선 편의 래퍼)
- Modify: `frontend/src/stores/auth-store.ts`
- Modify: `frontend/src/lib/api/client.ts`
- Modify: `frontend/src/types/auth.ts` (필요 시 MemberInfo 필드 정합)

**Interfaces:**
- Consumes: BFF 프록시(Task 6), `getSession`.
- Produces: `useAuthStore` — `{ hasHydrated, isLoggedIn, memberInfo, hydrate(), setLoggedIn(memberId), clearSession() }`; `apiClient` baseURL=`/api/bff`, 토큰 로직 제거.

- [ ] **Step 1: me 라우트 (세션 → /members/me)**

`frontend/app/api/auth/me/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import { getSession } from '@/lib/auth/session'
import { isApiSuccess } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ authenticated: false }, { status: 200 })
  const { backendApiUrl } = getServerEnv()
  const res = await fetch(`${backendApiUrl}/api/v1/members/me`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })
  const data = (await res.json()) as ApiResponse<unknown>
  if (!res.ok || !isApiSuccess(data)) {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
  return NextResponse.json({ authenticated: true, member: data.dataBody }, { status: 200 })
}
```
> me는 access 만료 시 재발급이 필요하면 `/api/bff/members/me`를 쓰도록 후속 통합 가능. 1차는 단순 경로.

- [ ] **Step 2: client.ts 리팩터 (토큰 로직 제거, baseURL=/api/bff)**

`frontend/src/lib/api/client.ts` 전체 교체:
```ts
import axios, { AxiosInstance } from 'axios'

const createApiClient = (baseURL = '/api/bff'): AxiosInstance =>
  axios.create({
    baseURL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
  })

export const apiClient = createApiClient()
export { createApiClient }
```
> 토큰 주입·재발급은 BFF 서버가 전담하므로 클라이언트 인터셉터 제거. `getAccessTokenCookie`/`getStoredSessionEmail` 의존 제거.

- [ ] **Step 3: auth-store 리팩터 (localStorage 토큰 제거, /me 기반 hydrate)**

`frontend/src/stores/auth-store.ts` 전체 교체:
```ts
'use client'

import { create } from 'zustand'
import type { MemberInfo } from '@/types/auth'

type AuthState = {
  hasHydrated: boolean
  isLoggedIn: boolean
  memberInfo: MemberInfo | null
  hydrate: () => Promise<void>
  setSession: (memberInfo: MemberInfo) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>(set => ({
  hasHydrated: false,
  isLoggedIn: false,
  memberInfo: null,
  hydrate: async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' })
      const data = await res.json()
      set({
        hasHydrated: true,
        isLoggedIn: Boolean(data.authenticated),
        memberInfo: data.authenticated ? (data.member as MemberInfo) : null,
      })
    } catch {
      set({ hasHydrated: true, isLoggedIn: false, memberInfo: null })
    }
  },
  setSession: memberInfo => set({ hasHydrated: true, isLoggedIn: true, memberInfo }),
  clearSession: () => set({ hasHydrated: true, isLoggedIn: false, memberInfo: null }),
}))
```
> `MemberInfo` 타입을 `MemberMyInfoResponse`(memberId,email,name,nickname,profileImageUrl,roleCode,roleDescription)에 맞춰 `src/types/auth.ts` 조정.

- [ ] **Step 4: 죽은 코드 정리**

`src/lib/auth/cookies.ts`·`storage.ts`의 토큰/세션-이메일 헬퍼가 더 이상 참조되지 않으면 제거 또는 비-토큰 용도만 남긴다. `grep -rn "getAccessTokenCookie\|getStoredSessionEmail\|persistSessionEmail" src app`로 잔존 참조 0 확인.

- [ ] **Step 5: typecheck + 커밋**

Run: `cd BossPickSeoul/frontend && pnpm typecheck`
Expected: 통과(잔존 참조 없음).
```bash
git add frontend/app/api/auth/me frontend/src/stores/auth-store.ts frontend/src/lib/api/client.ts frontend/src/types/auth.ts frontend/src/lib/auth/cookies.ts frontend/src/lib/auth/storage.ts
git commit -m "[FE] refactor(auth): server-session auth-store + /api/bff client + /me restore"
```

---

### Task 10: 로그인 화면

**Files:**
- Modify/Create: `frontend/app/(auth)/login/page.tsx`
- Create: `frontend/src/components/auth/login-form.tsx`

**Interfaces:**
- Consumes: `/api/auth/login` (Task 5), `useAuthStore.setSession` (Task 9).
- Produces: 로그인 화면. 성공 시 `redirect` 쿼리(내부 경로만) 또는 홈으로 이동.

- [ ] **Step 1: 로그인 폼 구현 (client component)**

`frontend/src/components/auth/login-form.tsx` — 이메일/비밀번호 입력, 클라이언트 유효성(이메일 형식, 비밀번호 비어있지 않음), 제출 시 `POST /api/auth/login`. 로딩/에러 상태 표시. 성공 시 `useAuthStore.setSession` 후 `router.replace(safeRedirect)`. `safeRedirect`는 `/`로 시작하는 내부 경로만 허용(오픈 리다이렉트 방지, login.md D6). 스타일은 DESIGN.md 토큰/컴포넌트 규칙 사용, 임의 색상 금지.

핵심 제출 로직:
```tsx
const res = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
if (res.ok) {
  const { memberId } = await res.json()
  await useAuthStore.getState().hydrate() // /me로 memberInfo 채움
  router.replace(safeRedirect(searchParams.get('redirect')))
} else {
  setError((await res.json()).message)
}
```
`safeRedirect(v)`: `v && v.startsWith('/') && !v.startsWith('//') ? v : '/'`.

- [ ] **Step 2: page.tsx 배선**

`frontend/app/(auth)/login/page.tsx` — `<LoginForm />` 렌더. 이미 로그인 상태면 홈으로(선택: 서버에서 세션 존재 시 redirect). legacy `LoginContainer.tsx` 화면 구성 참고(동작 보존), 비주얼은 새 디자인.

- [ ] **Step 3: 검증 + 커밋**

Run: `cd BossPickSeoul/frontend && pnpm lint && pnpm typecheck`
Expected: 통과.
```bash
git add "frontend/app/(auth)/login" frontend/src/components/auth/login-form.tsx
git commit -m "[FE] feat(auth): login screen wired to BFF"
```

---

### Task 11: 회원가입 화면

**Files:**
- Modify/Create: `frontend/app/(auth)/register/page.tsx`
- Create: `frontend/src/components/auth/register-form.tsx`

**Interfaces:**
- Consumes: `POST /api/bff/members/signup` (Task 6 프록시).
- Produces: 단일 단계 회원가입 화면.

- [ ] **Step 1: 가입 폼 구현**

`frontend/src/components/auth/register-form.tsx` — email/password/name/nickname 입력. 클라이언트 유효성은 백엔드와 **정확히 동일**(register.md D4-1): 비밀번호 `^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|])\S{8,20}$`, 이름/닉네임 ≤10, 이메일 형식. 제출:
```tsx
const res = await fetch('/api/bff/members/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, name, nickname }),
})
const data = await res.json() // ApiResponse
if (res.ok && data?.dataHeader?.success) {
  router.replace('/login')
} else {
  setError(data?.dataHeader?.resultMessage ?? '가입에 실패했습니다.')
}
```
> signup은 인증 불필요 — 프록시가 세션 없이 Bearer 없이 포워드(정상). 가입 후 백엔드가 토큰을 주지 않으므로 로그인 화면으로 유도(register.md D5).

- [ ] **Step 2: page.tsx 배선 + legacy 2단계 통합**

`frontend/app/(auth)/register/page.tsx` — `<RegisterForm />`. legacy `register/general` 2단계는 단일 폼으로 통합(register.md D1-1). `app/(auth)/register/general/page.tsx`가 존재하면 단일 폼으로 리다이렉트하거나 제거(중복 방지).

- [ ] **Step 3: 검증 + 커밋**

Run: `cd BossPickSeoul/frontend && pnpm lint && pnpm typecheck`
Expected: 통과.
```bash
git add "frontend/app/(auth)/register" frontend/src/components/auth/register-form.tsx
git commit -m "[FE] feat(auth): single-step register screen"
```

---

### Task 12: 통합 검증 + _index 갱신

**Files:**
- Modify: `frontend/docs/features/_index.md` (auth 상태)

**Interfaces:**
- Consumes: Task 1~11 전체.

- [ ] **Step 1: 정적 검증**

Run: `cd BossPickSeoul/frontend && pnpm test && pnpm qa:verify`
Expected: 전체 테스트 PASS, format/lint/typecheck/build 통과.

- [ ] **Step 2: 런타임 수동 검증 (백엔드 실행 필요)**

`.env.local`에 `AUTH_SESSION_SECRET`, `BACKEND_API_URL` 설정 후 `pnpm dev`. 확인:
- 로그인 성공 → `bps_session` HttpOnly 쿠키 설정, DevTools에서 accessToken/refreshToken **미노출** 확인.
- 로그인 후 새로고침 → 세션 복원(로그인 유지).
- 미인증 상태로 `/analysis` 접근 → `/login?redirect=/analysis` 리다이렉트.
- 로그아웃 → `bps_session` 제거, 미인증 전환.
- (가능하면) access 만료 유도 → 보호 API 호출이 자동 재발급 후 성공.
> 백엔드 미가동이면 이 단계는 "미실행"으로 보고하고 정적 검증 결과만 확정한다. 통과했다고 임의 보고 금지.

- [ ] **Step 3: _index 상태 갱신 + 커밋**

`frontend/docs/features/_index.md`의 auth 행 상태를 `✅ 이관·검증 완료`(런타임 검증 시) 또는 `🟩 명세 완료·구현`(정적만)으로 갱신, 비고에 미결(소셜/2단계/에러코드) 유지.
```bash
git add frontend/docs/features/_index.md
git commit -m "[FE] docs(auth): update feature index after BFF auth implementation"
```

---

## Self-Review

**Spec coverage:**
- session-bff D4-1 로그인 봉인 → Task 5. D4-2 로그아웃 → Task 7. D4-3 프록시+재발급 → Task 6. D4-4 가드 → Task 8. D4-5 세션복원 → Task 9. D3 세션 암호화 → Task 3. D6 Set-Cookie 미전파 → Task 6(응답 Set-Cookie 제거)·Task 5(흡수). 응답 래퍼 → Task 2.
- login.md → Task 10. register.md → Task 11. 비밀번호 규칙 일치 → Task 11 Step 1.
- 공통 TC-001~007 → Task 12 런타임 검증 + 단위테스트(Task 3~6).
- data-fetching-rules(BFF 표준) → Task 6·9(client baseURL, 토큰 서버보관).
→ 갭 없음. 미결(소셜/2단계/에러코드 카탈로그)은 명세 D8대로 구현 제외.

**Placeholder scan:** 각 코드 스텝에 실제 코드 포함. UI 태스크(10·11)는 전체 파일 대신 핵심 로직+구조 명시(스타일은 DESIGN.md 위임) — "add error handling"류 모호 지시 없음.

**Type consistency:** `SessionPayload{accessToken,refreshToken,memberId}` (Task 3) → Task 5·6·9에서 동일 사용. `ApiResponse<T>{dataHeader:{success,...},dataBody}` (Task 2) → Task 5·6·9 일관. `reissueSession(current,backendApiUrl,fetchImpl?)` (Task 6) 시그니처 프록시에서 일치. `SESSION_COOKIE` 상수 분리(Task 8) 후 session.ts·middleware.ts 양쪽 import.
