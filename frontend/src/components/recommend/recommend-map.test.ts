import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

import type { AreaBoundaryItem } from '@/types/recommend'
import type { RecommendationMapItem } from '@/lib/recommend/recommend-map-model'

import RecommendMap, {
  createBackgroundClickGuard,
  createRecommendMapLayerSemanticKey,
  createRankMarkerAriaLabel,
  getResultDrawingOrder,
  readKakaoViewportBounds,
} from './recommend-map'
import * as recommendMapModule from './recommend-map'

const district: AreaBoundaryItem = {
  areaCode: '11680',
  areaName: '강남구',
  centerLng: 127.047,
  centerLat: 37.517,
  boundaryCoords: [
    [127.03, 37.5],
    [127.06, 37.5],
    [127.05, 37.53],
  ],
}

const result = (
  rank: number,
  commercialCode: string,
): RecommendationMapItem => ({
  rank,
  commercialCode,
  commercialName: `${rank}위 상권`,
  compositeScore: rank === 2 ? null : 80.4,
  centerLng: 127.04 + rank / 1000,
  centerLat: 37.51 + rank / 1000,
  boundaryCoords: [
    [127.03, 37.5],
    [127.05, 37.5],
    [127.04, 37.52],
  ],
})

const baseProps: Parameters<typeof RecommendMap>[0] = {
  stage: 'district',
  districtAreas: [district],
  administrationAreas: [],
  commercialAreas: [],
  resultAreas: [],
  selectedDistrictCode: null,
  selectedAdministrationCode: null,
  selectedCommercialCode: null,
  onDistrictSelect: vi.fn(),
  onAdministrationSelect: vi.fn(),
  onCommercialSelect: vi.fn(),
}

const mapSource = readFileSync(
  new URL('./recommend-map.tsx', import.meta.url),
  'utf8',
)
const globalStylesSource = readFileSync(
  new URL('../../styles/global-styles.ts', import.meta.url),
  'utf8',
)

const getCssBlock = (selector: string): string => {
  const selectorIndex = mapSource.indexOf(selector)
  const blockStart = mapSource.indexOf('{', selectorIndex)
  const blockEnd = mapSource.indexOf('\n  }', blockStart)

  return mapSource.slice(blockStart + 1, blockEnd)
}

const getCssProperty = (block: string, property: string): string =>
  block.match(
    new RegExp(
      `(?:^|\\n)\\s*${property}:\\s*(var\\(--[\\w-]+(?:,\\s*[^)]+)?\\)|#[\\da-f]+)`,
      'i',
    ),
  )?.[1] ?? ''

const resolveCssColor = (value: string): string => {
  if (!value.startsWith('var(')) {
    return value.length === 4
      ? `#${[...value.slice(1)].map(character => character.repeat(2)).join('')}`
      : value
  }

  const token = value.match(/var\((--[\w-]+)/)?.[1]
  const tokenValue = token
    ? globalStylesSource
        .match(new RegExp(`${token.replaceAll('-', '\\-')}:\\s*([^;]+);`))?.[1]
        .trim()
    : undefined

  return tokenValue ? resolveCssColor(tokenValue) : ''
}

const getContrastRatio = (foreground: string, background: string): number => {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map(index =>
      Number.parseInt(hex.slice(index, index + 2), 16),
    )
    const [red, green, blue] = channels.map(channel => {
      const normalized = channel / 255
      return normalized <= 0.03928
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4
    })

    return red * 0.2126 + green * 0.7152 + blue * 0.0722
  }
  const foregroundLuminance = luminance(foreground)
  const backgroundLuminance = luminance(background)

  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  )
}

