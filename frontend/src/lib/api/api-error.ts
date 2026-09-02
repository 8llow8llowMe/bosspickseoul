import type {
  ApiFieldError,
  ApiMessage,
  ApiResponse,
  ApiValidationMessage,
} from '@/types/api'

/**
 * API 실패의 종류. **에러코드가 아니라 HTTP 상태로 분기한다.**
 * 백엔드 공통 규약(`backend/docs/api-reference.md` "오류 처리 규약")에 따라
 * "재시도하면 결과가 달라질 수 있는가"가 유일한 판별 기준이다.
 *
 * - `network`: 응답 자체가 없음 (통신 실패/타임아웃) → 재시도 유효
 * - `server`: 5xx 일시 장애 → 재시도 유효
 * - `not-found`: 404 데이터 부재 → **재시도해도 같다. 재시도 버튼을 띄우지 않는다.**
 * - `unauthorized`: 401/403 → 로그인/권한 유도
 * - `client`: 그 외 4xx (검증 실패, 만료 등) → 원인별 안내
 */
export type ApiErrorKind =
  | 'network'
  | 'server'
  | 'not-found'
  | 'unauthorized'
  | 'client'

export type NormalizedApiError = {
  kind: ApiErrorKind
  /** HTTP 상태. 응답이 없으면 null. */
  status: number | null
  /** `dataHeader.resultCode` (예: COMMERCIAL_006). UI 분기에 쓰지 말고 로깅·디버깅용으로만 쓴다. */
  code: string | null
  /** 사용자에게 그대로 보여줄 문구. 서버 메시지를 최우선으로 쓴다. */
  message: string
  /** 요청 검증 실패 시 필드별 오류. 폼에 매핑한다. */
  fieldErrors: ApiFieldError[]
}

const DEFAULT_MESSAGE: Record<ApiErrorKind, string> = {
  network: '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
  server: '일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
  'not-found': '요청한 데이터가 없습니다.',
  unauthorized: '로그인이 필요합니다.',
  client: '요청을 처리하지 못했습니다.',
}

/**
 * HTTP 상태 → 종류. 상태가 없으면(무응답) `network`.
 *
 * `0` 이하도 `network` 다 — CORS 차단이나 프록시 조기 종료로 status 0 인 응답 객체가 붙는 경우가 있고,
 * 규약상 "상태 코드 자체가 없음"은 통신 실패다.
 */
export const classifyStatus = (status: number | null): ApiErrorKind => {
  if (status === null || status <= 0) return 'network'
  if (status >= 500) return 'server'
  if (status === 404) return 'not-found'
  if (status === 401 || status === 403) return 'unauthorized'
  if (status >= 400) return 'client'
  // 2xx/3xx인데 dataHeader.success가 false인 경우 — 요청 자체의 문제로 취급한다.
  return 'client'
}

/**
 * 재시도 버튼을 띄워도 되는가.
 * **UI는 이 함수로만 재시도 노출을 결정한다.** 상태 코드를 직접 비교하지 않는다.
 */
export const isRetryable = (kind: ApiErrorKind): boolean =>
  kind === 'network' || kind === 'server'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readFieldErrors = (message: ApiMessage): ApiFieldError[] => {
  if (!isRecord(message)) return []
  const { errors } = message as ApiValidationMessage
  if (!Array.isArray(errors)) return []
  // 타입은 선언일 뿐 런타임 보장이 아니라서 unknown 으로 낮춰 놓고 직접 확인한다.
  // `field` 까지 확인해야 폼 매핑이 안전하다 — 없는 항목을 통과시키면 소비자가
  // `errors[i].field` 로 인풋을 찾을 때 조용히 `undefined` 키가 만들어진다.
  return (errors as unknown[])
    .filter(
      (item): item is Record<string, unknown> =>
        isRecord(item) &&
        typeof item.message === 'string' &&
        typeof item.field === 'string',
    )
    .map(item => ({
      code: typeof item.code === 'string' ? item.code : null,
      field: item.field as string,
      message: item.message as string,
    }))
}

/**
 * `resultMessage`를 사람이 읽을 한 문장으로 만든다.
 *
 * 검증 실패 응답은 `{ message, errors[] }` 객체다. 예전 구현이 `Object.values(...).join()`을
 * 쓰는 바람에 `errors` 배열이 `[object Object]`로 찍혔다 — 그래서 형태별로 분기한다.
 */
