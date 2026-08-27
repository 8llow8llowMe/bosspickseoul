import { describe, expect, it } from 'vitest'

import {
  SIMULATION_COMPARE_QUERY_SCOPE,
  SIMULATION_REPORT_QUERY_SCOPE,
  simulationComparePairQueryKey,
  simulationReportQueryKey,
} from '@/lib/simulation/report-query'
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

describe('simulationReportQueryKey', () => {
  it('키 순서가 달라도 같은 조건이면 같은 키다', () => {
    // 객체 리터럴의 키 순서는 조건이 아니다. 정렬하지 않으면 입력 화면과 리포트 화면이
    // 같은 조건을 두고 다른 캐시를 쓴다.
    const reordered: SimulationReportRequest = {
      floorType: 'FIRST_FLOOR',
      storeSize: 66,
      serviceCode: 'CS100001',
      districtCode: '11740',
      franchisee: false,
    }

    expect(simulationReportQueryKey(personal)).toEqual(
      simulationReportQueryKey(reordered),
    )
  })

  it('조건이 하나라도 다르면 키가 갈린다', () => {
    expect(simulationReportQueryKey(personal)).not.toEqual(
      simulationReportQueryKey({ ...personal, storeSize: 67 }),
    )
  })

  it('스코프로 시작한다', () => {
    expect(simulationReportQueryKey(personal)[0]).toBe(
      SIMULATION_REPORT_QUERY_SCOPE,
    )
  })
})

describe('simulationComparePairQueryKey', () => {
  it('단일 리포트 키의 직렬화를 그대로 쓴다', () => {
    // "같은 조건"의 정의가 두 벌이 되면, 비교 화면이 시딩한 캐시를 리포트 화면이 빗나간다.
    const key = simulationComparePairQueryKey(personal, franchise)

    expect(key).toEqual([
      SIMULATION_COMPARE_QUERY_SCOPE,
      simulationReportQueryKey(personal)[1],
      simulationReportQueryKey(franchise)[1],
    ])
  })

  it('좌우를 맞바꾸면 다른 비교다', () => {
    // 화면이 A안/B안 라벨과 미러 막대의 좌우를 이 순서로 그린다.
    expect(simulationComparePairQueryKey(personal, franchise)).not.toEqual(
      simulationComparePairQueryKey(franchise, personal),
    )
  })

  it('한쪽만 바뀌어도 다른 비교다', () => {
    expect(simulationComparePairQueryKey(personal, franchise)).not.toEqual(
      simulationComparePairQueryKey(personal, {
        ...franchise,
        storeSize: 41,
      }),
    )
  })

  it('단일 리포트 키와 섞이지 않는다', () => {
    expect(simulationComparePairQueryKey(personal, franchise)[0]).not.toBe(
      SIMULATION_REPORT_QUERY_SCOPE,
    )
  })
})
