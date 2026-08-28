import {
  Coffee,
  Scale,
  ShoppingBag,
  Store,
  UtensilsCrossed,
} from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { resolveServiceIcon } from './service-icons'

describe('resolveServiceIcon', () => {
  it('uses the individual mapping when there is one', () => {
    expect(resolveServiceIcon('CS100010')).toBe(Coffee)
    expect(resolveServiceIcon('CS200013')).toBe(Scale)
  })

  // T-D8 — 카탈로그(31개) 밖의 코드가 실제로 온다. 빈칸을 남기지 않는다.
  it('falls back to the major category for an unmapped code', () => {
    expect(resolveServiceIcon('CS100999')).toBe(UtensilsCrossed)
    expect(resolveServiceIcon('CS300999')).toBe(ShoppingBag)
  })

  it('still returns an icon when even the category is unknown', () => {
    expect(resolveServiceIcon('ZZ999999')).toBe(Store)
    expect(resolveServiceIcon('')).toBe(Store)
    expect(resolveServiceIcon(undefined)).toBe(Store)
    expect(resolveServiceIcon(null)).toBe(Store)
  })
})
