import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationCostBreakdown from '@/components/simulation/report/simulation-cost-breakdown'
import {
  COST_COLORS,
  KEY_MONEY_EXCLUDED_NOTE,
} from '@/lib/simulation/report-presentation'
import type { SimulationReport } from '@/types/simulation'

const report = (
  overrides: Partial<SimulationReport> = {},
): SimulationReport => ({
  condition: {
    franchisee: true,
    franchiseeId: 7,
    brandName: '테스트브랜드',
    districtCode: '11680',
    districtName: '강남구',
    serviceCode: 'CS100010',
    serviceName: '커피-음료',
    storeSize: 61,
    floorType: { code: 'FIRST_FLOOR', name: '1층', description: '1층 점포' },
    periodCode: '20233',
  },
  dataBaseYear: '2024',
  // 2026-10-01 dev 실측값. 항목 합은 24,001 이라 총액보다 1만원 작다(만원 미만 버림).
  totalPrice: 24_002,
  keyMoney: { keyMoneyRatio: 75, keyMoneyAverage: 5_670, keyMoneyLevel: 75 },
  costDetail: { rentPrice: 326, deposit: 3_265, interior: 5_500, levy: 14_910 },
  similarFranchisees: [],
  genderAgeAnalysis: null,
  seasonAnalysis: null,
  ...overrides,
})

const render = (value: SimulationReport) =>
  renderToStaticMarkup(
    createElement(SimulationCostBreakdown, { report: value }),
  )

describe('SimulationCostBreakdown', () => {
  /*
    공용 도넛의 기본 2색을 번갈아 쓰던 시절 1·3번째(임대료·인테리어)와 2·4번째(보증금·
    가맹 부담금)가 같은 색이었다. 항목마다 다른 색이어야 구성을 읽을 수 있다.
  */
  it('네 항목의 색이 모두 다르다', () => {
    const colors = Object.values(COST_COLORS)

    expect(colors).toHaveLength(4)
    expect(new Set(colors).size).toBe(4)
  })

  /*
    금액과 비중을 **같은 행에서** 짝지어 본다. 따로 toContain 하면 비중이 역순으로 밀려도
    (62/23/14/1) 1%·62% 가 그대로 나와 통과하고, '1%' 는 '11%' 의 부분 문자열이기도 하다.
  */
  it('항목마다 금액 바로 옆에 그 항목의 비중을 적는다', () => {
    const markup = render(report())
    const pair = (amount: string, percent: number) =>
      new RegExp(`>${amount}</strong> <span[^>]*>${percent}%</span>`)

    expect(markup).toMatch(pair('326만원', 1))
    expect(markup).toMatch(pair('3,265만원', 14))
    expect(markup).toMatch(pair('5,500만원', 23))
    expect(markup).toMatch(pair('1억 4,910만원', 62))
  })

  it('도넛 자체 범례는 그리지 않는다 — 항목 행이 범례다', () => {
    // 범례 색 점(<i style="background:…">)이 행과 겹쳐 두 번 나오지 않는다.
    expect(render(report())).not.toMatch(/<i style="background:/)
  })

  it('임대료는 「첫 달」로 적고 매달 나간다는 사실과 보증금 산식을 함께 보여준다', () => {
    const markup = render(report())

    expect(markup).toContain('첫 달 임대료')
    expect(markup).not.toContain('월 임대료<')
    expect(markup).toContain('이후 매달 같은 금액이 나가요')
    expect(markup).toContain('월 임대료 10개월분')
  })

  it('항목 아래에 합계 행으로 총액을 둔다', () => {
    const markup = render(report())

    expect(markup).toContain('합계 · 예상 총 창업 비용')
    expect(markup).toContain('2억 4,002만원')
  })

  it('버림으로 항목 합과 총액이 어긋나면 그 차이를 밝힌다', () => {
    expect(render(report())).toContain(
      '금액은 만원 미만을 버려 표시해요. 그래서 항목을 더하면 합계와 1만원 차이가 나요.',
    )
    expect(render(report({ totalPrice: 24_001 }))).not.toContain('차이가 나요')
  })

  it('버림 사실과 권리금 제외 안내는 합이 맞아도 남긴다', () => {
    const markup = render(report({ totalPrice: 24_001 }))

    expect(markup).toContain('금액은 만원 미만을 버려 표시해요.')
    expect(markup).toContain(KEY_MONEY_EXCLUDED_NOTE)
  })

  /*
    두 칸 사이 공백이 없으면 낭독이 「첫 달 임대료이후 매달…」「326만원1%」로 붙는다.
  */
  it('라벨·설명, 금액·비중 사이에 낭독용 공백을 둔다', () => {
    const markup = render(report())

    expect(markup).toMatch(/첫 달 임대료<\/span> <span/)
    expect(markup).toMatch(/326만원<\/strong> <span/)
  })
})
