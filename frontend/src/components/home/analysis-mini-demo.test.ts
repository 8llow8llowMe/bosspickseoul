import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisMiniDemo from '@/components/home/analysis-mini-demo'

describe('AnalysisMiniDemo — AI 리포트 표기', () => {
  it('인사이트 문장에 AI 리포트 라벨을 붙인다', () => {
    const html = renderToStaticMarkup(createElement(AnalysisMiniDemo))

    expect(html).toContain('AI 리포트 요약')
  })

  it('라벨 안에 「예시」를 함께 적는다', () => {
    // 이 문장은 home-demo.ts 의 하드코딩 문자열이다.
    // 「AI 리포트 요약」이라고만 쓰면 하드코딩이 AI 출력인 척하게 된다.
    const html = renderToStaticMarkup(createElement(AnalysisMiniDemo))
    const labelIndex = html.indexOf('AI 리포트 요약')
    const window = html.slice(labelIndex, labelIndex + 80)

    expect(window).toContain('예시')
  })

  it('CTA 가 AI 리포트로 이어진다고 말한다', () => {
    const html = renderToStaticMarkup(createElement(AnalysisMiniDemo))

    expect(html).toContain('AI 리포트 받기')
    expect(html).toContain('href="/analysis"')
  })
})
