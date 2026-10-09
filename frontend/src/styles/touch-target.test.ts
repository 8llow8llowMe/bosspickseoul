import { describe, expect, it } from 'vitest'
import { TOUCH_TARGET_MIN, touchHitArea } from './touch-target'

/** styled-components 의 css 헬퍼는 문자열·배열이 섞인 보간 배열을 돌려준다. */
const flatten = (value: unknown): string =>
  Array.isArray(value) ? value.map(flatten).join('') : String(value ?? '')

describe('touchHitArea (#557)', () => {
  it('모바일 분기 안에서만 44px 이상 가상 요소를 중앙에 깐다', () => {
    const css = flatten(touchHitArea())

    expect(TOUCH_TARGET_MIN).toBe(44)
    expect(css).toContain('@media (max-width: 1023px)')
    expect(css).toContain('&::before')
    expect(css).toContain('max(100%, 44px)')
    expect(css).toContain('position: relative;')
  })

  it('keepPosition 이면 position: relative 를 덮어쓰지 않는다', () => {
    const css = flatten(touchHitArea({ keepPosition: true }))

    expect(css).not.toContain('position: relative;')
    expect(css).toContain('&::before')
  })
})
