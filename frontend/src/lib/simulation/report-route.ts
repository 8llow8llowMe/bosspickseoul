/**
 * 리포트·비교 화면의 **조건 ↔ 쿼리스트링** 변환.
 *
 * 조건의 정본을 URL 에 두는 이유: 리포트는 `POST` 로 계산하지만 화면 입장에서는
 * "이 조건의 결과"라는 **읽기**다. 클라이언트 메모리에 조건을 들고 있으면 새로고침·뒤로가기·
 * 링크 공유에서 화면이 빈다. (지도 셸이 카메라를 URL 에 담은 것과 같은 이유다.)
 *
 * 검증은 **직접 하지 않고** `conditions.ts` 의 판정을 재사용한다 — 화면과 URL 이 서로 다른
 * "유효한 조건"을 갖게 되는 순간 사용자가 고르지도 않은 조건으로 404 가 난다.
 *
 * `prefix` 는 비교 화면(`a.` / `b.`)용이다. 좌우가 같은 코덱을 쓰게 해서 한쪽만 규칙이
 * 어긋나는 사고를 없앤다.
 *
 * ## 코덱이 두 벌인 이유
 *
 * - **요청 코덱**(`toSimulationReportSearchParams`) — 완성된 `SimulationReportRequest` 만 싣는다.
 *   `simulationReportQueryKey` 가 이 결과로 캐시 키를 만들므로 **표시 전용 값을 넣으면 안 된다.**
 *   `brandName` 이 키에 섞이면 같은 조건이 브랜드명 유무로 두 캐시로 갈린다.
 * - **조건 코덱**(`toSimulationConditionSearchParams`) — 미완성 조건도, `brandName` 도 싣는다.
 *   리포트에서 입력 화면으로 **되돌아갈 때** 쓴다. 조건을 싣지 않으면 사용자가 고른 4개가
 *   그 자리에서 증발한다.
 */

import {
  createSimulationConditionState,
  toSimulationReportRequest,
  type SimulationConditionState,
} from '@/lib/simulation/conditions'
import type {
  SimulationFloorType,
  SimulationReportRequest,
} from '@/types/simulation'

type SearchParamsReader = { get(name: string): string | null }

export type SimulationReportVariant = 'standalone' | 'analysis'

const BUILDER_PATH: Record<SimulationReportVariant, string> = {
  standalone: '/simulation',
  analysis: '/analysis/simulation',
}

const REPORT_PATH: Record<SimulationReportVariant, string> = {
  standalone: '/simulation/report',
  analysis: '/analysis/simulation/report',
}

export const toSimulationReportSearchParams = (
  request: SimulationReportRequest,
  prefix = '',
): URLSearchParams => {
  const params = new URLSearchParams()
  const key = (name: string) => `${prefix}${name}`

  params.set(key('franchisee'), request.franchisee ? 'true' : 'false')
  if (request.franchiseeId !== null && request.franchiseeId !== undefined) {
    params.set(key('franchiseeId'), String(request.franchiseeId))
  }
  params.set(key('districtCode'), request.districtCode)
  params.set(key('serviceCode'), request.serviceCode)
  params.set(key('storeSize'), String(request.storeSize))
  params.set(key('floorType'), request.floorType)

  return params
}

/**
 * 조건 상태 → 쿼리스트링. **미완성 조건도 싣고**, 비어 있는 칸은 키째 뺀다.
 *
 * 요청 코덱과 **키 이름이 같다** — 그래야 리포트 URL(요청 코덱이 만든다)을 그대로
 * `parseSimulationConditionState` 로 읽어 되돌아갈 수 있다.
 */
