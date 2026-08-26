import { describe, expect, it } from 'vitest'
import type { SimulationReport } from '@/types/simulation'
import {
  formatDataBaseYearNotice,
  hasFranchiseeLevy,
  hasGenderAgeAnalysis,
  hasSeasonAnalysis,
} from './report-sections'

const baseReport: SimulationReport = {
  condition: {
    franchisee: false,
    franchiseeId: null,
    brandName: null,
    districtCode: '11740',
    districtName: '강동구',
    serviceCode: 'CS100001',
    serviceName: '한식음식점',
    storeSize: 66,
    floorType: {
      code: 'FIRST_FLOOR',
      name: '1층',
      description: '1층 매장 기준 임대료를 적용합니다.',
    },
    periodCode: '20233',
  },
  dataBaseYear: '2024',
  totalPrice: 6591,
  keyMoney: { keyMoneyRatio: 75.4, keyMoneyAverage: 5670, keyMoneyLevel: 75.3 },
  costDetail: { rentPrice: 282, deposit: 2822, interior: 3486, levy: null },
  similarFranchisees: [],
  genderAgeAnalysis: null,
  seasonAnalysis: null,
}

describe('hasGenderAgeAnalysis', () => {
  it('null 은 오류가 아니라 섹션 숨김이다', () => {
    expect(hasGenderAgeAnalysis(null)).toBe(false)
    expect(hasGenderAgeAnalysis(undefined)).toBe(false)
  })

  it('topAgeGroups 가 비면 그릴 것이 없어 숨긴다', () => {
    expect(
      hasGenderAgeAnalysis({
        malePercent: 50,
        femalePercent: 50,
        topAgeGroups: [],
      }),
    ).toBe(false)
  })

  it('데이터가 있으면 표시하고 타입을 좁힌다', () => {
    const analysis = {
      malePercent: 62.5,
      femalePercent: 37.5,
      topAgeGroups: [{ ageGroupName: '50대', salesAmount: 2733782 }],
    }

    expect(hasGenderAgeAnalysis(analysis)).toBe(true)
    if (hasGenderAgeAnalysis(analysis)) {
      expect(analysis.topAgeGroups[0].ageGroupName).toBe('50대')
    }
  })
})

describe('hasSeasonAnalysis', () => {
  it('null 은 섹션 숨김', () => {
    expect(hasSeasonAnalysis(null)).toBe(false)
  })

  it('양쪽 다 비면 숨김', () => {
    expect(hasSeasonAnalysis({ peakMonths: [], offPeakMonths: [] })).toBe(false)
  })

  it('한쪽만 있어도 표시한다', () => {
    expect(
      hasSeasonAnalysis({ peakMonths: [4, 5, 6], offPeakMonths: [] }),
    ).toBe(true)
    expect(hasSeasonAnalysis({ peakMonths: [], offPeakMonths: [1, 2] })).toBe(
      true,
    )
  })
})

describe('hasFranchiseeLevy', () => {
  it('비프랜차이즈면 levy 가 null 이라 항목을 감춘다', () => {
    expect(hasFranchiseeLevy(baseReport)).toBe(false)
  })

  it('프랜차이즈면 가맹 부담금을 표시한다', () => {
    expect(
      hasFranchiseeLevy({
        ...baseReport,
        costDetail: { ...baseReport.costDetail, levy: 18350 },
      }),
    ).toBe(true)
  })

  it('levy 0 은 "값이 없음"이 아니므로 표시한다', () => {
    expect(
      hasFranchiseeLevy({
        ...baseReport,
        costDetail: { ...baseReport.costDetail, levy: 0 },
      }),
    ).toBe(true)
  })
})

describe('formatDataBaseYearNotice', () => {
  it('응답의 dataBaseYear 를 그대로 문구에 넣는다', () => {
    expect(formatDataBaseYearNotice(baseReport.dataBaseYear)).toBe(
      '2024년 기준 데이터로 계산된 결과입니다.',
    )
  })
})
