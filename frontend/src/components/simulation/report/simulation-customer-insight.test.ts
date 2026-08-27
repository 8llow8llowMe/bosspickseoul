import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import DonutChart from '@/components/analysis/charts/donut-chart'
import HorizontalBarChart from '@/components/analysis/charts/horizontal-bar-chart'
import SimulationCustomerInsight from '@/components/simulation/report/simulation-customer-insight'
import {
  formatSalesAmountCompact,
  toAgeSalesRows,
} from '@/lib/simulation/report-presentation'
import type {
  SimulationCondition,
  SimulationGenderAgeAnalysis,
} from '@/types/simulation'

/**
 * `SimulationCustomerInsight` 는 `HorizontalBarChart` 에 `valueFormatter` 로
 * `formatSalesAmountCompact` 를 넘겨야 축에 억 단위 축약이 찍힌다. 이 배선은
 * `renderToStaticMarkup` 문자열 단언으로는 검증할 수 없다 — recharts 의
 * `ResponsiveContainer` 가 SSR 에서 폭 0이라 차트 내부(축 라벨 포함)를 전혀 그리지
 * 않기 때문이다. 대신 컴포넌트를 **함수로 호출**해 반환된 React 엘리먼트 트리를
 * 직접 걸어서 props 를 검사한다.
 */
const findElementByType = (
  node: ReactNode,
  type: unknown,
): ReactElement | null => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElementByType(child, type)
      if (found) return found
    }
    return null
  }
  if (!isValidElement(node)) return null
  if (node.type === type) return node
  return findElementByType(
    (node.props as { children?: ReactNode }).children,
    type,
  )
}

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

const analysis: SimulationGenderAgeAnalysis = {
  malePercent: 54,
  femalePercent: 46,
  topAgeGroups: [{ ageGroupName: '50대', salesAmount: 2_733_782 }],
}

describe('SimulationCustomerInsight 배선', () => {
  it('HorizontalBarChart 에 formatSalesAmountCompact 를 valueFormatter 로 넘긴다', () => {
    const tree = SimulationCustomerInsight({ condition, analysis })
    const chart = findElementByType(tree, HorizontalBarChart)

    expect(chart).not.toBeNull()
    expect((chart?.props as { valueFormatter?: unknown }).valueFormatter).toBe(
      formatSalesAmountCompact,
    )
  })

  it('HorizontalBarChart 의 items 가 toAgeSalesRows 결과와 같다', () => {
    const tree = SimulationCustomerInsight({ condition, analysis })
    const chart = findElementByType(tree, HorizontalBarChart)

    expect((chart?.props as { items?: unknown }).items).toEqual(
      toAgeSalesRows(analysis),
    )
  })

  it('DonutChart 에 unit="%" 를 넘긴다', () => {
    const tree = SimulationCustomerInsight({ condition, analysis })
    const donut = findElementByType(tree, DonutChart)

    expect(donut).not.toBeNull()
    expect((donut?.props as { unit?: unknown }).unit).toBe('%')
  })
})
