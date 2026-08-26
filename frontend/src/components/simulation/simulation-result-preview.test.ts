import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationResultPreview from '@/components/simulation/simulation-result-preview'
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

describe('SimulationResultPreview', () => {
  it('총 창업 비용을 만원 단위 표기로 보여준다', () => {
    const markup = renderToStaticMarkup(
      createElement(SimulationResultPreview, { report: report() }),
    )

    // totalPrice 는 만원 단위다. 23,450만원 = 2억 3,450만원.
    expect(markup).toContain('2억 3,450만원')
    expect(markup).toContain('예상 총 창업 비용')
  })

  it('기준 연도 안내문을 반드시 노출한다', () => {
    const markup = renderToStaticMarkup(
      createElement(SimulationResultPreview, { report: report() }),
    )

    expect(markup).toContain('2024년 기준 데이터로 계산된 결과입니다.')
  })

  it('조건 요약에 응답의 floorType 이름을 쓴다', () => {
    const markup = renderToStaticMarkup(
      createElement(SimulationResultPreview, { report: report() }),
    )

    expect(markup).toContain('강동구')
    expect(markup).toContain('한식음식점')
    expect(markup).toContain('66㎡')
    expect(markup).toContain('1층')
    expect(markup).toContain('개인 창업')
  })

  it('프랜차이즈면 브랜드명을 보여준다', () => {
    const markup = renderToStaticMarkup(
      createElement(SimulationResultPreview, {
        report: report({
          condition: {
            ...report().condition,
            franchisee: true,
            franchiseeId: 101,
            brandName: '테스트브랜드',
          },
        }),
      }),
    )

    expect(markup).toContain('테스트브랜드')
    expect(markup).toContain('프랜차이즈')
  })

  it('이번 슬라이스에서는 상세 항목을 그리지 않는다', () => {
    const markup = renderToStaticMarkup(
      createElement(SimulationResultPreview, { report: report() }),
    )

    expect(markup).toContain('상세 리포트는 준비 중이에요')
    // 비용 구성·권리금 수치는 다음 슬라이스의 리포트 화면 몫이라 값 자체를 그리지 않는다.
    expect(markup).not.toContain('4,200')
    expect(markup).not.toContain('5,000')
    expect(markup).not.toContain('3,000')
  })
})
