import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import MetricToggleGroup from '@/components/home/metric-toggle-group'

/*
 * E 리뷰 지적사항: `popular-districts.tsx` 와 `metric-ranking-board.tsx` 가 각자
 * 다른 모양의 지표 토글을 그리고 있었다. 이 공용 부품으로 합친 뒤에는 두 곳
 * 모두 이 컴포넌트를 통해서만 토글을 그린다 — 여기서 옵션·활성 상태·접근성
 * 속성만 검증한다(모양 자체는 두 소비처 테스트에서 문자열로 이미 확인한다).
 */
describe('MetricToggleGroup', () => {
  const options = ['footTraffic', 'sales', 'opened'] as const
  const labels: Record<(typeof options)[number], string> = {
    footTraffic: '유동인구',
    sales: '매출',
    opened: '개업',
  }

  it('옵션 전부를 버튼으로 낸다', () => {
    const html = renderToStaticMarkup(
      createElement(MetricToggleGroup, {
        options,
        value: 'footTraffic',
        getLabel: (option: string) => labels[option as keyof typeof labels],
        onChange: () => undefined,
        ariaLabel: '지표 선택',
      }),
    )

    expect(html).toContain('유동인구')
    expect(html).toContain('매출')
    expect(html).toContain('개업')
    expect(html).toContain('aria-label="지표 선택"')
  })

  it('선택된 옵션만 aria-pressed="true" 다', () => {
    const html = renderToStaticMarkup(
      createElement(MetricToggleGroup, {
        options,
        value: 'sales',
        getLabel: (option: string) => labels[option as keyof typeof labels],
        onChange: () => undefined,
        ariaLabel: '지표 선택',
      }),
    )

    expect(html).toContain('aria-pressed="true"')
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(2)
  })
})
