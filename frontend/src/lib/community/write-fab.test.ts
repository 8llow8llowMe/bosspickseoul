import { describe, expect, it } from 'vitest'

import {
  WRITE_FAB_EXPAND_TOP,
  WRITE_FAB_TRAVEL,
  createWriteFabScrollState,
  getNextWriteFabScrollState,
  type WriteFabScrollState,
} from './write-fab'

/*
  모바일 글쓰기 FAB(community.md §S4 「목록 — 끊기지 않는 피드」 FAB). 아래로 내리면 접고,
  위로 올리거나 맨 위 근처면 편다. 손가락 떨림(몇 px 왕복)에는 반응하지 않는다.
*/

const scrollThrough = (start: number, positions: number[]) =>
  positions.reduce<WriteFabScrollState>(
    (state, y) => getNextWriteFabScrollState(state, y),
    createWriteFabScrollState(start),
  )

describe('write FAB scroll state', () => {
  it('starts expanded', () => {
    expect(createWriteFabScrollState(0).collapsed).toBe(false)
    expect(createWriteFabScrollState(600).collapsed).toBe(false)
  })

  it('collapses after scrolling down 8px in total, even in small steps', () => {
    expect(WRITE_FAB_TRAVEL).toBe(8)
    expect(scrollThrough(200, [203, 206]).collapsed).toBe(false)
    expect(scrollThrough(200, [203, 206, 208]).collapsed).toBe(true)
  })

  it('expands again after scrolling up 8px in total', () => {
    const collapsed = scrollThrough(200, [300])

    expect(collapsed.collapsed).toBe(true)
    expect(getNextWriteFabScrollState(collapsed, 295).collapsed).toBe(true)
    expect(
      scrollThrough(200, [300, 295, 292]).collapsed,
      'up travel accumulates',
    ).toBe(false)
  })

  it('ignores jitter that reverses before travelling 8px', () => {
    expect(scrollThrough(200, [205, 201, 206, 202]).collapsed).toBe(false)
    expect(scrollThrough(200, [300, 295, 299, 294]).collapsed).toBe(true)
  })

  it('always expands near the top of the page', () => {
    expect(WRITE_FAB_EXPAND_TOP).toBe(80)
    // 아래로 내려도 80 미만에서는 접지 않는다.
    expect(scrollThrough(0, [40, 79]).collapsed).toBe(false)
    // 접힌 뒤 80 미만으로 올라오면 펼친다(이동량과 무관).
    expect(scrollThrough(200, [400, 79]).collapsed).toBe(false)
  })
})
