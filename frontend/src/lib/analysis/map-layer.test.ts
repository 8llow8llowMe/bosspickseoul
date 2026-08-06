import { describe, expect, it } from 'vitest'
import { resolveMapLayerByZoom } from '@/lib/analysis/map-layer'

describe('resolveMapLayerByZoom', () => {
  it('level 7 이상은 자치구', () => {
    expect(resolveMapLayerByZoom(9)).toBe('district')
    expect(resolveMapLayerByZoom(7)).toBe('district')
  })
  it('level 5~6은 행정동', () => {
    expect(resolveMapLayerByZoom(6)).toBe('administration')
    expect(resolveMapLayerByZoom(5)).toBe('administration')
  })
  it('level 4 이하는 상권', () => {
    expect(resolveMapLayerByZoom(4)).toBe('commercial')
    expect(resolveMapLayerByZoom(1)).toBe('commercial')
  })
})
