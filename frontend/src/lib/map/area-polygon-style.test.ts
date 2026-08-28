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
  it('default는 baseStroke 1.5px, fill 0.08', () => {
    expect(resolveAreaPolygonStyle('default', tokens, 10)).toEqual({
      strokeColor: '#0ea5e9',
      strokeWeight: 1.5,
      fillColor: '#0ea5e9',
      fillOpacity: 0.08,
      zIndex: 10,
    })
  })
  it('hovered는 activeStroke 2px, fill 0.18, zIndex 상향', () => {
    expect(resolveAreaPolygonStyle('hovered', tokens, 10)).toEqual({
      strokeColor: '#2272eb',
      strokeWeight: 2,
      fillColor: '#0ea5e9',
      fillOpacity: 0.18,
      zIndex: 510,
    })
  })
  it('selected는 activeStroke 2.5px, fill 0.28, 최상단', () => {
    expect(resolveAreaPolygonStyle('selected', tokens, 10)).toEqual({
      strokeColor: '#2272eb',
      strokeWeight: 2.5,
      fillColor: '#0ea5e9',
      fillOpacity: 0.28,
      zIndex: 1010,
    })
  })

  describe('baseFillOpacity 오버라이드', () => {
    it('stroke 규격은 그대로 두고 fill 만 넘긴 값을 base 로 쓴다', () => {
      expect(resolveAreaPolygonStyle('default', tokens, 10, 0.29)).toEqual({
        strokeColor: '#0ea5e9',
        strokeWeight: 1.5,
        fillColor: '#0ea5e9',
        fillOpacity: 0.29,
        zIndex: 10,
      })
    })

    it('hovered/selected 는 기본 사다리와 같은 폭(+0.10/+0.20)을 얹는다', () => {
      expect(
        resolveAreaPolygonStyle('hovered', tokens, 10, 0.29).fillOpacity,
      ).toBe(0.39)
      expect(
        resolveAreaPolygonStyle('selected', tokens, 10, 0.29).fillOpacity,
      ).toBe(0.49)
    })

    it('짙은 농도에서도 0.6 을 넘기지 않는다', () => {
      expect(
        resolveAreaPolygonStyle('selected', tokens, 10, 0.42).fillOpacity,
      ).toBe(0.6)
    })

    it('부동소수 잔재 없이 2자리로 떨어진다', () => {
      expect(
        resolveAreaPolygonStyle('hovered', tokens, 10, 0.23).fillOpacity,
      ).toBe(0.33)
    })
  })
})
