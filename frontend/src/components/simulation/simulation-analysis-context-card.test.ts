import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationAnalysisContextCard from '@/components/simulation/simulation-analysis-context-card'
import type { SimulationAnalysisContext } from '@/lib/simulation/analysis-context'

const context: SimulationAnalysisContext = {
  districtCode: '11410',
  districtName: '서대문구',
  serviceCode: 'CS100001',
  serviceName: '한식음식점',
  commercialCode: '3110001',
}

const render = (applied: boolean) =>
  renderToStaticMarkup(
    createElement(SimulationAnalysisContextCard, {
      context,
      applied,
      onRestore: () => {},
    }),
  )

describe('SimulationAnalysisContextCard', () => {
  it('가져온 조건이 그대로면 그렇게 말한다', () => {
    const markup = render(true)

    expect(markup).toContain('분석 조건을 그대로 채워 뒀어요')
    expect(markup).toContain('서대문구')
    expect(markup).toContain('한식음식점')
    expect(markup).not.toContain('분석 조건으로 되돌리기')
  })

  it('조건이 바뀌면 "그대로 채워 뒀어요"를 남기지 않는다', () => {
    // 이게 이 카드의 버그였다. 카드는 서대문구·한식음식점인데 사용자가 강동구·치킨전문점으로
    // 바꿔 계산하면, 카드가 계속 "그대로 채워 뒀어요"라고 거짓말을 했다.
    const markup = render(false)

    expect(markup).not.toContain('그대로 채워 뒀어요')
    expect(markup).toContain('조건을 직접 바꿨어요')
    expect(markup).toContain('분석 조건으로 되돌리기')
    // 배지가 *지금 선택*이 아니라 *분석에서 가져온 조건*임을 문구로 드러낸다.
    expect(markup).toContain('분석 조건 · 서대문구')
    expect(markup).toContain('분석 조건 · 한식음식점')
  })
})
