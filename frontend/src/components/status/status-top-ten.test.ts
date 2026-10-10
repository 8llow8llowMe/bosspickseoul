import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import type { StatusMetric, StatusRankedItem } from '@/types/status'
import StatusTopTen from './status-top-ten'

const item = (changeRate: number | null): StatusRankedItem => ({
  rank: 1,
  districtCode: '11680',
  districtName: '강남구',
  value: 1_559,
  changeRate,
})

type TopTenProps = Parameters<typeof StatusTopTen>[0]

const renderTopTen = (
  props: Pick<TopTenProps, 'metric' | 'items'> & Partial<TopTenProps>,
) => {
  const styleSheet = new ServerStyleSheet()

  try {
    const markup = renderToStaticMarkup(
      styleSheet.collectStyles(
        createElement(StatusTopTen, {
          selectedDistrictCode: null,
          onSelect: vi.fn(),
          ...props,
        }),
      ),
    )

    return { markup, styles: styleSheet.getStyleTags() }
  } finally {
    styleSheet.seal()
  }
}

const render = (metric: StatusMetric, changeRate: number | null) =>
  renderTopTen({ metric, items: [item(changeRate)] })

// 25개 구 전체 순위(#542). 순위 1~25, 구 코드는 서로 다르게 둔다.
const rankings = (count: number): StatusRankedItem[] =>
  Array.from({ length: count }, (_, index) => ({
    rank: index + 1,
    districtCode: String(11000 + index * 10),
    districtName: `${index + 1}번구`,
    value: 1_000 - index,
    changeRate: 1,
  }))

const rowCount = (markup: string) =>
  markup.match(/data-district-code="/g)?.length ?? 0

describe('StatusTopTen', () => {
  it('지표 이름을 붙인 목록 제목과 행 하나에 값·증감을 적는다', () => {
    const { markup } = render('opened', 26.1)

    expect(markup).toContain('개업 상위 10개 구')
    expect(markup).toContain('1,559개')
    expect(markup).toContain('+26.1%')
    // 1위 대비 막대는 뺐다 — 크기 비교는 지도 단계 색이 맡는다.
    expect(markup).not.toContain('width:')
  })

  // #560 — 「+2.5%」가 무엇과 비교한 값인지 화면에 적는다.
  it('제목 아래에 증감의 비교 기준을 적는다', () => {
    const { markup } = render('sales', 2.5)

    expect(markup).toContain('증감은 직전 분기 대비예요.')
  })

  it('▲▼ 는 읽지 않고, 기준과 방향은 숨긴 글자로 읽힌다', () => {
    const { markup } = render('closed', 26.1)

    expect(markup).toContain('<span aria-hidden="true">▲ </span>')
    expect(markup).toMatch(/<span[^>]*>직전 분기 대비 증가 <\/span>/)
  })

  // D-1 · WCAG 1.4.1 — 좋고 나쁨을 색만으로 말하지 않는다. 폐업 증가는 악화다.
  it.each([
    ['footTraffic', 2.5, '+2.5% 개선'],
    ['sales', -4.3, '-4.3% 악화'],
    ['closed', 26.1, '+26.1% 악화'],
    ['closed', -3, '-3% 개선'],
  ] as const)('%s %s 는 「%s」로 적는다', (metric, rate, text) => {
    const { markup } = render(metric, rate)

    expect(markup).toContain(text)
  })

  it('변동 없음에는 개선·악화를 붙이지 않는다', () => {
    const { markup } = render('sales', 0)

    expect(markup).toMatch(/<span[^>]*>직전 분기 대비 변동 없음 <\/span>0%/)
    expect(markup).not.toContain('개선')
    expect(markup).not.toContain('악화')
  })

  it('변화율이 없으면 결측으로 적고 개선·악화를 붙이지 않는다', () => {
    const { markup } = render('sales', null)

    // 「– 데이터 없음」이 아니라 무엇이 없는지 적는다. 기호는 두지 않는다.
    expect(markup).toMatch(
      /<span[^>]*>직전 분기 대비 <\/span>변화율 데이터 없음/,
    )
    expect(markup).not.toContain('–')
    expect(markup).not.toContain('개선')
    expect(markup).not.toContain('악화')
  })

  it.each([
    ['footTraffic', 2.5, 'var(--color-positive-text)'],
    ['sales', -4.3, 'var(--color-negative-text)'],
    ['closed', 26.1, 'var(--color-negative-text)'],
    ['closed', -3, 'var(--color-positive-text)'],
    ['sales', 0, 'var(--color-text-600)'],
  ] as const)('%s %s 의 증감 글자는 %s', (metric, rate, color) => {
    const { styles } = render(metric, rate)

    expect(styles).toContain(`color:${color};`)
  })
})

// #565 — Top10 밖 15개 구도 목록에서 열 수 있다.
describe('StatusTopTen 전체 25개 구 펼침', () => {
  it('접혀 있으면 앞 10개와 「전체 25개 구 보기」를 그린다', () => {
    const { markup } = renderTopTen({
      metric: 'sales',
      items: rankings(25),
      onExpandedChange: vi.fn(),
    })

    expect(rowCount(markup)).toBe(10)
    expect(markup).toContain('매출 상위 10개 구')
    expect(markup).toMatch(
      /<button[^>]*aria-expanded="false"[^>]*>전체 25개 구 보기/,
    )
    expect(markup).not.toContain('11번구')
  })

  it('펼치면 25개 구 모두 같은 행으로 그리고 접기 버튼을 둔다', () => {
    const { markup } = renderTopTen({
      metric: 'sales',
      items: rankings(25),
      isExpanded: true,
      onExpandedChange: vi.fn(),
    })

    expect(rowCount(markup)).toBe(25)
    expect(markup).toContain('매출 전체 25개 구')
    expect(markup).toContain('25번구')
    expect(markup).toMatch(
      /<button[^>]*aria-expanded="true"[^>]*>상위 10개 구만 보기/,
    )
  })

  it('버튼은 목록을 가리킨다(aria-controls)', () => {
    const { markup } = renderTopTen({
      metric: 'sales',
      items: rankings(25),
      onExpandedChange: vi.fn(),
    })
    const listId = markup.match(/<ol[^>]*id="([^"]+)"/)?.[1]

    expect(listId).toBeTruthy()
    expect(markup).toContain(`aria-controls="${listId}"`)
  })

  it('10개 이하면 버튼을 두지 않는다', () => {
    const { markup } = renderTopTen({
      metric: 'sales',
      items: rankings(10),
      onExpandedChange: vi.fn(),
    })

    expect(rowCount(markup)).toBe(10)
    expect(markup).not.toContain('aria-expanded')
  })

  it('펼침을 다루지 않는 곳에서는 버튼 없이 Top10 만 그린다', () => {
    const { markup } = renderTopTen({
      metric: 'sales',
      items: rankings(25),
      isExpanded: true,
    })

    expect(rowCount(markup)).toBe(10)
    expect(markup).not.toContain('aria-expanded')
  })

  it('펼침 버튼은 모바일 터치 44px 을 넘는다', () => {
    const { styles } = renderTopTen({
      metric: 'sales',
      items: rankings(25),
      onExpandedChange: vi.fn(),
    })

    expect(styles).toContain('min-height:44px;')
  })
})
