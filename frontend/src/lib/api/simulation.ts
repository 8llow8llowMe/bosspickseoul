/**
 * 창업 시뮬레이션 V2 API 클라이언트.
 *
 * 브라우저는 BFF(`/api/bff`)만 호출하고 BFF가 `/api/v1/{path}`로 프록시한다.
 * 따라서 여기의 경로에는 `/api/v1` 접두사가 없다.
 *
 * 인증: `store-sizes` / `franchisees` / `reports`는 공개, `histories`(저장·목록)만 인증 필수다.
 * 비로그인 사용자도 시뮬레이션을 돌릴 수 있으므로 "저장"에서만 로그인을 유도한다.
 *
 * 오류: 이 파일은 오류를 삼키지 않는다. 호출부에서 `@/lib/api/api-error`의
 * `resolveApiError` / `retryUnlessClientError`로 분류한다 (404에는 재시도 버튼을 붙이지 않는다).
 *
 * ## 아이디 정규화 — 계약이 방향에 따라 다르다
 *
 * 백엔드는 **응답의 아이디를 전부 문자열로** 준다(`"14954"`). 반면 **요청 계약은 `integer/int64`**다.
 * 그래서 응답을 그대로 흘려보내면 `franchiseeId === selectedFranchiseeId` 같은 비교가
 * `'14954' !== 14954`로 조용히 어긋난다 — 고른 브랜드가 선택 표시되지 않고, 조건 비교가 틀어진다.
 *
 * 이 파일이 **경계에서 한 번** number로 맞춘다. 화면·상태·URL 코덱은 전부 number만 본다.
 * (문자열은 직렬화 정책일 뿐 값은 작은 정수다 — Snowflake가 아니다. 애초에 요청이 integer를
 * 요구하므로 어느 쪽이든 number로 보낼 수밖에 없다.)
 */

import { apiClient } from '@/lib/api/client'
import { getResponseBody } from '@/lib/api/response'
import type {
  SimulationComparisonRequestPair,
  SimulationFranchisees,
  SimulationFranchiseesResponse,
  SimulationHistoriesResponse,
  SimulationHistorySaveRequest,
  SimulationHistorySaveResponse,
  SimulationReport,
  SimulationReportRequest,
  SimulationReportResponse,
  SimulationStoreSizesResponse,
} from '@/types/simulation'

/** `GET /simulations/histories`의 서버 상한. 초과하면 400 `SIMULATION_109`. */
export const SIMULATION_HISTORY_MAX_PAGE_SIZE = 50

/**
 * 프랜차이즈 검색 쿼리스트링을 만든다.
 *
 * V1은 `keyword=&lastId=0`처럼 빈 값·0을 항상 실어 보냈다. V2의 `lastId`는 **커서**라서
 * 첫 조회에 0을 보내면 "0번 다음부터"라는 다른 의미가 된다 — 그래서 비어 있는 값은 **키 자체를 뺀다.**
 */
export const buildFranchiseeSearchParams = (params: {
  serviceCode: string
  keyword?: string | null
  lastId?: number | null
}): URLSearchParams => {
  const search = new URLSearchParams({ serviceCode: params.serviceCode })

  const keyword = params.keyword?.trim()
  if (keyword) search.set('keyword', keyword)
  if (params.lastId !== null && params.lastId !== undefined) {
    search.set('lastId', String(params.lastId))
  }

  return search
}

/**
 * 마법사 입력을 리포트 요청 본문으로 정규화한다.
 *
 * - 비프랜차이즈면 `franchiseeId`를 **키째로 제거**한다. `null`을 보내도 서버는 통과시키지만,
 *   요청 본문이 화면 상태를 그대로 반영하는 편이 디버깅에 낫다.
 * - 빈 `periodCode`는 제거해 서버 기본값(20233)을 쓰게 한다. `''`를 보내면 400 `SIMULATION_106`이다.
 */
export const buildSimulationReportRequest = (input: {
  franchisee: boolean
  franchiseeId?: number | null
  districtCode: string
  serviceCode: string
  storeSize: number
  floorType: SimulationReportRequest['floorType']
  periodCode?: string | null
}): SimulationReportRequest => {
  const request: SimulationReportRequest = {
    franchisee: input.franchisee,
    districtCode: input.districtCode,
    serviceCode: input.serviceCode,
    storeSize: input.storeSize,
    floorType: input.floorType,
  }

  if (
    input.franchisee &&
    input.franchiseeId !== null &&
    input.franchiseeId !== undefined
  ) {
    request.franchiseeId = input.franchiseeId
  }

  const periodCode = input.periodCode?.trim()
  if (periodCode) request.periodCode = periodCode

  return request
}

/** 리포트 요청을 저장 요청으로 옮긴다. `periodCode`는 저장 계약에 없으므로 버린다. */
export const buildSimulationHistorySaveRequest = (
  request: SimulationReportRequest,
  totalPrice: number,
): SimulationHistorySaveRequest => {
  const payload: SimulationHistorySaveRequest = {
    franchisee: request.franchisee,
    districtCode: request.districtCode,
    serviceCode: request.serviceCode,
    storeSize: request.storeSize,
    floorType: request.floorType,
    totalPrice,
  }

  if (
    request.franchisee &&
    request.franchiseeId !== null &&
    request.franchiseeId !== undefined
  ) {
    payload.franchiseeId = request.franchiseeId
  }

  return payload
}

