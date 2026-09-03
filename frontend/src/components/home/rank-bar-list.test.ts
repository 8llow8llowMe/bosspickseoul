import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RankBarList, { type RankBarRow } from '@/components/home/rank-bar-list'

const rows: RankBarRow[] = [
  { key: 'a', rank: 1, name: '강남구', value: 100, valueLabel: '100회' },
  { key: 'b', rank: 2, name: '마포구', value: 50, valueLabel: '50회' },
]

const render = (props: Partial<Parameters<typeof RankBarList>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(RankBarList, { rows, ariaLabel: '순위', ...props }),
  )

describe('RankBarList', () => {
  it('순위·이름·값을 그린다', () => {
    const html = render()

    expect(html).toContain('강남구')
    expect(html).toContain('100회')
    expect(html).toContain('마포구')
  })

  it('1위 대비 비율로 막대 폭을 정한다', () => {
    const html = render()

    expect(html).toContain('width:100%')
    expect(html).toContain('width:50%')
  })

  it('값이 전부 0이면 막대를 0%로 두고 나눗셈을 하지 않는다', () => {
    const html = render({
      rows: [
        { key: 'z', rank: 1, name: '어딘가', value: 0, valueLabel: '0회' },
      ],
    })

    expect(html).toContain('width:0%')
    expect(html).not.toContain('NaN')
  })

  it('음수 값은 0으로 본다', () => {
    const html = render({
      rows: [
        { key: 'a', rank: 1, name: '가', value: 10, valueLabel: '10' },
        { key: 'b', rank: 2, name: '나', value: -5, valueLabel: '-5' },
      ],
    })

    expect(html).toContain('width:0%')
    expect(html).not.toContain('width:-')
  })

  it('href 가 있으면 링크로, 없으면 링크 없이 그린다', () => {
    expect(render()).not.toContain('<a ')
    expect(
      render({
        rows: [{ ...rows[0], href: '/analysis?districtCode=11680' }],
      }),
    ).toContain('href="/analysis?districtCode=11680"')
  })

  it('변화율 배지는 changeLabel 이 있을 때만 그린다', () => {
    expect(render()).not.toContain('+3.2%')
    expect(
      render({
        rows: [{ ...rows[0], changeLabel: '+3.2%', changeDirection: 'up' }],
      }),
    ).toContain('+3.2%')
  })

  it('강조 행에 aria-current 를 준다', () => {
    const html = render({ highlightKey: 'b' })

    expect(html).toContain('aria-current="true"')
  })
})
