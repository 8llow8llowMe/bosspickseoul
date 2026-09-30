import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import DemoFrame, { type DemoFrameProps } from '@/components/home/demo-frame'
import StoryLineChart, {
  storyLineGeometry,
} from '@/components/home/story-line-chart'

const TREND = [82, 88, 91, 87, 95, 100].map((value, index) => ({
  label: `${index}`,
  value,
}))

describe('storyLineGeometry (TC-SP-006)', () => {
  it('양 끝 점을 0 % 와 100 % 에 놓고, 도메인 위쪽이 y 0 이다', () => {
    const coords = storyLineGeometry([80, 90, 100], [80, 100])

    expect(coords).toEqual([
      { x: 0, y: 100 },
      { x: 50, y: 50 },
      { x: 100, y: 0 },
    ])
  })

  it('도메인 밖 값은 칸 안으로 자른다', () => {
    const [low, high] = storyLineGeometry([70, 110], [80, 100])

    expect(low.y).toBe(100)
    expect(high.y).toBe(0)
  })

  it('도메인 폭이 0 이거나 점이 하나면 가운데에 둔다 — NaN 이 새지 않는다', () => {
    expect(storyLineGeometry([5], [5, 5])).toEqual([{ x: 50, y: 50 }])
  })
})

describe('StoryLineChart — 그리기 규칙 (D4-6)', () => {
  const render = (props: Partial<Parameters<typeof StoryLineChart>[0]> = {}) =>
    renderToStaticMarkup(
      createElement(StoryLineChart, {
        points: TREND,
        height: 180,
        ariaLabel: '매출 추이',
        fill: 'area',
        ...props,
      }),
    )

  it('직선으로 잇는다 — 곡선 보간(path 의 C/Q 명령)을 쓰지 않는다', () => {
    const html = render()

    expect(html).toContain('<polyline')
    expect(html).not.toMatch(/<path[^>]*d="[^"]*[CQ]/)
  })

  it('눈금이 고른 간격이고 개수를 줄일 수 있다 — 80 · 90 · 100', () => {
    const html = render({ tickCount: 3 })

    for (const tick of ['80', '90', '100']) {
      expect(html).toContain(`>${tick}</span>`)
    }
    expect(html).not.toContain('>85</span>')
  })

  it('recharts 를 쓰지 않는다 — 공용 LineChart 와 분리돼 있다', () => {
    expect(render()).not.toContain('recharts')
  })

  it('강조한 한 점에만 라벨을 붙인다', () => {
    const html = render({
      highlight: { index: 5, label: '100', tone: 'value' },
    })

    expect(html.match(/>100<\/span>/g)?.length).toBe(2) // y 눈금 + 끝점 라벨
  })

  it('split 은 0 기준으로 양수·음수 색을 나눠 칠한다', () => {
    const html = render({
      points: [-12000, -4000, 4000].map((value, index) => ({
        label: `${index}`,
        value,
      })),
      fill: 'split',
      highlight: { index: 2, label: '2개월째 손익분기', tone: 'callout' },
    })

    expect(html).toContain('var(--color-positive)')
    expect(html).toContain('var(--color-negative)')
    expect(html.match(/<clipPath/g)).toHaveLength(2)
    expect(html).toContain('2개월째 손익분기')
  })

  it('xLabelStep 만큼 건너뛰어 x 라벨을 싣는다', () => {
    const points = Array.from({ length: 13 }, (_, month) => ({
      label: `${month}개월`,
      value: month,
    }))
    const html = render({ points, xLabelStep: 2 })

    expect(html).toContain('>0개월<')
    expect(html).toContain('>12개월<')
    expect(html).not.toContain('>1개월<')
  })

  it('바깥에 이름을 달고 안쪽 글자는 보조기기에서 숨긴다', () => {
    const html = render()

    expect(html).toMatch(/role="img"[^>]*aria-label="매출 추이"/)
    expect(html).toContain('aria-hidden="true"')
  })

  it('점이 둘보다 적으면 아무것도 그리지 않는다', () => {
    expect(render({ points: TREND.slice(0, 1) })).toBe('')
  })
})

describe('DemoFrame — 공통 틀 (D4-4)', () => {
  it('머리줄·본문·꼬리를 한 틀에 담는다', () => {
    const html = renderToStaticMarkup(
      createElement(
        DemoFrame,
        {
          title: '자치구 순위',
          subtitle: '상위 5곳',
          aside: 'aside',
          footer: '꼬리',
        } as DemoFrameProps,
        '본문',
      ),
    )

    expect(html).toContain('<h4')
    expect(html).toContain('자치구 순위')
    expect(html).toContain('상위 5곳')
    expect(html).toContain('본문')
    expect(html).toContain('꼬리')
  })

  it('머리줄 내용이 없으면 머리줄을 그리지 않는다', () => {
    const html = renderToStaticMarkup(
      createElement(DemoFrame, {} as DemoFrameProps, '본문'),
    )

    expect(html).not.toContain('<h4')
  })
})
