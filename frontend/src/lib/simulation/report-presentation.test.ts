import { describe, expect, it } from 'vitest'

import {
  describeAgeSalesScope,
  describeCostRounding,
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
      '첫 달 임대료',
      '임대 보증금',
      '인테리어',
    ])
  })

  /*
    총액에는 월 임대료가 한 달 치만 들어간다(BE SimulationReportProcessor). 「월 임대료」로
    적으면 매달 나가는 돈이 일회성 총액에 섞인 것처럼 읽힌다.
  */
  it('임대료는 「첫 달」로 적고 매달 나간다는 사실과 보증금 산식을 설명으로 붙인다', () => {
    const rows = toCostBreakdown(report())

    expect(rows.find(row => row.key === 'rentPrice')?.hint).toBe(
      '이후 매달 같은 금액이 나가요',
    )
    expect(rows.find(row => row.key === 'deposit')?.hint).toBe(
      '월 임대료 10개월분',
    )
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

describe('describeCostRounding', () => {
  const BASE = '금액은 만원 미만을 버려 표시해요.'
  const GAP = (manwon: number) =>
    `${BASE} 그래서 항목을 더하면 합계와 ${manwon}만원 차이가 나요.`

  const withTotal = (totalPrice: number, levy: number | null = 1_200) =>
    report({
      totalPrice,
      costDetail: { rentPrice: 300, deposit: 3_000, interior: 5_000, levy },
    })

  /*
    합이 맞아도 버림 안내는 남긴다. 보증금 설명(월 임대료 10개월분)을 보고 만원 값끼리
    곱하면 어긋날 수 있어서다(326만원 × 10 = 3,260 인데 화면은 3,265만원 — dev 실측).
  */
  it('항목 합과 총액이 같아도 버림 사실은 밝힌다', () => {
    expect(describeCostRounding(withTotal(9_500))).toBe(BASE)
  })

  it('만원 미만 버림으로 생기는 합계 차이면 몇 만원인지 덧붙인다', () => {
    expect(describeCostRounding(withTotal(9_502))).toBe(GAP(2))
  })

  /*
    항목 n개를 각각 버리면 합은 총액보다 최대 n-1만원 작다. 그보다 크거나 합이 총액보다
    크면 버림으로 설명되지 않으므로, 차이를 버림 탓으로 돌리지 않는다.
  */
  it('버림으로 설명되지 않는 차이는 버림 탓으로 돌리지 않는다', () => {
    expect(describeCostRounding(withTotal(9_504))).toBe(BASE)
    expect(describeCostRounding(withTotal(9_499))).toBe(BASE)
    // 비프랜차이즈는 항목이 3개라 상한이 2만원이다.
    expect(describeCostRounding(withTotal(8_303, null))).toBe(BASE)
    expect(describeCostRounding(withTotal(8_302, null))).toBe(GAP(2))
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
  it('만원 입력을 억 단위 소수 한 자리로 축약한다', () => {
    // 2,733,782만원 = 273.4억원. 축에 그대로 얹으면 읽히지 않는다.
    expect(formatSalesAmountCompact(2_733_782)).toBe('273.4억원')
    expect(formatSalesAmountCompact(10_000)).toBe('1억원')
  })

  it('억 아래 자리를 버리지 않고 반올림한다 (R10)', () => {
    // 버리면 1억 9,600만원이 「1억원」이 돼 거의 절반을 잃었다.
    expect(formatSalesAmountCompact(19_600)).toBe('2억원')
    expect(formatSalesAmountCompact(19_400)).toBe('1.9억원')
    // 딱 떨어지면 .0 을 붙이지 않는다. 천 단위 쉼표는 유지한다.
    expect(formatSalesAmountCompact(30_000)).toBe('3억원')
    expect(formatSalesAmountCompact(12_345_000)).toBe('1,234.5억원')
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
