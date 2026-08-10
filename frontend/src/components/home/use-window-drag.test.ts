import { describe, expect, it } from 'vitest'
import { clampOffset } from '@/components/home/use-window-drag'

describe('clampOffset', () => {
  const bounds = { minX: -100, maxX: 100, minY: -80, maxY: 80 }
  it('범위 내는 그대로', () => {
    expect(clampOffset({ x: 20, y: -30 }, bounds)).toEqual({ x: 20, y: -30 })
  })
  it('범위를 벗어나면 경계로 클램프', () => {
    expect(clampOffset({ x: 250, y: -250 }, bounds)).toEqual({ x: 100, y: -80 })
  })
})
