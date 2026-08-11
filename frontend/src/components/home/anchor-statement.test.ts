// src/components/home/anchor-statement.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AnchorStatement from '@/components/home/anchor-statement'

describe('AnchorStatement', () => {
  it('앵커 문장 전체가 텍스트로 렌더된다(SR 낭독 보장)', () => {
    const html = renderToStaticMarkup(createElement(AnchorStatement))
    const text = html.replace(/<[^>]+>/g, '')
    expect(text).toContain('감에 의존하지 마세요.')
    expect(text).toContain('오직 당신만을 위한 맞춤형 리포트를 완성합니다.')
  })
})