export const readApiMessage = (message: ApiMessage): string | null => {
  if (typeof message === 'string') {
    return message.trim() || null
  }
  if (!isRecord(message)) return null

  const { message: summary } = message as ApiValidationMessage
  if (typeof summary === 'string' && summary.trim()) {
    return summary.trim()
  }

  const fieldMessages = readFieldErrors(message).map(item => item.message)
  return fieldMessages.length > 0 ? fieldMessages.join('\n') : null
}

const isApiResponse = (value: unknown): value is ApiResponse<unknown> =>
  isRecord(value) && isRecord(value.dataHeader)

/** axios 에러가 아니어도 되도록 최소한의 형태만 본다. */
const readStatus = (error: unknown): number | null => {
  if (!isRecord(error)) return null
  const response = error.response
  if (isRecord(response) && typeof response.status === 'number') {
    return response.status
  }
  if (typeof error.status === 'number') return error.status
  return null
}

const readResponseBody = (error: unknown): unknown => {
  if (!isRecord(error)) return undefined
  const response = error.response
  return isRecord(response) ? response.data : undefined
}

const build = (
  kind: ApiErrorKind,
  status: number | null,
  header: { resultCode?: string | null; resultMessage?: ApiMessage } | null,
): NormalizedApiError => ({
  kind,
  status,
  code: header?.resultCode ?? null,
  message:
    readApiMessage(header?.resultMessage ?? null) ?? DEFAULT_MESSAGE[kind],
  fieldErrors: readFieldErrors(header?.resultMessage ?? null),
})

/**
 * 사용자가 화면을 떠나거나 조건을 바꿔서 **취소된** 요청인가.
 *
 * 취소는 실패가 아니다. 오류 배너를 띄우거나 재시도하면 안 된다.
 * (`use-ai-report.ts` 가 AbortController 로 SSE/폴링을 끊는다.)
 */
export const isCanceledError = (error: unknown): boolean => {
  if (!isRecord(error)) return false
  return (
    error.name === 'AbortError' ||
    error.name === 'CanceledError' ||
    error.code === 'ERR_CANCELED'
  )
}

/**
 * 응답 객체가 없는 에러의 종류를 정한다.
 *
 * 상태가 없다고 전부 통신 실패는 아니다. 이 저장소는 "200 + `dataHeader.success=false`" 를
 * 쿼리 함수에서 **직접 throw** 하는 곳이 있다(`community-list-page.tsx` 의 `CommunityListQueryError` 등).
 * 그걸 `network` 로 보면 서버가 준 문구가 사라지고, 재시도해도 같은 결과인데 재시도 버튼이 붙는다.
 *
 * 그래서 통신 실패라고 판별할 수 있는 것만 `network` 로 두고, 나머지 앱이 던진 오류는
 * 재시도 대상이 아닌 `client` 로 보수적으로 분류한다.
 */
const classifyResponselessError = (error: unknown): ApiErrorKind => {
  if (!isRecord(error)) return 'network'
  // axios 의 통신 실패·타임아웃(ERR_NETWORK / ECONNABORTED)은 response 없이 온다.
  if (error.isAxiosError === true) return 'network'
  // fetch 의 통신 실패는 `TypeError: Failed to fetch`.
  if (error.name === 'TypeError') return 'network'
  // 앱이 던진 도메인 오류 — 메시지를 살리고 재시도하지 않는다.
  if (typeof error.message === 'string' && error.message.trim()) return 'client'
  return 'network'
}

/**
 * **앱이 직접 던진** 오류의 문구를 꺼낸다. 아니면 null.
 *
 * 화면들은 "200 인데 `dataHeader.success === false`" 를 `new Error(getApiMessage(...))` 로
 * 바꿔 던진다. 그 문구는 서버가 준 것이라 그대로 보여 줘야 하는데, `normalizeApiError` 에
 * 넣으면 응답 객체가 없어 통신 실패로 보고 "네트워크 연결을 확인…"으로 덮어 버린다.
 *
 * 그래서 분류기들은 정규화 **전에** 이 함수로 먼저 걸러 낸다. 두 곳(`analysis-bookmark`,
 * `share-errors`)이 같은 판단을 하므로 한 곳에 둔다 — 나뉘어 있으면 조용히 어긋난다.
 */
