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
