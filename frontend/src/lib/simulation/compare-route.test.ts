import { describe, expect, it } from 'vitest'

import {
  buildSimulationCompareHref,
  parseSimulationCompareConditionPair,
  parseSimulationComparePair,
} from '@/lib/simulation/compare-route'
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

/** `buildSimulationCompareHref` 의 결과에서 쿼리만 떼어 파서에 물린다. */
const readBack = (href: string) =>
  new URLSearchParams(href.slice(href.indexOf('?') + 1))

describe('buildSimulationCompareHref', () => {
  it('좌우를 a. / b. 접두사로 싣는다', () => {
    const href = buildSimulationCompareHref({
      left: personal,
      right: franchise,
    })

    expect(href.startsWith('/simulation/compare?')).toBe(true)
    const params = readBack(href)
    expect(params.get('a.districtCode')).toBe('11740')
    expect(params.get('a.franchisee')).toBe('false')
    expect(params.get('b.districtCode')).toBe('11680')
    expect(params.get('b.franchiseeId')).toBe('101')
  })

  it('비프랜차이즈 쪽에는 franchiseeId 키를 싣지 않는다', () => {
    const params = readBack(
      buildSimulationCompareHref({ left: personal, right: franchise }),
    )

    expect(params.has('a.franchiseeId')).toBe(false)
    expect(params.has('b.franchiseeId')).toBe(true)
  })

  it('한쪽만 있으면 그쪽 키만 싣는다 — 리포트의 "비교에 추가" 경로다', () => {
    const params = readBack(
      buildSimulationCompareHref({ left: personal, right: null }),
    )

    expect(params.get('a.districtCode')).toBe('11740')
    expect(params.has('b.districtCode')).toBe(false)
    expect(params.has('b.franchisee')).toBe(false)
  })

  it('양쪽이 다 없으면 쿼리 없는 맨 경로다', () => {
    expect(buildSimulationCompareHref({ left: null, right: null })).toBe(
      '/simulation/compare',
    )
  })

  it('analysis variant 는 분석 하위 경로를 쓴다', () => {
    const href = buildSimulationCompareHref(
      { left: personal, right: franchise },
      'analysis',
    )

    expect(href.startsWith('/analysis/simulation/compare?')).toBe(true)
  })
})

describe('parseSimulationComparePair', () => {
  it('쌍을 왕복시켜도 값이 그대로다', () => {
    const pair = parseSimulationComparePair(
      readBack(
        buildSimulationCompareHref({ left: personal, right: franchise }),
      ),
    )

    expect(pair.left).toEqual(personal)
    expect(pair.right).toEqual(franchise)
  })

  it('한쪽이 결손이면 그쪽만 null 이고 오류가 아니다', () => {
    const pair = parseSimulationComparePair(
      readBack(buildSimulationCompareHref({ left: personal, right: null })),
    )

    expect(pair.left).toEqual(personal)
    expect(pair.right).toBeNull()
  })

  it('한쪽이 절반만 유효하면 그쪽은 null 이지만 반대쪽은 살아남는다', () => {
    const params = new URLSearchParams({
      'a.franchisee': 'false',
      'a.districtCode': '11740',
      'a.serviceCode': 'CS100001',
      'a.storeSize': '66',
      'a.floorType': 'FIRST_FLOOR',
      // 오른쪽은 자치구만 있다 — 요청으로 완성되지 않는다.
      'b.districtCode': '11680',
    })

    const pair = parseSimulationComparePair(params)
    expect(pair.left).toEqual(personal)
    expect(pair.right).toBeNull()
  })

  it('프랜차이즈인데 브랜드가 없으면 완성으로 보지 않는다', () => {
    const params = new URLSearchParams({
      'a.franchisee': 'true',
      'a.districtCode': '11680',
      'a.serviceCode': 'CS100008',
      'a.storeSize': '40',
      'a.floorType': 'OTHER',
    })

    expect(parseSimulationComparePair(params).left).toBeNull()
  })

  it('접두사 없는 단일 리포트 키는 어느 쪽으로도 읽지 않는다', () => {
    const params = new URLSearchParams({
      franchisee: 'false',
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: '66',
      floorType: 'FIRST_FLOOR',
    })

    const pair = parseSimulationComparePair(params)
    expect(pair.left).toBeNull()
    expect(pair.right).toBeNull()
  })
})

describe('parseSimulationCompareConditionPair', () => {
  it('미완성 조건도 읽어 편집기 초기값으로 준다', () => {
    const params = new URLSearchParams({
      'a.franchisee': 'true',
      'a.districtCode': '11680',
      'a.serviceCode': 'CS100008',
      'a.franchiseeId': '101',
      'a.brandName': '메가커피',
    })

    const pair = parseSimulationCompareConditionPair(params)
    expect(pair.left.districtCode).toBe('11680')
    expect(pair.left.franchiseeId).toBe(101)
    // brandName 은 표시 전용이지만 조건 코덱은 싣고 읽는다 — 편집기가 브랜드명을 써야 한다.
    expect(pair.left.brandName).toBe('메가커피')
    // 매장 조건이 비어 있어도 오류가 아니다.
    expect(pair.left.storeSize).toBeNull()
  })

  it('한쪽이 통째로 비어도 빈 상태를 준다 (null 이 아니다)', () => {
    const pair = parseSimulationCompareConditionPair(new URLSearchParams())

    expect(pair.left.districtCode).toBeNull()
    expect(pair.right.districtCode).toBeNull()
  })
})
