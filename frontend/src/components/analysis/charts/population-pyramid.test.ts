import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import PopulationPyramid from '@/components/analysis/charts/population-pyramid'

describe('PopulationPyramid', () => {
  it('연령 라벨과 남/여 값을 좌우로 노출한다', () => {
    const markup = renderToStaticMarkup(
      createElement(PopulationPyramid, {
        rows: [
          { ageLabel: '20대', male: 12, female: 18 },
          { ageLabel: '30대', male: 10, female: 8 },
        ],
        unit: '%',
      }),
    )
    expect(markup).toContain('20대')
    expect(markup).toContain('남성')
    expect(markup).toContain('여성')
    expect(markup).toContain('18%')
  })

  it('모든 값이 null이면 데이터 없음을 안내한다', () => {
    const markup = renderToStaticMarkup(
      createElement(PopulationPyramid, {
        rows: [{ ageLabel: '20대', male: null, female: null }],
        unit: '%',
      }),
    )
    expect(markup).toContain('데이터 없음')
  })

  it('한쪽 성별만 값이 있으면 나머지는 데이터 없음, 접근성 title은 유지한다', () => {
    const markup = renderToStaticMarkup(
      createElement(PopulationPyramid, {
        rows: [{ ageLabel: '30대', male: 20, female: null }],
        unit: '%',
      }),
    )
    expect(markup).toContain('20%')
    expect(markup).toContain('데이터 없음')
    expect(markup).toContain('30대 남성')
  })
})
