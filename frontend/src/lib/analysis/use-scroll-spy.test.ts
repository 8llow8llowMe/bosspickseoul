import { describe, expect, it } from 'vitest'

import { resolveActiveSpyId } from '@/lib/analysis/use-scroll-spy'

describe('resolveActiveSpyId', () => {
  it('아무 섹션도 교차하지 않으면 이전 활성 id를 유지한다', () => {
    expect(
      resolveActiveSpyId(
        [
          { id: 'report-summary', isIntersecting: false, top: -400 },
          { id: 'report-sales', isIntersecting: false, top: 600 },
        ],
        ['report-summary', 'report-sales'],
        'report-summary',
      ),
    ).toBe('report-summary')
  })

  it('교차하는 섹션이 하나면 그 섹션을 활성으로 고른다', () => {
    expect(
      resolveActiveSpyId(
        [
          { id: 'report-summary', isIntersecting: false, top: -400 },
          { id: 'report-sales', isIntersecting: true, top: 40 },
        ],
        ['report-summary', 'report-sales'],
        'report-summary',
      ),
    ).toBe('report-sales')
  })

  it('여러 섹션이 동시에 교차하면 뷰포트 상단에 가장 가까운 섹션을 고른다', () => {
    expect(
      resolveActiveSpyId(
        [
          { id: 'report-foot-traffic', isIntersecting: true, top: 120 },
          { id: 'report-sales', isIntersecting: true, top: 5 },
        ],
        ['report-summary', 'report-foot-traffic', 'report-sales'],
        'report-summary',
      ),
    ).toBe('report-sales')
  })

  it('교차한 id가 관찰 대상 목록에 없으면 이전 값을 유지한다', () => {
    expect(
      resolveActiveSpyId(
        [{ id: 'report-unknown', isIntersecting: true, top: 0 }],
        ['report-summary', 'report-sales'],
        'report-summary',
      ),
    ).toBe('report-summary')
  })
})
