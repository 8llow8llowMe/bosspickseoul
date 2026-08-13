# BFF accessToken 선재발급 + 익명 폴백 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BFF 프록시가 만료된 accessToken을 백엔드로 보내지 않도록 forward 전에 선(先)재발급하고, 재발급 실패 시 세션을 비우고 익명으로 전달한다.

**Architecture:** 순수 유틸(`jwt.ts` — exp 디코드/만료판정)과 동시성 유틸(`refresh-single-flight.ts` — 재발급 1회 합류)을 각각 TDD로 만든 뒤, BFF 라우트(`route.ts`)에 선재발급 블록을 넣고 기존 401 반응형 경로를 single-flight로 교체한다. 검증은 단위테스트 + dev 서버 실측.

**Tech Stack:** Next.js App Router(route handler = Node 서버) / TypeScript / vitest / jose(기존 세션 암호화) / pnpm

## Global Constraints

- 작업 범위 **FE 전용** — 백엔드 API 계약·엔드포인트 변경 금지.
- 서명 검증은 하지 않는다(만료 판단 전용). 인가 권한은 백엔드에 그대로 둔다.
- 유효 토큰 사용자의 동작·성능 불변(만료 아닐 때 추가 네트워크 호출 없음).
- 서버 전용 모듈은 `import 'server-only'`(기존 `session.ts`/`env.server.ts` 컨벤션).
- clock skew 기본 **30초**. single-flight 키는 **refreshToken**.
- 완료 보고 전 `pnpm qa:verify`(format:check && lint && typecheck && build) 통과. 미실행을 통과로 보고 금지.
- `Date.now()`는 함수 인자로 주입해 테스트 결정성 확보.

---

## File Structure

| 파일                                         | 책임                                                      |
| -------------------------------------------- | --------------------------------------------------------- |
| `src/lib/auth/jwt.ts`                        | `decodeJwtExp`, `isAccessTokenExpired` (순수, throw 없음) |
| `src/lib/auth/jwt.test.ts`                   | 위 단위테스트                                             |
| `src/lib/auth/refresh-single-flight.ts`      | `refreshSessionOnce` (동시 재발급 1회 합류)               |
| `src/lib/auth/refresh-single-flight.test.ts` | 위 단위테스트                                             |
| `app/api/bff/[...path]/route.ts`             | 선재발급 블록 + 반응형 401 경로 single-flight화           |
| `app/api/bff/[...path]/route.test.ts`        | 신규 케이스 추가(만료→재발급/익명, 유효→미재발급)         |
| `docs/features/auth/session-bff.md`          | 선재발급·익명 폴백 동작 반영                              |

경로 주의: git 루트는 `BossPickSeoul/`, pnpm/파일은 `BossPickSeoul/frontend/`. 아래 경로는 `frontend/` 기준.

---

## Task 1: JWT 만료 판정 순수 유틸 (`jwt.ts`)

**Files:**

- Create: `frontend/src/lib/auth/jwt.ts`
- Test: `frontend/src/lib/auth/jwt.test.ts`

**Interfaces:**

- Produces:
  - `decodeJwtExp(token: string): number | null`
  - `isAccessTokenExpired(token: string, nowMs: number, skewSec?: number): boolean`
- Consumes: 없음(순수). `Buffer`(Node) 사용 → `server-only`.

- [ ] **Step 1: 실패 테스트 작성**

`frontend/src/lib/auth/jwt.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { decodeJwtExp, isAccessTokenExpired } from '@/lib/auth/jwt'

// 서명 검증 안 하므로 sig는 아무 값이나 가능
const jwtWithExp = (exp: number): string =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.sig`

