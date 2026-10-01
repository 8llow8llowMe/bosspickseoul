import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ShareBar from '@/components/analysis/charts/share-bar'

describe('ShareBar', () => {
  it('건수 단위는 비율 옆에 값을 함께 적고 접근성 이름에도 싣는다', () => {
    const markup = renderToStaticMarkup(
      createElement(ShareBar, {
        segments: [
          { label: '남성', value: 450, color: 'red' },
          { label: '여성', value: 550, color: 'blue' },
        ],
        unit: '건',
        title: '성별 결제 건수',
        ariaLabel: '성별 결제 건수 비율',
      }),
    )
    expect(markup).toContain('성별 결제 건수')
    expect(markup).toContain('45%')
    expect(markup).toContain('550건')
    expect(markup).toContain(
      '성별 결제 건수 비율: 남성 45% · 450건, 여성 55% · 550건',
    )
  })

  it('퍼센트 단위는 비율만 적는다', () => {
    const markup = renderToStaticMarkup(
      createElement(ShareBar, {
        segments: [
          { label: '남성', value: 57, color: 'red' },
          { label: '여성', value: 43, color: 'blue' },
        ],
        unit: '%',
        ariaLabel: '성별 상주인구 비율',
      }),
    )
    expect(markup).toContain('성별 상주인구 비율: 남성 57%, 여성 43%')
    expect(markup).not.toContain('57%%')
  })

  it('값이 모두 0 이면 데이터 없음을 적는다', () => {
    const markup = renderToStaticMarkup(
      createElement(ShareBar, {
        segments: [{ label: '남성', value: 0, color: 'red' }],
        unit: '건',
        ariaLabel: 'x',
      }),
    )
    expect(markup).toContain('데이터 없음')
  })
})
