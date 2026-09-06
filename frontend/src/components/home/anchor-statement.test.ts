// src/components/home/anchor-statement.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AnchorStatement from '@/components/home/anchor-statement'

const renderText = (): string =>
  renderToStaticMarkup(createElement(AnchorStatement)).replace(/<[^>]+>/g, '')

describe('AnchorStatement', () => {
  it('앵커 문장 전체가 텍스트로 렌더된다(SR 낭독 보장)', () => {
    const text = renderText()

    expect(text).toContain('감이 아니라 숫자로 정합니다.')
    expect(text).toContain('매출·유동인구·경쟁 강도를 업종별로 봅니다.')
  })

  /*
   * home.md S2 #3 —「수식어 최소, 지표·동사 중심, AI 상투구·과장 배제」.
   * 이전 문구가 「방대한 데이터」·「오직 당신만을 위한 맞춤형」으로 그 규칙이 배제
   * 대상으로 지목한 표현을 그대로 썼다. 되돌아오면 여기서 걸린다.
   */
  it('규칙이 배제한 상투구를 쓰지 않는다', () => {
    const text = renderText()

    for (const banned of ['방대한', '오직 당신만을', '맞춤형']) {
      expect(text).not.toContain(banned)
    }
  })
})
