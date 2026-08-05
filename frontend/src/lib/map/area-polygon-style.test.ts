import { describe, expect, it } from 'vitest'

import {
  resolveAreaPolygonState,
  resolveAreaPolygonStyle,
} from '@/lib/map/area-polygon-style'

const tokens = {
  baseStroke: '#0ea5e9',
  activeStroke: '#2272eb',
  fill: '#0ea5e9',
}

describe('resolveAreaPolygonState', () => {
  it('선택된 코드는 selected가 우선한다', () => {
    expect(resolveAreaPolygonState('a', 'a', 'a')).toBe('selected')
  })
  it('선택 아님 + hover면 hovered', () => {
    expect(resolveAreaPolygonState('a', 'b', 'a')).toBe('hovered')
  })
  it('둘 다 아니면 default', () => {
    expect(resolveAreaPolygonState('a', 'b', 'c')).toBe('default')
  })
})

describe('resolveAreaPolygonStyle', () => {
  it('default는 baseStroke 2px, fill 0.16', () => {
    expect(resolveAreaPolygonStyle('default', tokens, 10)).toEqual({
      strokeColor: '#0ea5e9',
      strokeWeight: 2,
      fillColor: '#0ea5e9',
      fillOpacity: 0.16,
      zIndex: 10,
    })
  })
  it('hovered는 activeStroke 3px, fill 0.32, zIndex 상향', () => {
    expect(resolveAreaPolygonStyle('hovered', tokens, 10)).toEqual({
      strokeColor: '#2272eb',
      strokeWeight: 3,
      fillColor: '#0ea5e9',
      fillOpacity: 0.32,
      zIndex: 510,
    })
  })
  it('selected는 activeStroke 3px, fill 0.40, 최상단', () => {
    expect(resolveAreaPolygonStyle('selected', tokens, 10)).toEqual({
      strokeColor: '#2272eb',
      strokeWeight: 3,
      fillColor: '#0ea5e9',
      fillOpacity: 0.4,
      zIndex: 1010,
    })
  })
})
