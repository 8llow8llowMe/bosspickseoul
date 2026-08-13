# BFF accessToken 선(先)재발급 + 익명 폴백 — 설계 명세

- 작성일: 2026-08-13
- 범위: **FE 전용** (Next.js BFF 프록시 + 세션 유틸). 백엔드 API 계약 변경 없음.
- 관련 정본: `docs/features/auth/session-bff.md`

## 배경 / 문제

`/analysis`(및 상권분석 전반)에서 로그인 세션을 가진 사용자가 **만료된 accessToken**을 들고 있으면, 공개 데이터 API(`/api/bff/districts`, `/api/bff/map/districts` 등)까지 500이 나서 지도·목록이 뜨지 않는다.

근본 원인(증거 확정):

- BFF 프록시(`app/api/bff/[...path]/route.ts`)는 세션이 있으면 **엔드포인트 공개/보호 구분 없이** `Authorization: Bearer <accessToken>`을 항상 주입한다.
- 백엔드는 만료/무효 토큰에 대해 **`401`이 아니라 `500`을 반환**한다(curl 검증: 무효토큰→500, 무인증→200). 이는 `session-bff.md`가 전제한 "access 만료→401→재발급" 계약(TC-BFF-003/004)을 위반한다.
- BFF의 재발급 로직은 **`401`에서만** 트리거되므로, 백엔드가 `500`을 주면 재발급이 돌지 않아 만료 토큰이 **영구히 갱신되지 않고** 매 요청이 500난다.

근본 수정은 백엔드(만료 토큰에 401 반환)이지만, 본 설계는 **FE가 만료된 토큰을 애초에 백엔드로 보내지 않도록** 하는 방어막이다.

## 목표 / 성공 기준

- BFF가 forward 이전에 accessToken의 만료를 감지해 **선재발급**한다 → 백엔드에 만료 토큰을 보내지 않는다.
- 재발급까지 실패(리프레시 토큰도 만료)하면 **세션을 비우고 토큰 없이(익명) 전달**한다 → 공개 API는 200, 보호 API는 백엔드가 401(정상적 로그아웃 전환).
- `/analysis` 진입 시의 **동시 다발 호출(~8개)** 에서 재발급이 **1회만** 실행되어 refreshToken 회전 레이스가 없다.
- 유효한 토큰을 가진 사용자의 동작·성능은 사실상 불변(만료 아닐 때 추가 네트워크 없음).

## 아키텍처 / 컴포넌트

작게 분리하고 각각 독립 테스트한다.

### 1) `src/lib/auth/jwt.ts` (신규, 순수함수 — 절대 throw 안 함)

```ts
/** JWT payload의 exp(초)를 읽는다. 파싱 불가/exp 없음/형식 오류 → null. 서명 검증 안 함(만료 판단 전용). */
export const decodeJwtExp = (token: string): number | null

/**
 * accessToken이 만료(또는 skew 이내 임박)인지.
 * exp를 못 읽으면 false(판단 불가 → 선재발급 스킵, 반응형 401 경로에 위임).
 * nowMs: Date.now() 주입(테스트 결정성). skewSec 기본 30.
 */
export const isAccessTokenExpired = (
  token: string,
  nowMs: number,
  skewSec?: number,
): boolean
```

- `decodeJwtExp`: `token.split('.')` 길이 3 확인 → 두 번째 세그먼트 base64url 디코드(`Buffer.from(seg, 'base64url')`) → `JSON.parse` → `exp`가 유한 숫자면 반환, 아니면 null. 모든 단계 try/catch로 감싸 null 반환.
- `isAccessTokenExpired`: `exp = decodeJwtExp(token)`; `exp === null → false`; 아니면 `exp * 1000 <= nowMs + skewSec*1000`.

### 2) `src/lib/auth/refresh-single-flight.ts` (신규)

```ts
import type { SessionPayload } from '@/lib/auth/session'

/**
 * 같은 refreshToken에 대한 재발급을 1회로 합류(single-flight)시킨다.
 * 동시 요청은 진행 중 Promise를 공유하고, 정착되면 맵에서 제거한다.
 * reissue는 주입 가능(테스트/기본값 reissueSession 바인딩).
 */
export const refreshSessionOnce = (
  session: SessionPayload,
  backendApiUrl: string,
  reissue?: (
    s: SessionPayload,
    url: string,
  ) => Promise<SessionPayload | null>,
): Promise<SessionPayload | null>
```

- 모듈 레벨 `const inflight = new Map<string, Promise<SessionPayload | null>>()`.
- 키 = `session.refreshToken`. 있으면 그 Promise 반환. 없으면 `reissue(session, url)` 시작 → 맵에 저장 → `finally`에서 `inflight.delete(key)`.
- 기본 `reissue`는 `reissueSession`(기존 `@/lib/auth/reissue`).

### 3) `app/api/bff/[...path]/route.ts` (수정)

`handle()`의 forward 이전에 선재발급 블록 삽입, 그리고 기존 401 반응형 경로의 재발급 호출을 `refreshSessionOnce`로 교체(레이스 방지).

