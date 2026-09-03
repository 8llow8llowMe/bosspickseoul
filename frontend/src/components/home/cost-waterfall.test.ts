import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import CostWaterfall from '@/components/home/cost-waterfall'

const render = () => renderToStaticMarkup(createElement(CostWaterfall))

describe('CostWaterfall', () => {
  it('매출에서 비용을 빼 순이익에 이르는 5칸을 그린다', () => {
    const html = render()

    for (const label of ['월매출', '임차료', '인건비', '기타', '순이익']) {
      expect(html).toContain(label)
    }
  })

  it('금액 단위는 만원이다', () => {
    // 시뮬레이션 Feature 규약.
    expect(render()).toContain('만원')
  })

  it('합계가 맞는다', () => {
    // 4,200 - 1,050 - 1,200 - 350 = 1,600
    const html = render()

    expect(html).toContain('4,200')
    expect(html).toContain('1,600')
  })
})
