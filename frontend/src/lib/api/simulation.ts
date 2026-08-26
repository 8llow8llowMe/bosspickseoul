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
 */

import { apiClient } from '@/lib/api/client'
import type {
  SimulationComparisonRequestPair,
  SimulationFranchiseesResponse,
  SimulationHistoriesResponse,
  SimulationHistorySaveRequest,
  SimulationHistorySaveResponse,
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

  return response.data
}

/** `POST /simulations/reports` — **동기 계산**. 공개. 폴링·SSE 없이 한 번에 결과가 온다. */
export const createSimulationReport = async (
  payload: SimulationReportRequest,
) => {
  const response = await apiClient.post<SimulationReportResponse>(
    '/simulations/reports',
    payload,
  )

  return response.data
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
