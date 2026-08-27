import { describe, expect, it } from 'vitest'

import {
  describeSimulationCostGap,
  formatMirrorAmount,
  SIMULATION_COMPARE_NEUTRAL_NOTICE,
  toMirrorCostRows,
} from '@/lib/simulation/compare-presentation'
import type { SimulationReport } from '@/types/simulation'

const report = (
  overrides: Partial<SimulationReport> = {},
): SimulationReport => ({
  condition: {
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
  },
  dataBaseYear: '2024',
  totalPrice: 23_450,
  keyMoney: { keyMoneyRatio: 62, keyMoneyAverage: 4_200, keyMoneyLevel: 63 },
  costDetail: { rentPrice: 300, deposit: 3_000, interior: 5_000, levy: null },
  similarFranchisees: [],
  genderAgeAnalysis: null,
  seasonAnalysis: null,
  ...overrides,
})

describe('describeSimulationCostGap', () => {
  it('총비용이 낮은 쪽을 winner 로 주고 차액을 문구로 만든다', () => {
    const gap = describeSimulationCostGap(
      report({ totalPrice: 20_000 }),
      report({ totalPrice: 23_450 }),
    )

    expect(gap.winner).toBe('left')
    expect(gap.difference).toBe(3_450)
    expect(gap.message).toContain('조건 A')
    expect(gap.message).toContain('3,450만원')
  })

  it('오른쪽이 낮으면 오른쪽이 winner 다', () => {
    const gap = describeSimulationCostGap(
      report({ totalPrice: 23_450 }),
      report({ totalPrice: 20_000 }),
    )

    expect(gap.winner).toBe('right')
    expect(gap.message).toContain('조건 B')
  })

  it('동점이면 tie 이고 차액을 말하지 않는다', () => {
    const gap = describeSimulationCostGap(
      report({ totalPrice: 23_450 }),
      report({ totalPrice: 23_450 }),
    )

    expect(gap.winner).toBe('tie')
    expect(gap.difference).toBe(0)
    expect(gap.message).toContain('같아요')
  })

  it('차액은 억 단위로도 읽히게 표기한다', () => {
    const gap = describeSimulationCostGap(
      report({ totalPrice: 10_000 }),
      report({ totalPrice: 35_000 }),
    )

    expect(gap.message).toContain('2억 5,000만원')
  })

  it('중립 문구는 비용만 비교했다는 사실을 밝힌다', () => {
    expect(SIMULATION_COMPARE_NEUTRAL_NOTICE).toBe(
      '초기 비용만 비교한 결과예요. 매출·수익 지표는 계산하지 않아요.',
    )
  })
})

describe('toMirrorCostRows', () => {
  it('비율은 합이 아니라 두 값 중 큰 값 기준이다', () => {
    const rows = toMirrorCostRows(
      report({
        costDetail: {
          rentPrice: 300,
          deposit: 3_000,
          interior: 5_000,
          levy: null,
        },
      }),
      report({
        costDetail: {
          rentPrice: 600,
          deposit: 6_000,
          interior: 5_000,
          levy: null,
        },
      }),
    )

    const rent = rows.find(row => row.key === 'rentPrice')
    expect(rent?.leftRatio).toBe(0.5)
    expect(rent?.rightRatio).toBe(1)

    // 같은 값이면 양쪽이 모두 꽉 찬다 — 합 기준이면 0.5/0.5 가 되어 축이 달라진다.
    const interior = rows.find(row => row.key === 'interior')
    expect(interior?.leftRatio).toBe(1)
    expect(interior?.rightRatio).toBe(1)
  })

  it('양쪽 다 levy 가 null 이면 가맹 부담금 행을 뺀다', () => {
    const rows = toMirrorCostRows(report(), report())

    expect(rows.map(row => row.key)).toEqual([
      'rentPrice',
      'deposit',
      'interior',
    ])
  })

  it('한쪽만 levy 가 있으면 행을 남기고 없는 쪽은 null 이다', () => {
    const rows = toMirrorCostRows(
      report(),
      report({
        costDetail: {
          rentPrice: 300,
          deposit: 3_000,
          interior: 5_000,
          levy: 1_200,
        },
      }),
    )

    const levy = rows.find(row => row.key === 'levy')
    expect(levy).toBeDefined()
    expect(levy?.leftAmount).toBeNull()
    expect(levy?.leftRatio).toBe(0)
    expect(levy?.rightAmount).toBe(1_200)
    expect(levy?.rightRatio).toBe(1)
  })

  it('levy 가 0 이면 해당 없음이 아니라 0원 행이다', () => {
    const rows = toMirrorCostRows(
      report({
        costDetail: {
          rentPrice: 300,
          deposit: 3_000,
          interior: 5_000,
          levy: 0,
        },
      }),
      report({
        costDetail: {
          rentPrice: 300,
          deposit: 3_000,
          interior: 5_000,
          levy: 1_200,
        },
      }),
    )

    const levy = rows.find(row => row.key === 'levy')
    expect(levy?.leftAmount).toBe(0)
    expect(levy?.leftRatio).toBe(0)
  })

  it('양쪽이 0 인 항목은 막대를 그리지 않지만 행은 남는다', () => {
    const rows = toMirrorCostRows(
      report({
        costDetail: {
          rentPrice: 0,
          deposit: 3_000,
          interior: 5_000,
          levy: null,
        },
      }),
      report({
        costDetail: {
          rentPrice: 0,
          deposit: 3_000,
          interior: 5_000,
          levy: null,
        },
      }),
    )

    const rent = rows.find(row => row.key === 'rentPrice')
    expect(rent?.leftAmount).toBe(0)
    expect(rent?.leftRatio).toBe(0)
    expect(rent?.rightRatio).toBe(0)
  })
})

describe('formatMirrorAmount', () => {
  it('null 은 해당 없음이고 0 은 0원이다', () => {
    expect(formatMirrorAmount(null)).toBe('해당 없음')
    expect(formatMirrorAmount(0)).toBe('0원')
    expect(formatMirrorAmount(23_450)).toBe('2억 3,450만원')
  })
})
