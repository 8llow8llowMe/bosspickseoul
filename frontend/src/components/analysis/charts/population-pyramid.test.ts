import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import PopulationPyramid, {
  toPyramidChartData,
} from '@/components/analysis/charts/population-pyramid'
import type { PyramidRow } from '@/lib/analysis/chart-data'

const row = (
  ageLabel: string,
  male: number | null,
  female: number | null,
): PyramidRow => ({ ageLabel, male, female })

describe('PopulationPyramid / toPyramidChartData', () => {
  it('남성 값은 좌측 발산을 위해 음수로, 원본은 abs에 보존한다', () => {
    const data = toPyramidChartData([row('20대', 12, 8)])
    expect(data[0]).toEqual({
      ageLabel: '20대',
      maleValue: -12,
      femaleValue: 8,
      maleAbs: 12,
      femaleAbs: 8,
    })
  })

  it('null은 막대값 0으로 두되 abs는 null로 보존한다', () => {
    const data = toPyramidChartData([row('20대', null, 8)])
    expect(data[0].maleValue).toBe(0)
    expect(data[0].maleAbs).toBeNull()
  })

  it('전부 null이면 데이터 없음 안내를 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(PopulationPyramid, {
        rows: [row('20대', null, null)],
      }),
    )
    expect(markup).toContain('데이터 없음')
  })
})
