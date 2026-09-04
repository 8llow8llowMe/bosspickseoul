import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'

import SalesComparisonBars, {
  type SalesComparisonItem,
} from '@/components/analysis/sales-comparison-bars'

const items: SalesComparisonItem[] = [
  { label: '강남구', value: 3_345_727_318_759 },
  { label: '역삼1동', value: 412_880_000_000 },
  { label: '역삼역 4번', value: 10_240_000_000, strong: true },
]

const render = (rows: SalesComparisonItem[] = items) =>
  renderToStaticMarkup(createElement(SalesComparisonBars, { items: rows }))

const renderStyles = (rows: SalesComparisonItem[] = items): string => {
  const sheet = new ServerStyleSheet()

  try {
    renderToStaticMarkup(
      sheet.collectStyles(createElement(SalesComparisonBars, { items: rows })),
    )
    return sheet.getStyleTags()
  } finally {
    sheet.seal()
  }
}

/*
 * DESIGN.md 「Charts」의 두 규칙을 이 컴포넌트가 진다. 실제 가로세로비는 레이아웃
 * 계산 결과라서 SSR 문자열에 나타나지 않는다 — 여기서는 **상한이 선언돼 있다는
 * 사실**만 고정하고 비율 자체는 브라우저로 실측한다(story-and-rankings 가 CTA
 * 실제 높이 테스트를 뺀 것과 같은 이유).
 */
describe('SalesComparisonBars — DESIGN.md Charts 준수', () => {
  /*
   * 360px 에서 트랙은 약 182px, 두께 14px → 약 13:1 로 「15:1 을 넘지 않는다」를
   * 만족한다. full 스팬 시절에는 1300px 칸에서 약 108:1 이었다.
   */
  it('막대 미터에 폭 상한이 선언돼 있다', () => {
    expect(renderStyles()).toContain('max-width:360px')
  })

  it('막대 두께 하한이 있다 — 넓은 칸에서 선처럼 보이지 않게', () => {
    expect(renderStyles()).toContain('height:14px')
  })
})

describe('SalesComparisonBars — 값 표현', () => {
  it('세 범위의 라벨과 값을 함께 낸다', () => {
    const html = render()

    for (const label of ['강남구', '역삼1동', '역삼역 4번']) {
      expect(html).toContain(label)
    }
  })

  /*
   * 최대값을 100% 로 두고 나머지를 비율로 그린다 — 이 데이터는 자치구 > 행정동 >
   * 상권으로 자릿수가 크게 벌어지므로, 주인공(상권)이 0%로 사라지지 않는지가 관심사다.
   */
  it('최대값 행이 100%, 나머지는 그 비율로 채워진다', () => {
    /*
      채움 폭은 `$percent` 로 계산돼 styled 클래스에 들어가므로 **마크업 문자열에는
      나오지 않는다** — 시트에서 읽는다(저장소 전반의 알려진 특성).
    */
    const widths = [...renderStyles().matchAll(/[^-]width:([\d.]+)%/g)]
      .map(m => Number(m[1]))
      .sort((a, b) => b - a)

    expect(widths).toHaveLength(3)
    expect(widths[0]).toBe(100)
    expect(widths[1]).toBeGreaterThan(0)
    expect(widths[2]).toBeGreaterThan(0)
  })

  it('값이 없으면 0% 막대와 「데이터 없음」을 낸다 — 없는 수치를 지어내지 않는다', () => {
    const html = render([{ label: '역삼역 4번', value: null }])

    expect(html).toContain('데이터 없음')
    expect(html).not.toContain('NaN')
  })
})
