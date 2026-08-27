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
 */

import {
  createSimulationConditionState,
  isSimulationConditionsComplete,
  toSimulationReportRequest,
  type SimulationConditionState,
} from '@/lib/simulation/conditions'
import type {
  SimulationFloorType,
  SimulationReportRequest,
} from '@/types/simulation'

type SearchParamsReader = { get(name: string): string | null }

export type SimulationReportVariant = 'standalone' | 'analysis'

/** 입력 화면 경로. 리포트에서 "조건 다시 고르기"로 돌아갈 때 쓴다. */
export const simulationBuilderHref = (
  variant: SimulationReportVariant = 'standalone',
): string => (variant === 'analysis' ? '/analysis/simulation' : '/simulation')

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

const readInteger = (raw: string | null): number | null => {
  if (raw === null || !/^\d+$/.test(raw)) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) ? value : null
}

/**
 * 쿼리스트링 → 요청 본문. **조건이 하나라도 유효하지 않으면 null.**
 *
 * null 을 오류로 취급하지 않는다 — 화면은 "조건이 없어요 + 조건 고르러 가기"를 보여준다.
 * 손상된 링크에 대고 400 을 받아오는 것보다 낫다.
 */
export const parseSimulationReportRequest = (
  params: SearchParamsReader,
  prefix = '',
): SimulationReportRequest | null => {
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

  // createSimulationConditionState 가 자치구·업종·크기·층을 검증해 지원하지 않는 값을 버린다.
  const base = createSimulationConditionState({
    franchisee,
    districtCode: read('districtCode'),
    serviceCode: read('serviceCode'),
    storeSize: readInteger(read('storeSize')),
    floorType,
  })

  // franchiseeId 는 createSimulationConditionState 가 다루지 않는다(브랜드는 검색 결과로만 정해지므로).
  const franchiseeId = readInteger(read('franchiseeId'))
  const state: SimulationConditionState =
    franchiseeId !== null ? { ...base, franchiseeId } : base

  // 프랜차이즈인데 브랜드가 없으면 여기서 걸린다 — isSimulationSectionComplete('service') 가 본다.
  if (!isSimulationConditionsComplete(state)) return null

  return toSimulationReportRequest(state)
}

export const buildSimulationReportHref = (
  request: SimulationReportRequest,
  variant: SimulationReportVariant = 'standalone',
): string =>
  `${REPORT_PATH[variant]}?${toSimulationReportSearchParams(request)}`
