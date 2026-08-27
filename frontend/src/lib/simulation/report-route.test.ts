import { describe, expect, it } from 'vitest'

import {
  buildSimulationReportHref,
  parseSimulationConditionState,
  parseSimulationReportRequest,
  simulationBuilderHref,
  toSimulationConditionSearchParams,
  toSimulationReportSearchParams,
} from '@/lib/simulation/report-route'
import { createEmptySimulationConditionState } from '@/lib/simulation/conditions'
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

describe('조건 상태 코덱', () => {
  it('부분 조건도 싣고, 비어 있는 키는 뺀다', () => {
    const params = toSimulationConditionSearchParams({
      ...createEmptySimulationConditionState(),
      districtCode: '11740',
    })

    expect(params.get('districtCode')).toBe('11740')
    expect(params.has('franchisee')).toBe(false)
    expect(params.has('storeSize')).toBe(false)
    expect(params.has('floorType')).toBe(false)
  })

  it('brandName 을 함께 실어 왕복이 무손실이다', () => {
    const state = {
      ...createEmptySimulationConditionState(),
      franchisee: true,
      franchiseeId: 101,
      brandName: '테스트브랜드',
      districtCode: '11680',
      serviceCode: 'CS100008',
      storeSize: 40,
      floorType: 'OTHER' as const,
    }

    expect(
      parseSimulationConditionState(toSimulationConditionSearchParams(state)),
    ).toEqual(state)
  })

  it('완성되지 않은 조건도 상태로는 복원한다 (요청 파서와 다른 점)', () => {
    const params = new URLSearchParams({
      franchisee: 'true',
      districtCode: '11740',
    })

    expect(parseSimulationConditionState(params)).toEqual({
      ...createEmptySimulationConditionState(),
      franchisee: true,
      districtCode: '11740',
    })
    // 같은 쿼리로 요청은 만들 수 없다 — 조건이 비어 있기 때문이다.
    expect(parseSimulationReportRequest(params)).toBeNull()
  })

  it('접두사를 붙이면 모든 키에 붙는다', () => {
    const params = toSimulationConditionSearchParams(
      { ...createEmptySimulationConditionState(), districtCode: '11740' },
      'a.',
    )

    expect(params.get('a.districtCode')).toBe('11740')
    expect(params.has('districtCode')).toBe(false)
  })

  it('요청 코덱이 만든 쿼리도 그대로 상태로 읽는다', () => {
    // 리포트 URL(요청 코덱으로 만들어진다)에서 되돌아올 때 쓰는 경로다.
    expect(
      parseSimulationConditionState(toSimulationReportSearchParams(personal)),
    ).toEqual({
      ...createEmptySimulationConditionState(),
      franchisee: false,
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR',
    })
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

  it('리포트 href 는 brandName 을 표시용으로만 덧싣는다', () => {
    const href = buildSimulationReportHref(
      franchise,
      'standalone',
      '테스트브랜드',
    )

    expect(href).toContain(
      'brandName=%ED%85%8C%EC%8A%A4%ED%8A%B8%EB%B8%8C%EB%9E%9C%EB%93%9C',
    )
    // 캐시 키를 만드는 요청 코덱은 오염되지 않는다.
    expect(toSimulationReportSearchParams(franchise).has('brandName')).toBe(
      false,
    )
    // 덧실은 키는 요청 파싱에 영향을 주지 않는다.
    expect(
      parseSimulationReportRequest(
        new URLSearchParams(href.slice(href.indexOf('?') + 1)),
      ),
    ).toEqual(franchise)
  })

  it('빌더 href 는 조건을 실어 되돌아갈 수 있게 한다', () => {
    const state = {
      ...createEmptySimulationConditionState(),
      franchisee: false,
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR' as const,
    }

    const href = simulationBuilderHref('standalone', state)

    expect(href.startsWith('/simulation?')).toBe(true)
    expect(
      parseSimulationConditionState(
        new URLSearchParams(href.slice(href.indexOf('?') + 1)),
      ),
    ).toEqual(state)
  })

  it('실을 조건이 하나도 없으면 쿼리 없는 경로다', () => {
    expect(
      simulationBuilderHref(
        'standalone',
        createEmptySimulationConditionState(),
      ),
    ).toBe('/simulation')
  })
})
