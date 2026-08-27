import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationReportView from '@/components/simulation/report/simulation-report-view'
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

const render = (value: SimulationReport) =>
  renderToStaticMarkup(createElement(SimulationReportView, { report: value }))

describe('SimulationReportView', () => {
  it('총 창업 비용과 기준 연도 안내를 노출한다', () => {
    const markup = render(report())

    expect(markup).toContain('2억 3,450만원')
    expect(markup).toContain('2024년 기준 데이터로 계산된 결과입니다.')
  })

  it('비프랜차이즈면 가맹 부담금 항목이 없다', () => {
    expect(render(report())).not.toContain('가맹 부담금')
  })

  it('levy 가 0 이면 가맹 부담금을 0원으로 표기한다', () => {
    const markup = render(
      report({
        costDetail: {
          rentPrice: 300,
          deposit: 3_000,
          interior: 5_000,
          levy: 0,
        },
      }),
    )

    expect(markup).toContain('가맹 부담금')
    // `0만원` 은 `3,000만원` 의 부분문자열이라 이 자리를 검증하지 못했다.
    expect(markup).toContain('0원')
  })

  it('권리금을 총비용과 분리해 참고로 표기한다', () => {
    const markup = render(report())

    expect(markup).toContain('권리금')
    expect(markup).toContain('참고')
    expect(markup).toContain('포함되지 않')
  })

  it('결측 섹션은 숨기고 오류 문구를 띄우지 않는다', () => {
    const markup = render(report())

    expect(markup).not.toContain('고객 참고 지표')
    expect(markup).not.toContain('성수기')
    // 결측은 200 응답 안의 사실이다 — 오류 UI 로 새지 않아야 한다.
    expect(markup).not.toContain('다시 시도')
  })

  it('성별·연령 섹션에 집계 범위 라벨과 억 단위 축약이 붙는다', () => {
    const markup = render(
      report({
        genderAgeAnalysis: {
          malePercent: 54,
          femalePercent: 46,
          topAgeGroups: [{ ageGroupName: '50대', salesAmount: 2_733_782 }],
        },
      }),
    )

    expect(markup).toContain('강동구 한식음식점 전체 기준')
    expect(markup).toContain('2023년 3분기 기준')
    // 축 라벨은 여기서 검증할 수 없다 — recharts 의 ResponsiveContainer 가 SSR 에서 폭 0이라
    // 차트 내부를 전혀 그리지 않는다. 억 단위 축약 배선은 simulation-customer-insight.test.ts 가 본다.
  })

  it('성수기 데이터가 있으면 월 배지를 그린다', () => {
    const markup = render(
      report({ seasonAnalysis: { peakMonths: [3, 7], offPeakMonths: [1] } }),
    )

    expect(markup).toContain('성수기')
    expect(markup).toContain('3월 · 7월')
    expect(markup).toContain('1월')
  })

  it('유사 프랜차이즈가 비면 섹션을 그리지 않는다', () => {
    expect(render(report())).not.toContain('비슷한 예산의 프랜차이즈')
  })

  it('유사 프랜차이즈가 있으면 표를 그린다', () => {
    const markup = render(
      report({
        similarFranchisees: [
          {
            franchiseeId: 7,
            brandName: '테스트브랜드',
            totalPrice: 22_000,
            subscription: 500,
            education: 300,
            deposit: 1_000,
            etc: 200,
            interior: 6_000,
          },
        ],
      }),
    )

    expect(markup).toContain('비슷한 예산의 프랜차이즈')
    expect(markup).toContain('테스트브랜드')
  })
})
