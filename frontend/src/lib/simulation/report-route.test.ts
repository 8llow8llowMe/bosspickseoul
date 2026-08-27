import { describe, expect, it } from 'vitest'

import {
  buildSimulationReportHref,
  parseSimulationReportRequest,
  simulationBuilderHref,
  toSimulationReportSearchParams,
} from '@/lib/simulation/report-route'
import type { SimulationReportRequest } from '@/types/simulation'

const personal: SimulationReportRequest = {
  franchisee: false,
  districtCode: '11740',
  serviceCode: 'CS100001',
  storeSize: 66,
  floorType: 'FIRST_FLOOR',
}

const franchise: SimulationReportRequest = {
  franchisee: true,
  franchiseeId: 101,
  districtCode: '11680',
  serviceCode: 'CS100008',
  storeSize: 40,
  floorType: 'OTHER',
}

describe('toSimulationReportSearchParams', () => {
  it('비프랜차이즈면 franchiseeId 키를 싣지 않는다', () => {
    const params = toSimulationReportSearchParams(personal)

    expect(params.get('franchisee')).toBe('false')
    expect(params.has('franchiseeId')).toBe(false)
    expect(params.get('districtCode')).toBe('11740')
    expect(params.get('storeSize')).toBe('66')
    expect(params.get('floorType')).toBe('FIRST_FLOOR')
  })

  it('접두사를 붙이면 모든 키에 붙는다', () => {
    const params = toSimulationReportSearchParams(franchise, 'a.')

    expect(params.get('a.franchisee')).toBe('true')
    expect(params.get('a.franchiseeId')).toBe('101')
    expect(params.has('franchisee')).toBe(false)
  })
})

describe('parseSimulationReportRequest', () => {
  it('왕복 변환이 요청 본문을 그대로 복원한다', () => {
    expect(
      parseSimulationReportRequest(toSimulationReportSearchParams(personal)),
    ).toEqual(personal)
    expect(
      parseSimulationReportRequest(
        toSimulationReportSearchParams(franchise, 'b.'),
        'b.',
      ),
    ).toEqual(franchise)
  })

  it('조건이 하나라도 비면 null 이다', () => {
    const params = toSimulationReportSearchParams(personal)
    params.delete('floorType')

    expect(parseSimulationReportRequest(params)).toBeNull()
  })

  it('지원하지 않는 자치구·업종·층 값은 null 로 떨어뜨린다', () => {
    const bad = new URLSearchParams({
      franchisee: 'false',
      districtCode: '99999',
      serviceCode: 'CS100001',
      storeSize: '66',
      floorType: 'FIRST_FLOOR',
    })
    expect(parseSimulationReportRequest(bad)).toBeNull()

    const badFloor = toSimulationReportSearchParams(personal)
    badFloor.set('floorType', 'BASEMENT')
    expect(parseSimulationReportRequest(badFloor)).toBeNull()
  })

  it('프랜차이즈인데 franchiseeId 가 없으면 null 이다', () => {
    const params = toSimulationReportSearchParams(franchise)
    params.delete('franchiseeId')

    expect(parseSimulationReportRequest(params)).toBeNull()
  })

  it('storeSize 가 0 이하·숫자 아님이면 null 이다', () => {
    for (const value of ['0', '-3', 'abc', '']) {
      const params = toSimulationReportSearchParams(personal)
      params.set('storeSize', value)
      expect(parseSimulationReportRequest(params)).toBeNull()
    }
  })
})

describe('href 빌더', () => {
  it('variant 에 따라 경로가 갈린다', () => {
    expect(buildSimulationReportHref(personal)).toBe(
      `/simulation/report?${toSimulationReportSearchParams(personal)}`,
    )
    expect(buildSimulationReportHref(personal, 'analysis')).toBe(
      `/analysis/simulation/report?${toSimulationReportSearchParams(personal)}`,
    )
    expect(simulationBuilderHref()).toBe('/simulation')
    expect(simulationBuilderHref('analysis')).toBe('/analysis/simulation')
  })
})