export const toSimulationConditionSearchParams = (
  state: SimulationConditionState,
  prefix = '',
): URLSearchParams => {
  const params = new URLSearchParams()
  const set = (name: string, value: string) =>
    params.set(`${prefix}${name}`, value)

  if (state.franchisee !== null) {
    set('franchisee', state.franchisee ? 'true' : 'false')
  }
  if (state.franchiseeId !== null) {
    set('franchiseeId', String(state.franchiseeId))
  }
  if (state.brandName) set('brandName', state.brandName)
  if (state.districtCode) set('districtCode', state.districtCode)
  if (state.serviceCode) set('serviceCode', state.serviceCode)
  if (state.storeSize !== null) set('storeSize', String(state.storeSize))
  if (state.floorType) set('floorType', state.floorType)

  return params
}

const readInteger = (raw: string | null): number | null => {
  if (raw === null || !/^\d+$/.test(raw)) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) ? value : null
}

/**
 * 쿼리스트링 → 조건 상태. **완성 여부를 묻지 않는다** — 읽을 수 있는 만큼만 읽는다.
 *
 * 손상되거나 지원하지 않는 값은 `createSimulationConditionState` 가 조용히 버리므로,
 * 절반만 유효한 링크로 돌아와도 유효한 절반은 살아남는다.
 */
export const parseSimulationConditionState = (
  params: SearchParamsReader,
  prefix = '',
): SimulationConditionState => {
  const read = (name: string): string | null => {
    const value = params.get(`${prefix}${name}`)?.trim()
    return value ? value : null
  }

  const franchiseeRaw = read('franchisee')
  const franchisee =
    franchiseeRaw === 'true' ? true : franchiseeRaw === 'false' ? false : null

  const floorRaw = read('floorType')
  const floorType: SimulationFloorType | null =
    floorRaw === 'FIRST_FLOOR' || floorRaw === 'OTHER' ? floorRaw : null

  return createSimulationConditionState({
    franchisee,
    franchiseeId: readInteger(read('franchiseeId')),
    brandName: read('brandName'),
    districtCode: read('districtCode'),
    serviceCode: read('serviceCode'),
    storeSize: readInteger(read('storeSize')),
    floorType,
  })
}

/**
 * 쿼리스트링 → 요청 본문. **조건이 하나라도 유효하지 않으면 null.**
 *
 * null 을 오류로 취급하지 않는다 — 화면은 "조건이 없어요 + 조건 고르러 가기"를 보여준다.
 * 손상된 링크에 대고 400 을 받아오는 것보다 낫다.
 * (프랜차이즈인데 브랜드가 없으면 여기서 걸린다 — `isSimulationSectionComplete('service')`.)
 */
export const parseSimulationReportRequest = (
  params: SearchParamsReader,
  prefix = '',
): SimulationReportRequest | null =>
  toSimulationReportRequest(parseSimulationConditionState(params, prefix))

/**
 * 입력 화면 경로. 리포트에서 "조건 다시 고르기"로 돌아갈 때 쓴다.
 *
 * `state` 를 주면 조건을 쿼리로 실어 **고른 조건이 살아 있는 채로** 되돌려 보낸다.
 * 실을 조건이 하나도 없으면 쿼리 없는 맨 경로다.
 */
export const simulationBuilderHref = (
  variant: SimulationReportVariant = 'standalone',
  state?: SimulationConditionState | null,
): string => {
  const path = BUILDER_PATH[variant]
  if (!state) return path

  const params = toSimulationConditionSearchParams(state)
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

/**
 * 리포트 경로. `brandName` 은 **표시 전용으로만 덧실린다** — 요청 파싱도 캐시 키도 이 키를
 * 보지 않는다. 실어 보내는 이유는 하나, 리포트에서 입력 화면으로 되돌아갈 때 브랜드명까지
 * 복원하기 위해서다(아이디만으로는 어느 브랜드였는지 화면에 쓸 수 없다).
 */
export const buildSimulationReportHref = (
  request: SimulationReportRequest,
  variant: SimulationReportVariant = 'standalone',
  brandName?: string | null,
): string => {
  const params = toSimulationReportSearchParams(request)
  const trimmed = brandName?.trim()
  if (request.franchisee && trimmed) params.set('brandName', trimmed)

  return `${REPORT_PATH[variant]}?${params}`
}
