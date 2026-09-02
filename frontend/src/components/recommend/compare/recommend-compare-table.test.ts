import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RecommendCompareTable from '@/components/recommend/compare/recommend-compare-table'
import { toComparisonGroups } from '@/lib/recommend/comparison-presentation'
import type { CommercialComparisonBody } from '@/types/commercial-comparison'

const emptyGroups = {
  salesMetrics: null,
  footTrafficMetrics: null,
  storeMetrics: null,
  spendingMetrics: null,
  residentPopulationMetrics: null,
  facilityMetrics: null,
  salesTimeSlotMetrics: null,
  salesAgeMetrics: null,
  salesAgeGenderMetrics: null,
  footTrafficTimeSlotMetrics: null,
  footTrafficAgeMetrics: null,
  footTrafficAgeGenderMetrics: null,
}

const body = (
  overrides: Partial<CommercialComparisonBody> = {},
): CommercialComparisonBody =>
  ({
    left: null,
    right: null,
    comparisonSummary: null,
    recommendedSide: null,
    recommendedReasons: null,
    cautionPoints: null,
    businessFitSummary: null,
    dominantTimeSlots: null,
    dominantAgeGroups: null,
    comparisonHighlights: null,
    highlights: null,
    ...emptyGroups,
    ...overrides,
  }) as CommercialComparisonBody

const render = (overrides: Partial<CommercialComparisonBody> = {}) =>
  renderToStaticMarkup(
    createElement(RecommendCompareTable, {
      groups: toComparisonGroups(body(overrides)),
      leftName: '역삼역',
      rightName: '선릉역',
    }),
  )

describe('RecommendCompareTable', () => {
  it('좌·우 값과 차이를 한 표에 적는다', () => {
    const markup = render({
      salesMetrics: [
        {
          label: '월 매출',
          leftValue: 1000,
          rightValue: 600,
          diffValue: 400,
          diffRate: 66.7,
          winnerSide: null,
        },
      ],
    })

    expect(markup).toContain('역삼역')
    expect(markup).toContain('선릉역')
    expect(markup).toContain('월 매출')
    expect(markup).toContain('매출') // 묶음 소제목
    expect(markup).toContain('+400')
  })

  /**
   * 이 표의 존재 이유에 가까운 계약이다. 응답에는 지표마다 `winnerSide` 가 있지만
   * 표는 그것을 받지도, 그리지도 않는다 — 값 옆에 승패가 붙으면 사용자는 그것을
   * "더 나은 선택" 으로 읽는다. 판단은 근거가 함께 나오는 리포트 영역이 말한다.
   */
  it('winnerSide 가 와도 표에 승패를 드러내지 않는다', () => {
    const markup = render({
      salesMetrics: [
        {
          label: '월 매출',
          leftValue: 1000,
          rightValue: 600,
          diffValue: 400,
          diffRate: 66.7,
          winnerSide: { code: 'LEFT', name: '역삼역 우세', description: '' },
        },
      ],
    })

    expect(markup).not.toContain('우세')
    expect(markup).not.toContain('승')
  })

  it('중립 안내를 항상 적는다', () => {
    const markup = render({
      storeMetrics: [
        {
          label: '점포 수',
          leftValue: 12,
          rightValue: 12,
          diffValue: 0,
          diffRate: 0,
          winnerSide: null,
        },
      ],
    })

    expect(markup).toContain('어느 상권이 더 나은지는 업종과 계획에 따라')
  })

  it('값이 없으면 빈 칸 기호를 적는다', () => {
    const markup = render({
      facilityMetrics: [
        {
          label: '집객시설',
          leftValue: null,
          rightValue: null,
          diffValue: null,
          diffRate: null,
          winnerSide: null,
        },
      ],
    })

    expect(markup).toContain('—')
  })

  it('행 머리는 scope="row", 묶음 소제목은 scope="rowgroup" 이다', () => {
    const markup = render({
      salesMetrics: [
        {
          label: '월 매출',
          leftValue: 1,
          rightValue: 2,
          diffValue: -1,
          diffRate: -50,
          winnerSide: null,
        },
      ],
    })

    expect(markup).toContain('scope="row"')
    expect(markup).toContain('scope="rowgroup"')
    expect(markup).toContain('scope="col"')
  })
})
