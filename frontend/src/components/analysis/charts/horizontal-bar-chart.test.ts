import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import HorizontalBarChart from '@/components/analysis/charts/horizontal-bar-chart'
import type { AnalysisMetricRow } from '@/lib/analysis/presentation'

/**
 * recharts 의 `ResponsiveContainer` 는 SSR 에서 폭 0이라 차트 내부를 전혀 그리지 않는다.
 * 그래서 `renderToStaticMarkup` 문자열 단언으로는 배선을 볼 수 없고, 컴포넌트를
 * **함수로 호출**해 반환된 엘리먼트 트리의 props 를 직접 본다
 * (`simulation-customer-insight.test.ts` 와 같은 방식).
 */
const call = (props: Parameters<typeof HorizontalBarChart>[0]) =>
  HorizontalBarChart(props) as ReactElement

const findByProp = (node: ReactNode, key: string): ReactElement | null => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByProp(child, key)
      if (found) return found
    }
    return null
  }
  if (!isValidElement(node)) return null
  if (key in (node.props as Record<string, unknown>)) return node
  return findByProp((node.props as { children?: ReactNode }).children, key)
}

const rows: AnalysisMetricRow[] = [
  { label: '한식음식점', value: 1200 },
  { label: '커피·음료', value: 860 },
]

describe('HorizontalBarChart 폭 상한', () => {
  /*
   * `maxBarSize` 는 막대 **두께**만 묶고 길이는 묶지 않는다. 폭 상한이 없으면
   * 넓은 칸에서 막대가 800px 까지 늘어나 약 31:1 이 되고(실측), 왼쪽 라벨과
   * 오른쪽 값을 눈으로 잇기 어려워진다.
   */
  it('기본 폭 상한을 둔다 — 넓은 칸에서 막대가 한없이 길어지지 않게', () => {
    const wrapper = call({
      items: rows,
      unit: '개',
      ariaLabel: '업종별 점포수',
    })

    expect(wrapper.props).toHaveProperty('$maxWidth', 560)
  })

  it('상한은 호출부가 덮어쓸 수 있다', () => {
    const wrapper = call({
      items: rows,
      unit: '개',
      ariaLabel: '업종별 점포수',
      maxWidth: 720,
    })

    expect(wrapper.props).toHaveProperty('$maxWidth', 720)
  })

  it('데이터가 없으면 상한 래퍼 없이 빈 문구만 낸다', () => {
    const empty = call({
      items: [{ label: '한식음식점', value: null }],
      unit: '개',
      ariaLabel: '업종별 점포수',
    })

    expect(empty.props).not.toHaveProperty('$maxWidth')
  })

  /* 상한을 넣으며 기존 배선이 끊기지 않았는지 — 래퍼 안에 차트가 그대로 있어야 한다. */
  it('상한 래퍼 안에 차트가 그대로 들어 있다', () => {
    const wrapper = call({
      items: rows,
      unit: '개',
      ariaLabel: '업종별 점포수',
    })
    const chart = findByProp(
      (wrapper.props as { children?: ReactNode }).children,
      'aria-label',
    )

    expect(chart?.props).toMatchObject({ 'aria-label': '업종별 점포수' })
  })
})

/** 트리를 걸어 조건에 맞는 엘리먼트를 전부 모은다. */
const collect = (
  node: ReactNode,
  match: (el: ReactElement) => boolean,
  out: ReactElement[] = [],
): ReactElement[] => {
  if (Array.isArray(node)) {
    for (const child of node) collect(child, match, out)
    return out
  }
  if (!isValidElement(node)) return out
  if (match(node)) out.push(node)
  collect((node.props as { children?: ReactNode }).children, match, out)
  return out
}

const findChartData = (wrapper: ReactElement) => {
  const [chart] = collect(
    wrapper,
    el => 'data' in (el.props as Record<string, unknown>),
  )
  return (chart?.props as { data?: Array<Record<string, unknown>> })?.data ?? []
}

const findYAxis = (wrapper: ReactElement) =>
  collect(
    wrapper,
    el => (el.props as { dataKey?: string }).dataKey === 'label',
  )[0]

describe('HorizontalBarChart 링크·보조 표기', () => {
  /* 명세 D4-1. 건수 뒤에 비율을 이어 붙인다. */
  it('subLabel 이 있으면 값 뒤에 이어 붙인다', () => {
    const wrapper = call({
      items: [
        {
          label: '삼성1동',
          value: 132,
          subLabel: '개업률 8.5%',
        },
      ],
      unit: '개',
      ariaLabel: '행정동별 개업',
      valueFormatter: value => `${value}개`,
    })

    expect(findChartData(wrapper)[0].valueLabel).toBe('132개 · 개업률 8.5%')
  })

  /* 명세 D2-2. 없는 비율을 지어내지 않는다. */
  it('subLabel 이 없으면 값만 적는다', () => {
    const wrapper = call({
      items: [{ label: '삼성1동', value: 132 }],
      unit: '개',
      ariaLabel: '행정동별 개업',
      valueFormatter: value => `${value}개`,
    })

    expect(findChartData(wrapper)[0].valueLabel).toBe('132개')
  })

  /*
   * 명세 D5. href 가 하나도 없으면 기존 tick(평범한 객체)을 그대로 쓴다 —
   * 링크가 필요 없는 차트에 링크 렌더러를 끼우지 않는다.
   */
  it('href 가 없으면 기존 축 라벨을 그대로 쓴다', () => {
    const yAxis = findYAxis(
      call({ items: rows, unit: '개', ariaLabel: '업종별' }),
    )
    const tick = (yAxis.props as { tick?: unknown }).tick

    expect(isValidElement(tick)).toBe(false)
  })

  it('href 가 하나라도 있으면 링크 렌더러를 쓴다', () => {
    const yAxis = findYAxis(
      call({
        items: [
          {
            label: '삼성1동',
            value: 132,
            href: '/analysis?districtCode=11680',
          },
          { label: '역삼1동', value: 90 },
        ],
        unit: '개',
        ariaLabel: '행정동별 개업',
      }),
    )
    const tick = (yAxis.props as { tick?: ReactElement }).tick

    expect(isValidElement(tick)).toBe(true)
    const map = (tick?.props as { hrefByLabel?: Map<string, string> })
      .hrefByLabel
    // href 가 있는 항목만 담긴다 — 없는 항목은 링크가 되지 않는다.
    expect(map?.get('삼성1동')).toBe('/analysis?districtCode=11680')
    expect(map?.has('역삼1동')).toBe(false)
  })
})
