import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'

import RankBarList, { type RankBarRow } from '@/components/home/rank-bar-list'
import { presentStatusChange } from '@/lib/status/status-formatters'

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

  it('증감은 change 가 있을 때만 그린다', () => {
    expect(render()).not.toContain('+3.2%')
    expect(
      render({
        rows: [{ ...rows[0], change: presentStatusChange('footTraffic', 3.2) }],
      }),
    ).toContain('+3.2%')
  })

  it('강조 행에 aria-current 를 준다', () => {
    const html = render({ highlightKey: 'b' })

    expect(html).toContain('aria-current="true"')
  })
})

const renderCardStyles = (): string => {
  const sheet = new ServerStyleSheet()

  try {
    renderToStaticMarkup(
      sheet.collectStyles(
        createElement(RankBarList, {
          rows,
          ariaLabel: '순위',
          variant: 'card',
        }),
      ),
    )
    return sheet.getStyleTags().replace(/\s+/g, '')
  } finally {
    sheet.seal()
  }
}

describe('RankBarList — card 변형은 넓어져도 막대가 늘어나지 않는다', () => {
  /*
   * 예전 card 변형은 막대가 이름 아래 제 줄에서 행 전폭을 써 1920 에서 약 850px 까지
   * 갔다. 폭 체계 §Charts 의 미터 행 상한(360px)을 막대 칸에 건다.
   */
  it('막대 칸에 360px 상한이 있다', () => {
    expect(renderCardStyles()).toContain('minmax(0,360px)')
  })

  /* 행마다 테두리를 두르면 카드 8장이 쌓여 보인다 — 목록이 한 번만 두른다. */
  it('행 사이는 구분선으로 가른다', () => {
    expect(renderCardStyles()).toMatch(
      />li\+li\{border-top:1pxsolidvar\(--color-border-200\);\}/,
    )
  })
})

describe('RankBarList — compact 변형(01 단계, TC-SP-010)', () => {
  const fiveRows: RankBarRow[] = [1, 2, 3, 4, 5].map(rank => ({
    key: String(rank),
    rank,
    name: `${rank}번구`,
    value: 100 - rank,
    valueLabel: `${100 - rank}`,
  }))

  const renderCompact = () => {
    const sheet = new ServerStyleSheet()
    try {
      const html = renderToStaticMarkup(
        sheet.collectStyles(
          createElement(RankBarList, { rows: fiveRows, ariaLabel: '순위' }),
        ),
      )
      return { html, css: sheet.getStyleTags().replace(/\s+/g, '') }
    } finally {
      sheet.seal()
    }
  }

  /* 같은 파랑 막대 다섯 개는 줄무늬로 읽힌다 — 1~3위만 채색한다. */
  it('1~3위와 4위부터의 막대 색이 다르다', () => {
    const { css } = renderCompact()

    expect(css).toContain('background:var(--color-primary-600)')
    expect(css).toContain('background:var(--color-grey-300)')
  })

  it('막대 칸에 360px 상한이 있다(DESIGN.md 미터 행)', () => {
    expect(renderCompact().css).toContain('minmax(0,360px)')
  })
})

/*
 * contrast-tokens.md TC-CT-006. 증감 글자가 면적용 green500·red500 으로 돌아가면 흰 바탕
 * 2.77 / 3.71:1 로 AA(4.5) 아래로 떨어진다.
 */
describe('RankBarList — 증감 글자 대비', () => {
  it('증감은 글자용 -text 토큰과 13px 로 그린다', () => {
    const sheet = new ServerStyleSheet()

    try {
      renderToStaticMarkup(
        sheet.collectStyles(
          createElement(RankBarList, {
            rows: [
              { ...rows[0], change: presentStatusChange('sales', 2.5) },
              { ...rows[1], change: presentStatusChange('sales', -1.2) },
            ],
            ariaLabel: '순위',
          }),
        ),
      )
      const css = sheet.getStyleTags().replace(/\s+/g, '')

      expect(css).toContain('color:var(--color-positive-text);')
      expect(css).toContain('color:var(--color-negative-text);')
      expect(css).not.toContain('color:var(--color-positive);')
      expect(css).not.toContain('color:var(--color-negative);')
    } finally {
      sheet.seal()
    }
  })
})

/*
  미니 지도 연결선이 행을 `[data-rank-key]` 로 찾는다(ranking-mini-map.md D4-2). 두 변형 모두 키가
  행(li)에 붙어야 한다. 행 호버 콜백의 동작은 e2e(ranking-mini-map.spec.ts)가 본다.
*/
describe('RankBarList — 미니 지도 연결', () => {
  it.each(['compact', 'card'] as const)(
    '%s 변형의 행에 data-rank-key 를 붙인다',
    variant => {
      const html = render({ variant })

      expect(html).toMatch(/<li[^>]*data-rank-key="a"/)
      expect(html).toMatch(/<li[^>]*data-rank-key="b"/)
    },
  )
})

/*
 * 결정 D-1(DESIGN.md §Charts 「증감은 좋고 나쁨으로 칠한다」). 예전에는 오름=초록·내림=빨강이라 폐업처럼
 * 늘면 나쁜 지표의 증가가 좋은 소식으로 칠해질 수 있었다. 색은 지표 극성이 정하고, 부호·화살표와
 * 「개선/악화」 글자를 색과 같이 둔다(WCAG 1.4.1).
 */
describe('RankBarList — 증감은 극성으로 칠한다(D-1)', () => {
  const renderChange = (change: RankBarRow['change'], changeBasis?: string) =>
    render({ rows: [{ ...rows[0], change, changeBasis }] })

  it('높을수록 좋은 지표의 증가는 개선(positive)이다', () => {
    const html = renderChange(presentStatusChange('footTraffic', 2.5))

    expect(html).toContain('data-change-tone="positive"')
    expect(html).toContain('+2.5% 개선')
    expect(html).toContain('▲')
  })

  it('높을수록 좋은 지표의 감소는 악화(negative)다', () => {
    const html = renderChange(presentStatusChange('sales', -1.2))

    expect(html).toContain('data-change-tone="negative"')
    expect(html).toContain('-1.2% 악화')
    expect(html).toContain('▼')
  })

  it('낮을수록 좋은 지표(폐업)의 증가는 방향이 올라도 악화다', () => {
    const html = renderChange(presentStatusChange('closed', 4))

    expect(html).toContain('data-change-tone="negative"')
    expect(html).toContain('▲')
    expect(html).toContain('악화')
  })

  it('변동 없음은 무채색이고 개선/악화를 말하지 않는다', () => {
    const html = renderChange(presentStatusChange('footTraffic', 0))

    expect(html).toContain('data-change-tone="neutral"')
    expect(html).not.toContain('개선')
    expect(html).not.toContain('악화')
  })

  it('화살표는 읽지 않고 기준과 방향을 숨긴 글자로 읽힌다', () => {
    const html = renderChange(
      presentStatusChange('footTraffic', 2.5),
      '직전 분기 대비',
    )

    expect(html).toContain('<span aria-hidden="true">▲ </span>')
    expect(html).toContain('직전 분기 대비 증가')
  })
})

/* 조회 수가 임계값 아래면 막대를 끄고 순위만 남긴다(#600). */
describe('RankBarList — 막대 끄기', () => {
  it.each(['compact', 'card'] as const)(
    '%s 변형에서 showBars=false 면 막대를 그리지 않는다',
    variant => {
      const html = render({ variant, showBars: false })

      expect(html).not.toContain('width:100%')
      expect(html).not.toContain('width:50%')
      expect(html).toContain('강남구')
    },
  )
})
