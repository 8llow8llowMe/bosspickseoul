import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisMap, {
  createAnalysisMapLayerKey,
} from '@/components/analysis/analysis-map'
import type { AreaBoundaryItem } from '@/types/recommend'

const areas: AreaBoundaryItem[] = [
  {
    areaCode: '11680',
    areaName: '강남구',
    centerLng: 127.05,
    centerLat: 37.51,
    boundaryCoords: [
      [127.04, 37.5],
      [127.06, 37.5],
      [127.05, 37.52],
    ],
  },
]

describe('AnalysisMap', () => {
  it('서버 렌더링에서도 지도 대체 영역과 접근 가능한 이름을 제공한다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisMap, {
        areas,
        activeStep: 'district',
        selectedCode: null,
        previewedCode: null,
        onSelect: () => undefined,
        onPreviewChange: () => undefined,
        onViewportBoundsChange: () => undefined,
      }),
    )

    expect(markup).toContain('분석 지역 지도')
    expect(markup).toContain('지도를 준비하고 있어요')
  })

  it('영역 순서가 달라도 같은 semantic key를 만든다', () => {
    const input = {
      activeStep: 'district' as const,
      areas,
      selectedCode: '11680',
    }

    expect(createAnalysisMapLayerKey(input)).toBe(
      createAnalysisMapLayerKey({ ...input, areas: [...areas].reverse() }),
    )
  })
})