describe('RecommendMap server rendering', () => {
  it('always renders the labelled map landmark and map controls', () => {
    const markup = renderToStaticMarkup(createElement(RecommendMap, baseProps))

    expect(markup).toContain('aria-label="상권 추천 지도"')
    expect(markup).toContain('role="region"')
    expect(markup).toContain('data-recommend-map-container="true"')
    expect(markup).toMatch(/<button[^>]*>선택 범위로 이동<\/button>/)
  })

  it('disables recentering until the Kakao map is ready', () => {
    const markup = renderToStaticMarkup(createElement(RecommendMap, baseProps))
    const recenterButton = markup.match(
      /<button[^>]*>선택 범위로 이동<\/button>/,
    )?.[0]

    expect(recenterButton).toContain('disabled=""')
  })

  it('keeps the map landmark while the client SDK has not loaded', () => {
    const markup = renderToStaticMarkup(createElement(RecommendMap, baseProps))
    const mapContainer = markup.match(
      /<div[^>]*data-recommend-map-container="true"[^>]*>/,
    )?.[0]

    expect(markup).toContain('aria-label="상권 추천 지도"')
    expect(markup).toContain('data-recommend-map-container="true"')
    expect(markup).not.toContain('role="alert"')
    expect(mapContainer).not.toContain('aria-hidden')
  })

  it('does not infer the recommendation stage from map zoom events', () => {
    const source = readFileSync(
      new URL('./recommend-map.tsx', import.meta.url),
      'utf8',
    )

    expect(source).not.toMatch(/getLevel\s*\(|zoom_changed/)
  })
})

describe('readKakaoViewportBounds', () => {
  it('reads and normalizes the current Kakao map viewport', () => {
    const latLng = (lat: number, lng: number): KakaoMapLatLng => ({
      getLat: () => lat,
      getLng: () => lng,
    })
    const map = {
      getBounds: () => ({
        extend: vi.fn(),
        getSouthWest: () => latLng(37.41234567, 126.91234567),
        getNorthEast: () => latLng(37.61234567, 127.11234567),
      }),
    } as unknown as KakaoMapInstance

    expect(readKakaoViewportBounds(map)).toEqual({
      lngSW: 126.912346,
      latSW: 37.412346,
      lngNE: 127.112346,
      latNE: 37.612346,
    })
  })
})

describe('recommend rank marker contrast', () => {
  it.each([
    {
      state: 'unselected',
      selector: '& .recommend-rank-marker {',
      expectedForeground: 'var(--color-text-900, #191f28)',
      expectedBackground: 'var(--color-surface, #fff)',
    },
    {
      state: 'selected',
      selector: "& .recommend-rank-marker[aria-pressed='true'] {",
      expectedForeground: 'var(--color-text-900, #191f28)',
      expectedBackground: 'var(--color-primary-700, #0ea5e9)',
    },
  ])(
    'uses CSS tokens with at least 4.5:1 contrast when $state',
    ({ selector, expectedForeground, expectedBackground }) => {
      const block = getCssBlock(selector)
      const foreground = getCssProperty(block, 'color')
      const background = getCssProperty(block, 'background')

      expect(foreground).toBe(expectedForeground)
      expect(background).toBe(expectedBackground)
      expect(
        getContrastRatio(
          resolveCssColor(foreground),
          resolveCssColor(background),
        ),
      ).toBeGreaterThanOrEqual(4.5)
    },
  )
})

describe('recommend result overlay helpers', () => {
  it('draws normal ranks in reverse order, then preview, then selection', () => {
    const areas = [
      result(1, 'first'),
      result(2, 'second'),
      result(3, 'third'),
      result(4, 'fourth'),
      result(5, 'fifth'),
    ]

    expect(getResultDrawingOrder(areas, 'second', 'fourth')).toEqual([
      areas[4],
      areas[2],
      areas[0],
      areas[3],
      areas[1],
    ])
  })

  it('keeps a selected preview item last without duplicating it', () => {
    const areas = [result(1, 'first'), result(2, 'second')]

    expect(getResultDrawingOrder(areas, 'first', 'first')).toEqual([
      areas[1],
      areas[0],
    ])
  })

  it('includes rounded and unavailable scores in marker labels', () => {
    expect(createRankMarkerAriaLabel(result(1, 'first'))).toBe(
      '1위 1위 상권, 80점',
    )
    expect(createRankMarkerAriaLabel(result(2, 'second'))).toBe(
      '2위 2위 상권, 점수 데이터 없음',
    )
  })

  it('keeps background clicks suppressed until the latest action resets', () => {
    const scheduledResets: Array<() => void> = []
    const guard = createBackgroundClickGuard(callback => {
      scheduledResets.push(callback)
    })

    guard.suppressForCurrentTask()
    guard.suppressForCurrentTask()
    scheduledResets[0]()

    expect(guard.isSuppressed()).toBe(true)

    scheduledResets[1]()
    expect(guard.isSuppressed()).toBe(false)
  })

  it('previews and selects the commercial clicked through a rank marker', () => {
    const selectCommercialFromRankMarker = Reflect.get(
      recommendMapModule,
      'selectCommercialFromRankMarker',
    ) as
      | ((
          commercialCode: string,
          onSelect: (code: string) => void,
          onPreviewChange?: (code: string | null) => void,
        ) => void)
      | undefined
    const events: string[] = []

    expect(selectCommercialFromRankMarker).toBeTypeOf('function')
    selectCommercialFromRankMarker?.(
      '3110008',
      code => events.push(`select:${code}`),
      code => events.push(`preview:${code}`),
    )

    expect(events).toEqual(['preview:3110008', 'select:3110008'])
  })

  it('Task8: updates preview visuals without replacing the focused marker DOM', () => {
    const updateResultLayerPreviewVisuals = Reflect.get(
      recommendMapModule,
      'updateResultLayerPreviewVisuals',
    ) as
      | ((
          entries: Array<{
            item: RecommendationMapItem
            marker: { setAttribute: (name: string, value: string) => void }
            polygon: {
              setMap: (map: null) => void
              setOptions: (options: {
                strokeColor: string
                strokeWeight: number
                fillColor: string
                fillOpacity: number
              }) => void
              setZIndex: (zIndex: number) => void
            } | null
            overlay: {
              setMap: (map: null) => void
              setZIndex: (zIndex: number) => void
            }
          }>,
          selectedCode: string | null,
          previewedCode: string | null,
          tokens: {
            baseStroke: string
            activeStroke: string
            fill: string
          },
        ) => void)
      | undefined
    const tokens = {
      baseStroke: '#2272eb',
      activeStroke: '#2272eb',
      fill: '#2272eb',
    }
    const marker = { setAttribute: vi.fn() }
    const polygon = {
      setMap: vi.fn(),
      setOptions: vi.fn(),
      setZIndex: vi.fn(),
    }
    const overlay = {
      setMap: vi.fn(),
      setZIndex: vi.fn(),
    }
    const entries = [
      {
        item: result(1, 'first'),
        marker: { setAttribute: vi.fn() },
        polygon: null,
        overlay: { setMap: vi.fn(), setZIndex: vi.fn() },
      },
      {
        item: result(2, 'second'),
        marker,
        polygon,
        overlay,
      },
    ]

    expect(updateResultLayerPreviewVisuals).toBeTypeOf('function')
    updateResultLayerPreviewVisuals?.(entries, 'first', 'second', tokens)

    expect(entries[1].marker).toBe(marker)
    expect(marker.setAttribute).toHaveBeenCalledWith('data-previewed', 'true')
    // preview 는 공용 hovered 규격(2px)을 타고, fill 은 점수 농도 0.29 에 +0.10.
    expect(polygon.setOptions).toHaveBeenCalledWith({
      strokeColor: '#2272eb',
      strokeWeight: 2,
      fillColor: '#2272eb',
      fillOpacity: 0.39,
    })
    expect(polygon.setMap).not.toHaveBeenCalled()
    expect(overlay.setMap).not.toHaveBeenCalled()

    updateResultLayerPreviewVisuals?.(entries, 'second', null, tokens)

    expect(entries[1].marker).toBe(marker)
    expect(marker.setAttribute).toHaveBeenCalledWith('aria-pressed', 'true')
    // selected 는 공용 2.5px, fill 은 0.29 에 +0.20.
    expect(polygon.setOptions).toHaveBeenLastCalledWith({
      strokeColor: '#2272eb',
      strokeWeight: 2.5,
      fillColor: '#2272eb',
      fillOpacity: 0.49,
    })
    expect(polygon.setMap).not.toHaveBeenCalled()
    expect(overlay.setMap).not.toHaveBeenCalled()
  })

  it('uses one structural key for semantically identical result layers', () => {
    const createRecommendMapLayerSemanticKey = Reflect.get(
      recommendMapModule,
      'createRecommendMapLayerSemanticKey',
    ) as
      | ((input: {
          stage: 'results'
          districtAreas: AreaBoundaryItem[]
          administrationAreas: AreaBoundaryItem[]
          resultAreas: RecommendationMapItem[]
          selectedDistrictCode: string | null
          selectedAdministrationCode: string | null
          selectedCommercialCode?: string | null
          previewedCommercialCode?: string | null
          onCommercialSelect?: () => void
        }) => string)
      | undefined
    const administration = {
      ...district,
      areaCode: '11680101',
      areaName: '역삼1동',
    }
    const firstInput = {
      stage: 'results' as const,
      districtAreas: [district],
      administrationAreas: [administration],
      resultAreas: [result(1, 'first'), result(2, 'second')],
      selectedDistrictCode: district.areaCode,
      selectedAdministrationCode: administration.areaCode,
      selectedCommercialCode: 'first',
      previewedCommercialCode: null,
      onCommercialSelect: vi.fn(),
    }
    const secondInput = {
      ...firstInput,
      districtAreas: [{ ...district }],
      administrationAreas: [{ ...administration }],
      resultAreas: firstInput.resultAreas.map(item => ({
        ...item,
        boundaryCoords: [...item.boundaryCoords],
      })),
      selectedCommercialCode: 'second',
      previewedCommercialCode: 'second',
      onCommercialSelect: vi.fn(),
    }

    expect(createRecommendMapLayerSemanticKey).toBeTypeOf('function')
    expect(createRecommendMapLayerSemanticKey?.(secondInput)).toBe(
      createRecommendMapLayerSemanticKey?.(firstInput),
    )

    expect(
      createRecommendMapLayerSemanticKey?.({
        ...secondInput,
        resultAreas: [
          {
            ...secondInput.resultAreas[0],
            centerLng: secondInput.resultAreas[0].centerLng + 0.01,
          },
          secondInput.resultAreas[1],
        ],
      }),
    ).not.toBe(createRecommendMapLayerSemanticKey?.(firstInput))
  })

  it('includes viewport commercial geometry in the commercial stage key', () => {
    const administration = {
      ...district,
      areaCode: '11680101',
      areaName: '역삼1동',
    }
    const commercial = {
      ...district,
      areaCode: 'C001',
      areaName: '강남역 상권',
    }
    const input = {
      stage: 'commercial' as const,
      districtAreas: [district],
      administrationAreas: [administration],
      commercialAreas: [commercial],
      resultAreas: [],
      selectedDistrictCode: district.areaCode,
      selectedAdministrationCode: administration.areaCode,
      previewedCommercialCode: null,
    }

    expect(createRecommendMapLayerSemanticKey(input)).not.toBe(
      createRecommendMapLayerSemanticKey({
        ...input,
        commercialAreas: [
          {
            ...commercial,
            boundaryCoords: [...commercial.boundaryCoords, [127.08, 37.54]],
          },
        ],
      }),
    )
  })

  it('결과 단계 행정동은 채움 없는 중립 외곽선이다 — 선택된 것처럼 보이면 안 된다', () => {
    const getResultContextPolygonStyle = Reflect.get(
      recommendMapModule,
      'getResultContextPolygonStyle',
    ) as
      | ((outlineColor: string) => {
          strokeColor: string
          strokeWeight: number
          fillColor: string
          fillOpacity: number
        })
      | undefined

    expect(getResultContextPolygonStyle).toBeTypeOf('function')
    expect(getResultContextPolygonStyle?.('#d1d6db')).toEqual({
      strokeColor: '#d1d6db',
      strokeWeight: 1.5,
      fillColor: '#d1d6db',
      // 결과 단계 행정동은 배경 맥락이라 채우지 않는다 — 채우면 행정동을
      // 선택한 것처럼 읽힌다.
      fillOpacity: 0,
    })
  })
})
