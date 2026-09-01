import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RecommendCompareTable from '@/components/recommend/compare/recommend-compare-table'
import type { CompareColumnInput } from '@/lib/recommend/compare-presentation'
import type { CandidateCommercial, CommercialProfile } from '@/types/recommend'

const candidate = (code: string, name: string): CandidateCommercial => ({
  rank: 2,
  commercialCode: code,
  commercialName: name,
  compositeScore: 84,
  grade: null,
  summaryLabel: null,
  selectionReason: null,
  opportunityLabel: null,
  riskLabel: null,
  reasonTags: [],
  metricBreakdown: [
    {
      metricType: {
        code: 'RISK_SCORE',
        name: '위험도',
        description: '',
        scoreDescription: '',
      },
      score: 95,
      grade: null,
      summaryLabel: null,
    },
  ],
})

const profile = (code: string, name: string): CommercialProfile => ({
  commercialCode: code,
  commercialName: name,
  districtCode: '11680',
  districtName: '강남구',
  administrationCode: '11680640',
  administrationName: '역삼1동',
  centerLng: 127,
  centerLat: 37.5,
  boundaryCoords: [],
  keyMetrics: {
    totalSalesAmount: 84_520_000,
    totalFootTraffic: 1000,
    totalStoreCount: 30,
    similarStoreCount: 5,
    openingRate: 2.1,
    closureRate: 1.2,
    totalResidentPopulation: 500,
    monthlyAverageIncomeAmount: 3_000_000,
    totalFacilityCount: 12,
  },
})

const columns: CompareColumnInput[] = [
  {
    commercialCode: '3120197',
    candidate: candidate('3120197', '역삼역'),
    profile: profile('3120197', '역삼역'),
  },
  {
    commercialCode: '3110958',
    candidate: candidate('3110958', '역삼역 4번'),
    profile: profile('3110958', '역삼역 4번'),
  },
]

const render = (
  props: Partial<Parameters<typeof RecommendCompareTable>[0]> = {},
) =>
  renderToStaticMarkup(
    createElement(RecommendCompareTable, {
      columns,
      districtCode: '11680',
      administrationCode: '11680640',
      serviceCode: 'CS100010',
      ...props,
    }),
  )

describe('RecommendCompareTable', () => {
  it('상권 이름과 순위를 열 머리에 적는다', () => {
    const markup = render()

    expect(markup).toContain('역삼역')
    expect(markup).toContain('역삼역 4번')
    expect(markup).toContain('2위')
  })

  it('중립 문구를 항상 그린다', () => {
    expect(render()).toContain('어느 상권이 더 나은지는 업종과 계획에 따라')
  })

  it('열마다 상권 분석 결과로 가는 링크를 만든다', () => {
    const markup = render()
    const links = markup.match(/<a[^>]*data-analysis-link="true"[^>]*>/g) ?? []

    expect(links).toHaveLength(2)
    expect(links[0]).toContain('href="/analysis/result?')
    expect(links[0]).toContain('commercialCode=3120197')
    expect(links[0]).toContain('serviceCode=CS100010')
    expect(links[1]).toContain('commercialCode=3110958')
  })

  it('원지표 행에는 품질 색을 쓰지 않는다', () => {
    // 방향이 정의되지 않은 지표를 색으로 판단하면 화면이 조용히 반대로 말한다.
    const markup = render()
    const metricSection = markup.split('data-compare-metrics="true"')[1] ?? ''

    expect(metricSection).not.toContain('--score-high')
    expect(metricSection).not.toContain('--score-low')
    expect(metricSection).not.toContain('--score-mid')
  })

  it('점수 행에는 품질 색을 쓴다', () => {
    const markup = render()
    const scoreSection = markup.split('data-compare-scores="true"')[1] ?? ''

    expect(scoreSection).toContain('--score-')
  })

  it('프로필을 못 불러온 열은 그 사실만 말하고 나머지 열은 남긴다', () => {
    const markup = render({
      columns: [
        columns[0],
        {
          commercialCode: '3110958',
          candidate: candidate('3110958', '역삼역 4번'),
          profile: null,
        },
      ],
      failedProfileCodes: ['3110958'],
    })

    expect(markup).toContain('지표를 불러오지 못했어요')
    expect(markup).toContain('역삼역')
  })
})
