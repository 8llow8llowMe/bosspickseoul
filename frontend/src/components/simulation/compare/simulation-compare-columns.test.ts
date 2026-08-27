import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationCompareColumns from '@/components/simulation/compare/simulation-compare-columns'
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

const render = (left: SimulationReport, right: SimulationReport) =>
  renderToStaticMarkup(createElement(SimulationCompareColumns, { left, right }))

describe('SimulationCompareColumns', () => {
  it('좌우 총비용과 차액 문구를 함께 노출한다', () => {
    const markup = render(
      report({ totalPrice: 19_000 }),
      report({ totalPrice: 23_450 }),
    )

    expect(markup).toContain('1억 9,000만원')
    expect(markup).toContain('2억 3,450만원')
    expect(markup).toContain('조건 A')
    expect(markup).toContain('조건 B')
    expect(markup).toContain('4,450만원 더 적게 들어요')
  })

  it('비용이 낮은 쪽에만 강조 배지를 붙인다', () => {
    const markup = render(
      report({ totalPrice: 20_000 }),
      report({ totalPrice: 23_450 }),
    )

    // 배지는 한 번만 등장한다 — 양쪽에 붙으면 강조의 뜻이 사라진다.
    expect(markup.match(/비용 낮음/g)).toHaveLength(1)
  })

  it('동점이면 강조 배지를 붙이지 않는다', () => {
    const markup = render(
      report({ totalPrice: 23_450 }),
      report({ totalPrice: 23_450 }),
    )

    expect(markup).not.toContain('비용 낮음')
    expect(markup).toContain('같아요')
  })

  it('중립 문구를 항상 렌더한다 — 강조를 추천으로 읽지 않게 하는 유일한 장치다', () => {
    const markup = render(
      report({ totalPrice: 20_000 }),
      report({ totalPrice: 23_450 }),
    )

    expect(markup).toContain('초기 비용만 비교한 결과예요.')
    expect(markup).toContain('매출·수익 지표는 계산하지 않아요.')
  })

  it('한쪽만 프랜차이즈면 가맹 부담금 행을 남기고 없는 쪽은 해당 없음이다', () => {
    const markup = render(
      report(),
      report({
        condition: {
          ...report().condition,
          franchisee: true,
          franchiseeId: 101,
          brandName: '김밥천국',
        },
        costDetail: {
          rentPrice: 300,
          deposit: 3_000,
          interior: 5_000,
          levy: 1_200,
        },
      }),
    )

    expect(markup).toContain('가맹 부담금')
    expect(markup).toContain('해당 없음')
    expect(markup).toContain('1,200만원')
    // 프랜차이즈 쪽 조건 한 줄에는 브랜드명이 들어간다.
    expect(markup).toContain('김밥천국')
  })

  it('양쪽 다 비프랜차이즈면 가맹 부담금 행이 없다', () => {
    const markup = render(report(), report())

    expect(markup).not.toContain('가맹 부담금')
    expect(markup).not.toContain('해당 없음')
  })

  /**
   * 막대 **길이**는 여기서 단언하지 않는다.
   *
   * `renderToStaticMarkup` 은 styled-components 의 `<style>` 을 내보내지 않으므로(그러려면
   * `ServerStyleSheet` 가 필요하다) 마크업에는 해시된 클래스명만 남는다. 클래스명을 단언하면
   * 스타일 한 줄만 고쳐도 깨지는데 그게 회귀를 뜻하지는 않는다.
   * 비율 규칙(두 값 중 큰 값 기준)은 `compare-presentation.test.ts` 의
   * `toMirrorCostRows` 단위 테스트가 값으로 고정한다 — 여기서는 **값 표기**만 본다.
   */
  it('미러 막대의 양쪽 금액을 각각 표기한다', () => {
    const markup = render(
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
          deposit: 3_000,
          interior: 5_000,
          levy: null,
        },
      }),
    )

    expect(markup).toContain('월 임대료')
    expect(markup).toContain('300만원')
    expect(markup).toContain('600만원')
  })

  it('각 컬럼에 상세 리포트 링크를 붙이고 조건을 쿼리로 싣는다', () => {
    const markup = render(
      report(),
      report({
        condition: { ...report().condition, districtCode: '11680' },
      }),
    )

    expect(markup).toContain('상세 리포트 보기')
    expect(markup).toContain('/simulation/report?')
    expect(markup).toContain('districtCode=11740')
    expect(markup).toContain('districtCode=11680')
  })

  it('비프랜차이즈 링크에는 franchiseeId 를 싣지 않는다', () => {
    expect(render(report(), report())).not.toContain('franchiseeId')
  })

  it('조건 요약에 자치구·업종·면적·층을 담는다', () => {
    const markup = render(report(), report())

    expect(markup).toContain('강동구')
    expect(markup).toContain('한식음식점')
    expect(markup).toContain('66㎡')
    expect(markup).toContain('1층')
  })
})
