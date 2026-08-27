import { describe, expect, it } from 'vitest'

import {
  describeAgeSalesScope,
  describeSeasonMonths,
  describeSimulationPeriod,
  formatSalesAmountCompact,
  toAgeSalesRows,
  toCostBreakdown,
  toGenderSalesSegments,
} from '@/lib/simulation/report-presentation'
import { simulationReportQueryKey } from '@/lib/simulation/report-query'
import type { SimulationCondition, SimulationReport } from '@/types/simulation'

const condition: SimulationCondition = {
  franchisee: false,
  franchiseeId: null,
  brandName: null,
  districtCode: '11740',
  districtName: '강동구',
  serviceCode: 'CS100001',
  serviceName: '한식음식점',
  storeSize: 66,
  floorType: { code: 'FIRST_FLOOR', name: '1층', description: '1층 점포' },
  periodCode: '20233',
}

const report = (
  overrides: Partial<SimulationReport> = {},
): SimulationReport => ({
  condition,
  dataBaseYear: '2024',
  totalPrice: 23_450,
  keyMoney: { keyMoneyRatio: 62, keyMoneyAverage: 4_200, keyMoneyLevel: 63 },
  costDetail: { rentPrice: 300, deposit: 3_000, interior: 5_000, levy: null },
  similarFranchisees: [],
  genderAgeAnalysis: null,
  seasonAnalysis: null,
  ...overrides,
})

describe('toCostBreakdown', () => {
  it('비프랜차이즈면 가맹 부담금 항목이 없다', () => {
    const rows = toCostBreakdown(report())

    expect(rows.map(row => row.key)).toEqual([
      'rentPrice',
      'deposit',
      'interior',
    ])
    expect(rows.map(row => row.label)).toEqual([
      '월 임대료',
      '보증금',
      '인테리어',
    ])
  })

  it('levy 가 0 이면 항목을 남긴다 — 0 은 "부담금 0원"이지 결측이 아니다', () => {
    const rows = toCostBreakdown(
      report({
        costDetail: {
          rentPrice: 300,
          deposit: 3_000,
          interior: 5_000,
          levy: 0,
        },
      }),
    )

    expect(rows.map(row => row.key)).toContain('levy')
    expect(rows.find(row => row.key === 'levy')?.amount).toBe(0)
  })

  it('levy 가 있으면 마지막 항목으로 붙는다', () => {
    const rows = toCostBreakdown(
      report({
        costDetail: {
          rentPrice: 300,
          deposit: 3_000,
          interior: 5_000,
          levy: 1_200,
        },
      }),
    )

    expect(rows.at(-1)).toEqual({
      key: 'levy',
      label: '가맹 부담금',
      amount: 1_200,
    })
  })
})

describe('describeSimulationPeriod', () => {
  it('yyyyQ 를 "N년 M분기 기준"으로 옮긴다', () => {
    expect(describeSimulationPeriod('20233')).toBe('2023년 3분기 기준')
    expect(describeSimulationPeriod('20241')).toBe('2024년 1분기 기준')
  })

  it('형식이 다르면 빈 문자열이다 — 없는 기준을 지어내지 않는다', () => {
    expect(describeSimulationPeriod('2023')).toBe('')
    expect(describeSimulationPeriod('')).toBe('')
  })
})

describe('formatSalesAmountCompact', () => {
  it('만원 입력을 억 단위로 축약한다', () => {
    // 2,733,782만원 = 273억원. 축에 그대로 얹으면 읽히지 않는다.
    expect(formatSalesAmountCompact(2_733_782)).toBe('273억원')
    expect(formatSalesAmountCompact(10_000)).toBe('1억원')
  })

  it('1억 미만은 만원으로 둔다', () => {
    expect(formatSalesAmountCompact(9_999)).toBe('9,999만원')
    expect(formatSalesAmountCompact(0)).toBe('0만원')
  })
})

describe('describeAgeSalesScope', () => {
  it('집계 범위가 사용자 점포가 아님을 드러낸다', () => {
    expect(describeAgeSalesScope(condition)).toBe('강동구 한식음식점 전체 기준')
  })
})

describe('toAgeSalesRows / toGenderSalesSegments', () => {
  it('연령 Top3 를 막대 행으로 옮긴다', () => {
    expect(
      toAgeSalesRows({
        malePercent: 54,
        femalePercent: 46,
        topAgeGroups: [
          { ageGroupName: '50대', salesAmount: 2_733_782 },
          { ageGroupName: '40대', salesAmount: 1_900_000 },
        ],
      }),
    ).toEqual([
      { label: '50대', value: 2_733_782 },
      { label: '40대', value: 1_900_000 },
    ])
  })

  it('성별 비중을 도넛 조각으로 옮긴다', () => {
    expect(
      toGenderSalesSegments({
        malePercent: 54,
        femalePercent: 46,
        topAgeGroups: [],
      }),
    ).toEqual([
      { label: '남성', value: 54 },
      { label: '여성', value: 46 },
    ])
  })
})

describe('describeSeasonMonths', () => {
  it('월 배열을 사람이 읽는 한 줄로 만든다', () => {
    expect(describeSeasonMonths([3, 7, 12])).toBe('3월 · 7월 · 12월')
    expect(describeSeasonMonths([])).toBe('')
  })
})

describe('simulationReportQueryKey', () => {
  it('같은 조건이면 같은 키다 — 입력 화면이 채운 캐시를 리포트 화면이 그대로 쓴다', () => {
    const request = {
      franchisee: false as const,
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR' as const,
    }

    expect(simulationReportQueryKey(request)).toEqual(
      simulationReportQueryKey({ ...request }),
    )
  })

  it('조건이 다르면 키가 다르다', () => {
    const base = {
      franchisee: false as const,
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR' as const,
    }

    expect(simulationReportQueryKey(base)).not.toEqual(
      simulationReportQueryKey({ ...base, storeSize: 99 }),
    )
  })
})
