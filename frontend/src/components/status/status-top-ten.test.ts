import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import type { StatusMetric, StatusRankedItem } from '@/types/status'
import StatusTopTen from './status-top-ten'

const item = (changeRate: number): StatusRankedItem => ({
  rank: 1,
  districtCode: '11680',
  districtName: '강남구',
  value: 1_559,
  changeRate,
})

const render = (metric: StatusMetric, changeRate: number) => {
  const styleSheet = new ServerStyleSheet()

  try {
    const markup = renderToStaticMarkup(
      styleSheet.collectStyles(
        createElement(StatusTopTen, {
          metric,
          items: [item(changeRate)],
          selectedDistrictCode: null,
          onSelect: vi.fn(),
        }),
      ),
    )

    return { markup, styles: styleSheet.getStyleTags() }
  } finally {
    styleSheet.seal()
  }
}

describe('StatusTopTen', () => {
  it('지표 이름을 붙인 목록 제목과 행 하나에 값·증감을 적는다', () => {
    const { markup } = render('opened', 26.1)

    expect(markup).toContain('개업 상위 10개 구')
    expect(markup).toContain('1,559개')
    expect(markup).toContain('+26.1%')
    // 1위 대비 막대는 뺐다 — 크기 비교는 지도 단계 색이 맡는다.
    expect(markup).not.toContain('width:')
  })

  it('▲▼ 는 읽지 않고, 뜻은 숨긴 글자로 읽힌다', () => {
    const { markup } = render('closed', 26.1)

    expect(markup).toContain('<span aria-hidden="true">▲ </span>')
    // 폐업 증가는 「주의」다(다른 지표의 「증가」와 반대).
    expect(markup).toMatch(/<span[^>]*>주의 <\/span>/)
  })

  it.each([
    ['footTraffic', 2.5, 'var(--color-positive)'],
    ['sales', -4.3, 'var(--color-negative)'],
    ['closed', 26.1, 'var(--color-negative)'],
    ['closed', -3, 'var(--color-positive)'],
  ] as const)('%s %s 의 증감 글자는 %s', (metric, rate, color) => {
    const { styles } = render(metric, rate)

    expect(styles).toContain(`color:${color};`)
  })
})
