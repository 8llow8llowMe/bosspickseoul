import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisMiniDemo from '@/components/home/analysis-mini-demo'
import { DEFAULT_SELECTION } from '@/data/home-demo'

/*
 * D8-3: 선택 상태가 `ProductStory` 로 올라가면서 이 컴포넌트는 이제
 * selection/onSelectionChange 를 props 로 받는다. 이 파일의 관심사(라벨·CTA)는
 * 기본 선택으로도 그대로 확인할 수 있어 onSelectionChange 는 빈 함수로 둔다.
 */
const render = () =>
  renderToStaticMarkup(
    createElement(AnalysisMiniDemo, {
      selection: DEFAULT_SELECTION,
      onSelectionChange: () => undefined,
    }),
  )

describe('AnalysisMiniDemo — AI 리포트 표기', () => {
  it('인사이트 문장에 AI 리포트 라벨을 붙인다', () => {
    const html = render()

    expect(html).toContain('AI 리포트 요약')
  })

  it('라벨 안에 「예시」를 함께 적는다', () => {
    // 이 문장은 home-demo.ts 의 하드코딩 문자열이다.
    // 「AI 리포트 요약」이라고만 쓰면 하드코딩이 AI 출력인 척하게 된다.
    const html = render()
    const labelIndex = html.indexOf('AI 리포트 요약')
    const window = html.slice(labelIndex, labelIndex + 80)

    expect(window).toContain('예시')
  })

  /*
   * story-panel-redesign D4-2: CTA 는 패널 왼쪽이 든다. 데모 안에 또 두면 02 만 버튼이
   * 다른 자리에 있고, 패널과 합쳐 버튼이 둘이 된다.
   */
  it('데모 안에 CTA 링크를 두지 않는다 (TC-SP-005)', () => {
    expect(render()).not.toContain('href=')
  })

  /* 매출 증감은 패널 왼쪽 큰 숫자가 말한다 — 데모가 또 말하지 않는다(TC-SP-005). */
  it('매출 증감을 다시 싣지 않는다', () => {
    const html = render()

    expect(html).not.toContain('매출 증감')
    expect(html).not.toContain('+5.3%')
  })

  it('지역·업종 선택은 radiogroup 두 개로 남는다', () => {
    const html = render()

    expect(html.match(/role="radiogroup"/g)).toHaveLength(2)
    expect(html.match(/role="radio"/g)).toHaveLength(8)
  })

  it('홈 전용 꺾은선으로 그린다 — 공용 recharts 차트가 아니다', () => {
    const html = render()

    expect(html).toContain('<polyline')
    expect(html).not.toContain('recharts')
  })
})