/* ------------------------------------------------------------------ *
 * 응답 아이디 정규화
 * ------------------------------------------------------------------ */

/**
 * 문자열로 온 아이디를 number로. **읽어낼 수 없으면 null**이고, 호출부가 원래 값을 남긴다.
 *
 * 파싱 실패에 `NaN`이나 `0`을 만들지 않는 것이 요점이다. `lastId: 0`은 "처음부터"가 아니라
 * "0번 다음부터"라는 커서이고, `NaN`은 비교에서 전부 false가 되어 원인이 화면에 드러나지 않는다.
 */
const toNumericId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : null
  }
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!/^-?\d+$/.test(trimmed)) return null

  const parsed = Number(trimmed)
  return Number.isSafeInteger(parsed) ? parsed : null
}

/** nullable 아이디용. `null`/`undefined`는 의미 있는 값이라 그대로 통과시킨다. */
const toNullableNumericId = (
  value: number | null | undefined,
): number | null =>
  value === null || value === undefined ? null : (toNumericId(value) ?? value)

/**
 * 아이디를 든 항목 배열을 정규화한다. **배열이 아니면 손대지 않고 그대로 돌려준다.**
 *
 * 이 정규화는 모든 응답이 지나가는 길목이다. 계약에 있는 필드가 어떤 이유로 빠져 있을 때
 * 여기서 던지면 200 응답이 통째로 빈 화면이 된다 — 표시 단계에서 드러나는 편이 낫다.
 */
const normalizeFranchiseeIds = <T extends { franchiseeId: number }>(
  items: T[] | undefined,
): T[] | undefined =>
  Array.isArray(items)
    ? items.map(item => ({
        ...item,
        franchiseeId: toNumericId(item.franchiseeId) ?? item.franchiseeId,
      }))
    : items

/** `GET /simulations/store-sizes` — 업종별 소/중/대 프리셋(㎡·평)과 기준 연도. 공개. */
export const fetchSimulationStoreSizes = async (serviceCode: string) => {
  const response = await apiClient.get<SimulationStoreSizesResponse>(
    `/simulations/store-sizes?${new URLSearchParams({ serviceCode })}`,
  )

  return response.data
}

/** `GET /simulations/franchisees` — 브랜드 커서 검색(최대 10건). 공개. 업종 선택이 선행돼야 한다. */
export const fetchSimulationFranchisees = async (params: {
  serviceCode: string
  keyword?: string | null
  lastId?: number | null
}) => {
  const response = await apiClient.get<SimulationFranchiseesResponse>(
    `/simulations/franchisees?${buildFranchiseeSearchParams(params)}`,
  )

  const body = getResponseBody(response.data)
  if (!body) return response.data

  const normalized: SimulationFranchisees = {
    ...body,
    franchisees: normalizeFranchiseeIds(
      body.franchisees,
    ) as SimulationFranchisees['franchisees'],
    lastId: toNullableNumericId(body.lastId),
  }

  return { ...response.data, dataBody: normalized }
}

/** `POST /simulations/reports` — **동기 계산**. 공개. 폴링·SSE 없이 한 번에 결과가 온다. */
export const createSimulationReport = async (
  payload: SimulationReportRequest,
) => {
  const response = await apiClient.post<SimulationReportResponse>(
    '/simulations/reports',
    payload,
  )

  const body = getResponseBody(response.data)
  if (!body) return response.data

  const normalized: SimulationReport = {
    ...body,
    condition: body.condition
      ? {
          ...body.condition,
          franchiseeId: toNullableNumericId(body.condition.franchiseeId),
        }
      : body.condition,
    similarFranchisees: normalizeFranchiseeIds(
      body.similarFranchisees,
    ) as SimulationReport['similarFranchisees'],
  }

  return { ...response.data, dataBody: normalized }
}

/**
 * 비교 화면용 — V2에 비교 API가 없어 리포트를 **2회 병렬 호출**한다.
 * 한쪽만 실패해도 비교가 성립하지 않으므로 `Promise.all`로 함께 실패시킨다.
 */
export const createSimulationReportPair = async (
  pair: SimulationComparisonRequestPair,
) => {
  const [left, right] = await Promise.all([
    createSimulationReport(pair[0]),
    createSimulationReport(pair[1]),
  ])

  return [left, right] as const
}

/** `POST /simulations/histories` — 결과 저장. **인증 필수.** 서버가 명칭을 되채워 저장본을 돌려준다. */
export const saveSimulationHistory = async (
  payload: SimulationHistorySaveRequest,
) => {
  const response = await apiClient.post<SimulationHistorySaveResponse>(
    '/simulations/histories',
    payload,
  )

  return response.data
}

/** `GET /simulations/histories` — 본인 이력 최신순. **인증 필수.** `size`는 1~50. */
export const fetchSimulationHistories = async (page = 0, size = 10) => {
  const response = await apiClient.get<SimulationHistoriesResponse>(
    `/simulations/histories?${new URLSearchParams({
      page: String(page),
      size: String(size),
    })}`,
  )

  return response.data
}
