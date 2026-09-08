import { describe, expect, it } from 'vitest'

import { computeScrollReach } from '@/lib/ui/scroll-reach'

describe('computeScrollReach', () => {
  it('넘치지 않는 목록에는 양쪽 다 여지가 없다 — 화살표가 뜨면 안 된다', () => {
    expect(computeScrollReach(0, 356, 356)).toEqual({
      left: false,
      right: false,
    })
  })

  it('맨 왼쪽에서는 오른쪽으로만 여지가 있다', () => {
    expect(computeScrollReach(0, 600, 356)).toEqual({
      left: false,
      right: true,
    })
  })

  it('가운데에서는 양쪽 다 여지가 있다', () => {
    expect(computeScrollReach(120, 600, 356)).toEqual({
      left: true,
      right: true,
    })
  })

  it('맨 오른쪽에서는 왼쪽으로만 여지가 있다', () => {
    expect(computeScrollReach(244, 600, 356)).toEqual({
      left: true,
      right: false,
    })
  })

  /*
    브라우저가 scrollLeft 를 소수점으로 잡는다. 허용치가 없으면 끝까지 밀어도
    오른쪽 화살표가 남아 죽은 버튼이 된다.
  */
  it('끝에서 0.5px 모자라도 끝으로 친다', () => {
    expect(computeScrollReach(243.5, 600, 356)).toEqual({
      left: true,
      right: false,
    })
  })

  it('시작에서 0.5px 밀려도 시작으로 친다', () => {
    expect(computeScrollReach(0.5, 600, 356)).toEqual({
      left: false,
      right: true,
    })
  })
})