describe('decodeJwtExp', () => {
  it('정상 JWT에서 exp(초)를 읽는다', () => {
    expect(decodeJwtExp(jwtWithExp(1_700_000_000))).toBe(1_700_000_000)
  })
  it('세그먼트가 3개가 아니면 null', () => {
    expect(decodeJwtExp('not-a-jwt')).toBeNull()
    expect(decodeJwtExp('a.b')).toBeNull()
  })
  it('payload에 exp가 없거나 숫자가 아니면 null', () => {
    const noExp = `h.${Buffer.from(JSON.stringify({ sub: '1' })).toString('base64url')}.s`
    const strExp = `h.${Buffer.from(JSON.stringify({ exp: 'x' })).toString('base64url')}.s`
    expect(decodeJwtExp(noExp)).toBeNull()
    expect(decodeJwtExp(strExp)).toBeNull()
  })
  it('payload가 깨진 base64/JSON이면 null(throw 안 함)', () => {
    expect(decodeJwtExp('h.@@@notbase64@@@.s')).toBeNull()
    const badJson = `h.${Buffer.from('{not json').toString('base64url')}.s`
    expect(decodeJwtExp(badJson)).toBeNull()
  })
})

describe('isAccessTokenExpired', () => {
  const now = 1_700_000_000_000 // ms
  it('exp가 now(+skew) 이하이면 만료로 본다', () => {
    // exp = now/1000 - 10s → 만료
    expect(isAccessTokenExpired(jwtWithExp(now / 1000 - 10), now)).toBe(true)
  })
  it('skew(30s) 이내 임박도 만료로 본다', () => {
    // exp = now + 20s → 30s skew 이내 → 만료 취급
    expect(isAccessTokenExpired(jwtWithExp(now / 1000 + 20), now)).toBe(true)
  })
  it('충분히 미래면 유효', () => {
    expect(isAccessTokenExpired(jwtWithExp(now / 1000 + 3600), now)).toBe(false)
  })
  it('exp를 못 읽으면 false(판단 불가 → 선재발급 스킵)', () => {
    expect(isAccessTokenExpired('opaque-token', now)).toBe(false)
  })
  it('skewSec를 조정할 수 있다', () => {
    expect(isAccessTokenExpired(jwtWithExp(now / 1000 + 20), now, 0)).toBe(
      false,
    )
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && pnpm vitest run src/lib/auth/jwt.test.ts`
Expected: FAIL (`jwt.ts` 없음/미구현).

- [ ] **Step 3: 구현**

`frontend/src/lib/auth/jwt.ts`:

```ts
import 'server-only'

/** JWT payload의 exp(초)를 읽는다. 서명 검증 안 함(만료 판단 전용). 실패 시 null(throw 없음). */
export const decodeJwtExp = (token: string): number | null => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const json = Buffer.from(parts[1], 'base64url').toString('utf8')
    const payload = JSON.parse(json) as Record<string, unknown>
    const exp = payload.exp
    return typeof exp === 'number' && Number.isFinite(exp) ? exp : null
  } catch {
    return null
  }
}

/**
 * accessToken이 만료(또는 skewSec 이내 임박)인지.
 * exp를 못 읽으면 false(판단 불가 → 선재발급 스킵, 반응형 401 경로에 위임).
 */
export const isAccessTokenExpired = (
  token: string,
  nowMs: number,
  skewSec = 30,
): boolean => {
  const exp = decodeJwtExp(token)
  if (exp === null) return false
  return exp * 1000 <= nowMs + skewSec * 1000
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd frontend && pnpm vitest run src/lib/auth/jwt.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/lib/auth/jwt.ts frontend/src/lib/auth/jwt.test.ts
git commit -m "feat(auth): JWT exp 디코드·만료판정 순수 유틸 추가"
```

---

## Task 2: 재발급 single-flight (`refresh-single-flight.ts`)

**Files:**

- Create: `frontend/src/lib/auth/refresh-single-flight.ts`
- Test: `frontend/src/lib/auth/refresh-single-flight.test.ts`

**Interfaces:**

- Consumes: `reissueSession` from `@/lib/auth/reissue` (시그니처 `(session, backendApiUrl, fetchImpl?) => Promise<SessionPayload|null>`), `SessionPayload` type from `@/lib/auth/session`.
- Produces: `refreshSessionOnce(session: SessionPayload, backendApiUrl: string, reissue?: (s: SessionPayload, url: string) => Promise<SessionPayload | null>): Promise<SessionPayload | null>`

- [ ] **Step 1: 실패 테스트 작성**

`frontend/src/lib/auth/refresh-single-flight.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { refreshSessionOnce } from '@/lib/auth/refresh-single-flight'

const session = (refreshToken: string) => ({
  accessToken: 'a',
  refreshToken,
  memberId: '1',
})
const next = { accessToken: 'new', refreshToken: 'r2', memberId: '1' }

describe('refreshSessionOnce', () => {
  it('같은 refreshToken 동시 호출은 reissue를 1회만 실행하고 결과를 공유한다', async () => {
    let calls = 0
    const reissue = vi.fn(async () => {
      calls += 1
      await new Promise(r => setTimeout(r, 10))
      return next
    })
    const s = session('r1')
    const results = await Promise.all([
      refreshSessionOnce(s, 'http://b', reissue),
      refreshSessionOnce(s, 'http://b', reissue),
      refreshSessionOnce(s, 'http://b', reissue),
    ])
    expect(calls).toBe(1)
    expect(results).toEqual([next, next, next])
  })

  it('정착 후 재호출은 새로 reissue를 실행한다(맵 정리)', async () => {
    const reissue = vi.fn(async () => next)
    await refreshSessionOnce(session('rA'), 'http://b', reissue)
    await refreshSessionOnce(session('rA'), 'http://b', reissue)
    expect(reissue).toHaveBeenCalledTimes(2)
  })

  it('reissue가 null이면 null을 전파하고 맵을 비운다', async () => {
    const reissue = vi.fn(async () => null)
    expect(
      await refreshSessionOnce(session('rB'), 'http://b', reissue),
    ).toBeNull()
    // 정리됐으므로 다음 호출도 reissue 다시 실행
    await refreshSessionOnce(session('rB'), 'http://b', reissue)
    expect(reissue).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && pnpm vitest run src/lib/auth/refresh-single-flight.test.ts`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현**

`frontend/src/lib/auth/refresh-single-flight.ts`:

```ts
import 'server-only'
import { reissueSession } from '@/lib/auth/reissue'
import type { SessionPayload } from '@/lib/auth/session'

type Reissue = (
  session: SessionPayload,
  backendApiUrl: string,
) => Promise<SessionPayload | null>

// 모듈 레벨 in-memory 합류 맵. 단일 Node 프로세스 기준(제약: 명세 참고).
const inflight = new Map<string, Promise<SessionPayload | null>>()

export const refreshSessionOnce = (
  session: SessionPayload,
  backendApiUrl: string,
  reissue: Reissue = reissueSession,
): Promise<SessionPayload | null> => {
  const key = session.refreshToken
  const existing = inflight.get(key)
  if (existing) return existing

  const p = reissue(session, backendApiUrl).finally(() => {
    inflight.delete(key)
  })
  inflight.set(key, p)
  return p
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd frontend && pnpm vitest run src/lib/auth/refresh-single-flight.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/lib/auth/refresh-single-flight.ts frontend/src/lib/auth/refresh-single-flight.test.ts
git commit -m "feat(auth): 재발급 single-flight 유틸 추가(동시 재발급 1회 합류)"
```

---

## Task 3: BFF 라우트에 선재발급 + 익명 폴백 적용

**Files:**

- Modify: `frontend/app/api/bff/[...path]/route.ts`
- Test: `frontend/app/api/bff/[...path]/route.test.ts`
- Modify: `frontend/docs/features/auth/session-bff.md`

**Interfaces:**

- Consumes: Task 1 `isAccessTokenExpired`, Task 2 `refreshSessionOnce`, 기존 `getSession/setSession/clearSession`, `forward`.
- Produces: 외부 라우트 계약 불변(GET/POST/... 핸들러). 내부 동작만 강화.

- [ ] **Step 1: 라우트 수정**

`route.ts` 상단 import에 추가:

```ts
import { isAccessTokenExpired } from '@/lib/auth/jwt'
import { refreshSessionOnce } from '@/lib/auth/refresh-single-flight'
```

`handle()`에서 `let session = await getSession()` 직후 ~ 첫 `forward` 사이에 선재발급 블록을 넣고, 기존 401 블록의 `reissueSession(...)` 호출을 `refreshSessionOnce(...)`로 교체. 최종 형태:

```ts
let session = await getSession()

// 선재발급: accessToken이 만료(임박)면 forward 전에 갱신을 시도한다.
// 백엔드가 만료 토큰에 401이 아닌 500을 주는 문제를 우회 — 만료 토큰을 애초에 보내지 않는다.
if (session && isAccessTokenExpired(session.accessToken, Date.now())) {
  const next = await refreshSessionOnce(session, backendApiUrl)
  if (next) {
    await setSession(next)
    session = next
  } else {
    // 재발급도 실패 → 세션 제거 후 토큰 없이(익명) 전달. 공개 API는 200, 보호 API는 백엔드 401.
    await clearSession()
    session = null
  }
}

let upstream = await forward(req, backendApiUrl, joined, search, session, body)

if (upstream.status === 401 && session) {
  const next = await refreshSessionOnce(session, backendApiUrl)
  if (!next) {
    await clearSession()
    return NextResponse.json(
      { message: '세션이 만료되었습니다. 다시 로그인해 주세요.' },
      { status: 401 },
    )
  }
  await setSession(next)
  session = next
  upstream = await forward(req, backendApiUrl, joined, search, session, body)
}
```

> `reissueSession` import는 더 이상 route.ts에서 직접 쓰지 않으면 제거(단, 아래 테스트가 `@/lib/auth/reissue`를 mock하므로, refresh-single-flight가 그 모듈을 import해 mock이 전파됨).

- [ ] **Step 2: 신규 테스트 추가**

`route.test.ts`에 JWT 헬퍼와 4개 케이스 추가(기존 케이스는 `'old-token'`=비JWT라 `isAccessTokenExpired=false` → 선재발급 스킵 → 기존 그대로 통과).

기존 `session1/session2` 아래에 헬퍼 추가:

```ts
const jwt = (exp: number) =>
  `h.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.s`
const nowSec = () => Math.floor(Date.now() / 1000)
const expiredJwtSession = {
  accessToken: jwt(nowSec() - 60),
  refreshToken: 'r1',
  memberId: '1',
}
const freshJwtSession = {
  accessToken: jwt(nowSec() + 3600),
  refreshToken: 'r1',
  memberId: '1',
}
```

케이스:

```ts
it('만료 JWT면 forward 전에 선재발급하고 새 토큰으로 1회만 forward한다', async () => {
  getSession.mockResolvedValue(expiredJwtSession)
  reissueSession.mockResolvedValue(session2)
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response('{}', { status: 200 }))
  global.fetch = fetchMock
  const { GET } = await import('./route')
  const req = new Request('http://x/api/bff/districts', { method: 'GET' })
  const res = await GET(req, ctx(['districts']))
  expect(res.status).toBe(200)
  expect(reissueSession).toHaveBeenCalledTimes(1)
  expect(setSession).toHaveBeenCalledWith(session2)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(
    (fetchMock.mock.calls[0][1].headers as Headers).get('authorization'),
  ).toBe('Bearer new-token')
})

it('만료 JWT + 재발급 실패면 세션을 비우고 토큰 없이(익명) forward한다', async () => {
  getSession.mockResolvedValue(expiredJwtSession)
  reissueSession.mockResolvedValue(null)
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response('{}', { status: 200 }))
  global.fetch = fetchMock
  const { GET } = await import('./route')
  const req = new Request('http://x/api/bff/districts', { method: 'GET' })
  const res = await GET(req, ctx(['districts']))
  expect(res.status).toBe(200)
  expect(clearSession).toHaveBeenCalledTimes(1)
  expect(setSession).not.toHaveBeenCalled()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(
    (fetchMock.mock.calls[0][1].headers as Headers).has('authorization'),
  ).toBe(false)
})

it('유효 JWT면 선재발급을 하지 않는다', async () => {
  getSession.mockResolvedValue(freshJwtSession)
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response('{}', { status: 200 }))
  global.fetch = fetchMock
  const { GET } = await import('./route')
  const req = new Request('http://x/api/bff/districts', { method: 'GET' })
  await GET(req, ctx(['districts']))
  expect(reissueSession).not.toHaveBeenCalled()
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
```

> 주의: `route.test.ts`는 매 테스트 `await import('./route')`로 모듈을 다시 가져오지만 vitest 모듈 캐시상 single-flight의 `inflight` 맵은 공유될 수 있다. 각 케이스가 GET 완료까지 await하므로 맵은 정착 후 비워진다(재발급은 finally에서 삭제). refreshToken 키가 'r1'로 겹쳐도 순차 실행이라 문제없음. 필요 시 `reissueSession.mockReset()`(기존 beforeEach)로 카운트는 초기화됨.

- [ ] **Step 3: 단위테스트 통과 확인**

Run: `cd frontend && pnpm vitest run "app/api/bff/[...path]/route.test.ts" src/lib/auth/jwt.test.ts src/lib/auth/refresh-single-flight.test.ts`
Expected: PASS(신규 3케이스 + 기존 401 케이스 포함 전부).

- [ ] **Step 4: 명세 문서 갱신**

`frontend/docs/features/auth/session-bff.md`에 BFF 동작 설명(현재 "401이면 재발급" 부분)에 선재발급·익명 폴백을 한 줄~두 줄로 추가:

- forward 전에 accessToken `exp`를 확인해 만료(임박)면 재발급(single-flight)하고, 재발급 실패 시 세션 제거 후 **토큰 없이 전달**(공개 API 200 유지, 보호 API 401).
- 배경: 백엔드가 만료 토큰에 401이 아닌 500을 반환하는 문제의 FE 방어막(근본은 백엔드 401 반환).

- [ ] **Step 5: 전체 게이트**

Run: `cd frontend && pnpm qa:verify`
Expected: PASS(format/lint/typecheck/build).

- [ ] **Step 6: 커밋**

```bash
git add frontend/app/api/bff/ frontend/docs/features/auth/session-bff.md
git commit -m "feat(auth): BFF 만료 토큰 선재발급 + 재발급 실패 시 익명 폴백"
```

---

## Self-Review

**1. Spec 커버리지:** jwt.ts(Task1)·single-flight(Task2)·route 선재발급+익명 폴백+반응형 single-flight화(Task3)·문서(Task3 Step4)·테스트(각 Task) 모두 명세 대응. ✅

**2. Placeholder scan:** 모든 스텝에 실제 코드 포함, TBD/"적절히" 없음. ✅

**3. Type consistency:** `refreshSessionOnce(session, backendApiUrl, reissue?)` 시그니처가 Task2 정의와 Task3 호출부 일치. `isAccessTokenExpired(token, nowMs, skewSec?)` Task1 정의와 Task3 호출(`Date.now()` 2인자) 일치. `SessionPayload`는 기존 타입 재사용. ✅

**4. 회귀 안전:** 기존 route.test.ts 케이스는 비JWT 토큰이라 선재발급 스킵 → 기존 동작·테스트 불변. 유효 토큰 사용자도 추가 네트워크 없음. ✅

**리뷰 포인트:** (a) `reissueSession` import 제거 후 lint(unused) 확인, (b) single-flight `inflight` 맵의 테스트 간 공유가 케이스 순서에 영향 없는지, (c) `server-only` 모듈이 vitest(node)에서 정상 import 되는지(기존 session.test 전례 있음).
