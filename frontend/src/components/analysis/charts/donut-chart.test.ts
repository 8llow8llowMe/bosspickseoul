import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import DonutChart, {
  toDonutSlices,
  type DonutChartProps,
} from '@/components/analysis/charts/donut-chart'

/*
  SSR 에서는 ResponsiveContainer 가 폭을 몰라 파이 조각(<path fill>)을 그리지 않는다.
  범례의 색 점은 인라인 style 이라 마크업에 남으므로, 색 배선은 범례로 확인한다.
*/
const render = (props: Partial<DonutChartProps> = {}) =>
  renderToStaticMarkup(
    createElement(DonutChart, {
      segments: [
        { label: '가', value: 1 },
        { label: '나', value: 2 },
        { label: '다', value: 3 },
      ],
      ariaLabel: '비율',
      ...props,
    }),
  )

const legendColors = (markup: string) =>
  [...markup.matchAll(/<i style="background:([^"]+)"/g)].map(match => match[1])

describe('DonutChart / 색·범례', () => {
  /*
    기본값은 성별(2조각)용 두 색 교대다. 분석·구별현황 화면이 이 기본값에 기대므로
    colors 를 추가하면서 기본 동작이 바뀌지 않았는지 지킨다.
  */
  it('colors 가 없으면 두 색을 번갈아 쓴다', () => {
    const [first, second, third] = legendColors(render())

    expect(first).not.toBe(second)
    expect(third).toBe(first)
  })

  it('colors 를 넘기면 조각마다 그 색을 쓴다', () => {
    expect(legendColors(render({ colors: ['red', 'green', 'blue'] }))).toEqual([
      'red',
      'green',
      'blue',
    ])
  })

  it('legend 를 끄면 범례를 그리지 않는다', () => {
    const markup = render({ legend: false })

    expect(markup).toContain('role="img"')
    expect(legendColors(markup)).toEqual([])
  })
})

describe('DonutChart / toDonutSlices', () => {
  it('각 세그먼트의 백분율을 계산한다', () => {
    const slices = toDonutSlices([
      { label: '남성', value: 30 },
      { label: '여성', value: 10 },
    ])
    expect(slices).toEqual([
      { label: '남성', value: 30, percent: 75 },
      { label: '여성', value: 10, percent: 25 },
    ])
  })

  it('합이 0이면 percent는 0', () => {
    const slices = toDonutSlices([
      { label: '남성', value: 0 },
      { label: '여성', value: 0 },
    ])
    expect(slices.every(slice => slice.percent === 0)).toBe(true)
  })
})
