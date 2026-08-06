import { describe, expect, it } from 'vitest'

import { applyActivatedIds } from '@/lib/analysis/use-activated-sections'

describe('applyActivatedIds', () => {
  it('뷰포트에 근접한 새 id를 활성 집합에 추가한다', () => {
    const next = applyActivatedIds(new Set(['summary']), ['sales'])
    expect(next.has('summary')).toBe(true)
    expect(next.has('sales')).toBe(true)
  })

  it('이미 활성화된 id는 다시 넣어도 집합이 그대로다(변경 없으면 동일 참조 반환)', () => {
    const previous = new Set(['summary', 'sales'])
    const next = applyActivatedIds(previous, ['summary'])
    expect(next).toBe(previous)
  })

  it('한 번 활성화된 id는 교차가 끝나도 유지된다(호출 자체가 제거를 표현하지 않음)', () => {
    const afterEnter = applyActivatedIds(new Set(), ['trend'])
    // 이후 관찰자가 더 이상 트렌드 섹션이 교차하지 않는다고 보고해도, 이 함수는
    // "새로 진입한 id"만 인자로 받으므로 호출되지 않고, 상태는 sticky하게 유지된다.
    expect(afterEnter.has('trend')).toBe(true)
  })

  it('빈 진입 목록이면 원본과 동일한 참조를 반환한다', () => {
    const previous = new Set(['summary'])
    expect(applyActivatedIds(previous, [])).toBe(previous)
  })
})