export const readAppThrownMessage = (error: unknown): string | null => {
  if (isRecord(error) && error.isAxiosError === true) return null
  if (!(error instanceof Error)) return null
  return error.message || null
}

/**
 * 던져진 에러(axios rejection, 앱이 throw 한 도메인 오류 등)를 정규화한다.
 *
 * BFF(`/api/bff`)는 백엔드 상태 코드를 그대로 통과시키므로 `response.status`가 곧 백엔드 상태다.
 * 단 세션 만료 시 BFF가 자체 401(`{ message }`)을 만들어 내려보내므로 그 형태도 받아준다.
 *
 * **취소된 요청은 이 함수로 판별할 수 없다.** 호출 전에 `isCanceledError` 로 걸러라
 * (`resolveApiError` 는 이미 걸러 준다).
 */
export const normalizeApiError = (error: unknown): NormalizedApiError => {
  const status = readStatus(error)
  const body = readResponseBody(error)

  if (status === null && body === undefined) {
    const kind = classifyResponselessError(error)
    const message =
      isRecord(error) && typeof error.message === 'string'
        ? error.message.trim()
        : ''
    // axios 가 만드는 "Network Error" / "timeout of 0ms exceeded" 는 사용자에게 보여줄 문구가 아니다.
    const usable = kind === 'client' && message ? message : null
    return build(
      kind,
      null,
      usable ? { resultCode: null, resultMessage: usable } : null,
    )
  }

  const kind = classifyStatus(status)

  if (isApiResponse(body)) {
    return build(kind, status, body.dataHeader)
  }

  // BFF 자체 응답(`{ message: '세션이 만료되었습니다...' }`)
  if (isRecord(body) && typeof body.message === 'string') {
    return build(kind, status, {
      resultCode: null,
      resultMessage: body.message,
    })
  }

  return build(kind, status, null)
}

/**
 * HTTP는 성공했지만 `dataHeader.success === false`인 응답을 정규화한다.
 * 성공 응답이면 null.
 */
export const normalizeApiResponseFailure = (
  response: ApiResponse<unknown> | null | undefined,
  status: number | null = null,
): NormalizedApiError | null => {
  if (!response || response.dataHeader.success === true) return null
  // 본문이 도착했으므로 통신 실패는 아니다. 상태를 모르면 "요청 자체의 문제"로 보수적으로 둔다
  // — network 로 잡으면 재시도해도 같은 결과인데 재시도 버튼이 붙는다.
  const kind = status === null ? 'client' : classifyStatus(status)
  return build(kind, status, response.dataHeader)
}

/**
 * React Query의 `{ error, data }` 한 쌍을 받아 화면에 보여줄 오류로 환산한다.
 * 오류가 없으면 null — 컴포넌트는 `error={resolveApiError(query)}` 형태로 그대로 넘기면 된다.
 *
 * 이 저장소의 화면들은 두 경로로 실패한다.
 * ① axios rejection (`query.isError`) ② 200이지만 `dataHeader.success === false` 인 body.
 * 둘을 한 곳에서 흡수한다.
 */
export const resolveApiError = (query: {
  error?: unknown
  data?: unknown
}): NormalizedApiError | null => {
  // 취소는 실패가 아니다 — 화면에 아무것도 띄우지 않는다.
  if (isCanceledError(query.error)) return null
  if (query.error) return normalizeApiError(query.error)
  if (isApiResponse(query.data)) {
    return normalizeApiResponseFailure(query.data as ApiResponse<unknown>)
  }
  return null
}

/**
 * React Query `retry` 옵션용. 재시도해도 결과가 같은 실패(404/4xx)는 재시도하지 않는다.
 *
 * 사용: `useQuery({ retry: retryUnlessClientError() })` 또는 `retry: retryUnlessClientError(2)`
 */
export const retryUnlessClientError =
  (max = 1) =>
  (failureCount: number, error: unknown): boolean => {
    if (isCanceledError(error)) return false
    return isRetryable(normalizeApiError(error).kind) && failureCount < max
  }