```
let session = await getSession()

// [신규] 선재발급: 만료면 forward 전에 갱신 시도
if (session && isAccessTokenExpired(session.accessToken, Date.now())) {
  const next = await refreshSessionOnce(session, backendApiUrl)
  if (next) {
    await setSession(next)
    session = next
  } else {
    await clearSession()
    session = null            // 익명으로 forward
  }
}

let upstream = await forward(req, backendApiUrl, joined, search, session, body)

// [기존, single-flight로 교체] 반응형 401 백스톱
if (upstream.status === 401 && session) {
  const next = await refreshSessionOnce(session, backendApiUrl)
  if (!next) {
    await clearSession()
    return NextResponse.json({ message: '세션이 만료되었습니다. 다시 로그인해 주세요.' }, { status: 401 })
  }
  await setSession(next)
  session = next
  upstream = await forward(req, backendApiUrl, joined, search, session, body)
}
```

> 반응형 경로의 실패 처리는 기존과 동일(`clearSession + 401`). 여기서 익명 재시도를 하지 않는 이유: 백엔드가 이미 토큰을 받고 401을 준 = 보호 엔드포인트이므로 익명 재시도해도 401. 익명 폴백이 의미 있는 건 "만료를 미리 알고 안 보내는" 선재발급 경로뿐(공개 엔드포인트가 200 뜨게).

## 데이터 흐름 (요약)

1. 요청 → `getSession()`.
2. 만료 감지(`exp` 디코드) → single-flight `refreshSessionOnce`.
   - 성공 → `setSession` + 새 토큰으로 forward.
   - 실패 → `clearSession` + 토큰 없이 forward(공개 200 / 보호 401).
3. 만료 아님 → 기존대로 forward. (혹시 401이면 반응형 백스톱이 single-flight로 1회 재발급·재시도.)

## 에러 처리 / 엣지

- accessToken이 JWT 아님 / `exp` 없음 → `isAccessTokenExpired=false` → 선재발급 스킵(반응형에 위임). (명세상 accessToken은 JWT이므로 정상 경로에선 발생하지 않음.)
- `refreshSessionOnce`의 `reissueSession`은 실패 시 `null` 반환(throw 아님). fetch 자체가 throw하면 route가 500 — 이는 기존 동작과 동일(네트워크 장애).
- clock skew 30초: 곧 만료될 토큰도 미리 갱신해 경계 레이스 감소.
- 동시성: 같은 refreshToken 8개 동시 요청 → 1회 reissue 공유 → 모두 동일한 new 세션으로 `setSession`(동일 값, 마지막 기록 승리, 정합). 회전된 refreshToken(R2) 일괄 사용.

## 제약 / 한계 (기록)

- single-flight는 **모듈 레벨 in-memory** — 단일 Node 프로세스(dev·단일 컨테이너) 기준. 멀티인스턴스 서버리스에선 인스턴스 간 합류가 안 됨(각 인스턴스별 최대 1회 reissue). 현 배포 형태에선 충분하며, 확장 시 분산락은 별도 과제.
- 근본 원인(백엔드가 만료 토큰에 500)은 백엔드에서 401로 고쳐야 함. 본 설계는 FE 견고화이며 백엔드 수정과 배타적이지 않다.

## 테스트 계획

- `jwt.test.ts`: `decodeJwtExp`(정상 JWT·비JWT·exp없음·깨진 base64 → 각각 값/null), `isAccessTokenExpired`(만료·임박(skew)·유효·exp없음, `nowMs` 주입).
- `refresh-single-flight.test.ts`: N개 동시 호출 → 주입한 reissue가 **정확히 1회** 호출(카운터), 모두 동일 결과. 정착 후 재호출 시 새 reissue 1회(맵 정리 확인). reissue가 null이면 null 전파.
- `app/api/bff/[...path]/route.test.ts`(기존 파일에 추가): (a) 만료 토큰 → 재발급 호출 후 **새 토큰으로 forward**, (b) 재발급 실패 → `clearSession` 호출 + **토큰 없이 forward**(익명), (c) 유효 토큰 → 재발급 미호출, (d) 유효 토큰인데 백엔드 401 → 반응형 재발급·재시도(기존 동작 유지).

## 파일 요약

| 파일                                         | 변경                                                 |
| -------------------------------------------- | ---------------------------------------------------- |
| `src/lib/auth/jwt.ts`                        | 신규 — `decodeJwtExp`, `isAccessTokenExpired`        |
| `src/lib/auth/jwt.test.ts`                   | 신규                                                 |
| `src/lib/auth/refresh-single-flight.ts`      | 신규 — `refreshSessionOnce`                          |
| `src/lib/auth/refresh-single-flight.test.ts` | 신규                                                 |
| `app/api/bff/[...path]/route.ts`             | 수정 — 선재발급 블록 + 반응형 경로 single-flight화   |
| `app/api/bff/[...path]/route.test.ts`        | 수정 — 케이스 추가                                   |
| `docs/features/auth/session-bff.md`          | 수정 — 선재발급·익명 폴백 동작 반영(D 항목/시나리오) |

## 검증

완료 전 `pnpm qa:verify`(format:check && lint && typecheck && build) 통과. 만료 토큰 시나리오는 dev 서버에서 만료 JWT를 세션에 넣어(또는 skew를 크게 잡아) 공개 API가 200 유지되는지 확인.
