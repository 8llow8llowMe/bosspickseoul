import { describe, expect, it } from 'vitest'

import {
  buildCompareRecommendationRequest,
  selectCompareColumns,
} from '@/lib/recommend/compare-data'
import type { CandidateCommercial } from '@/types/recommend'

const candidate = (code: string, rank: number): CandidateCommercial => ({
  rank,
  commercialCode: code,
  commercialName: `상권 ${code}`,
  compositeScore: 50,
  grade: null,
  summaryLabel: null,
  selectionReason: null,
  opportunityLabel: null,
  riskLabel: null,
  reasonTags: [],
  metricBreakdown: [],
})

describe('buildCompareRecommendationRequest', () => {
  it('선택된 코드가 아니라 행정동 전체 코드로 요청한다', () => {
    // 🔴 여기가 이 화면에서 가장 깨지기 쉬운 곳이다.
    // 선택된 3개만 넘기면 topN 이 최소 5로 clamp 되고 점수가 그 3개 안에서
    // 다시 계산돼, /recommend 와 같은 상권에 다른 숫자를 말하게 된다.
    const request = buildCompareRecommendationRequest({
      serviceCode: 'CS100010',
      allCommercialCodes: ['5', '1', '3', '2', '4', '6', '7'],
    })

    expect(request.commercialCodes).toEqual(['1', '2', '3', '4', '5', '6', '7'])
    expect(request.serviceCode).toBe('CS100010')
    expect(request.periodCode).toBe('20233')
    expect(request.topN).toBe(5)
  })
})

describe('selectCompareColumns', () => {
  const candidates = [candidate('A', 1), candidate('B', 2), candidate('C', 3)]

  it('URL 순서대로 열을 세운다', () => {
    const { columns } = selectCompareColumns({
      requestedCodes: ['C', 'A'],
      candidates,
      profileByCode: {},
    })

    expect(columns.map(column => column.commercialCode)).toEqual(['C', 'A'])
    expect(columns[0].candidate?.rank).toBe(3)
  })

  it('추천 결과에 없는 코드는 빼고 사실을 알린다', () => {
    const { columns, missingCodes } = selectCompareColumns({
      requestedCodes: ['A', 'Z', 'B'],
      candidates,
      profileByCode: {},
    })

    expect(columns.map(column => column.commercialCode)).toEqual(['A', 'B'])
    expect(missingCodes).toEqual(['Z'])
  })

  it('프로필을 코드로 이어 붙인다', () => {
    const { columns } = selectCompareColumns({
      requestedCodes: ['A'],
      candidates,
      profileByCode: {
        A: {
          commercialCode: 'A',
          commercialName: '상권 A',
          districtCode: '11680',
          districtName: '강남구',
          administrationCode: '11680640',
          administrationName: '역삼1동',
          centerLng: 127,
          centerLat: 37.5,
          boundaryCoords: [],
          keyMetrics: null,
        },
      },
    })

    expect(columns[0].profile?.administrationName).toBe('역삼1동')
  })

  it('추천을 못 받았으면 열을 버리지 않고 점수만 비워 둔다', () => {
    // 추천 실패는 「낡은 링크」가 아니다. 후보를 모르는 상태에서 없다고 판정하면
    // 열이 전부 사라져 원지표까지 못 보게 된다 (명세 §7).
    const { columns, missingCodes } = selectCompareColumns({
      requestedCodes: ['A', 'B'],
      candidates: [],
      profileByCode: {},
      scoresUnavailable: true,
    })

    expect(columns.map(column => column.commercialCode)).toEqual(['A', 'B'])
    expect(columns.every(column => column.candidate === null)).toBe(true)
    expect(missingCodes).toEqual([])
  })
})
