import { describe, expect, it } from 'vitest'

import {
  MIN_VISIBLE_VIEW_COUNT,
  canShowViewCounts,
} from '@/lib/rankings/ranking-format'

const items = (...counts: number[]) => counts.map(viewCount => ({ viewCount }))

/*
 * #600(진단 H9). 「1회」·「조회 2회」 같은 낮은 수치는 아무도 쓰지 않는 서비스처럼 읽힌다. 홈·추천·
 * 분석 지름길이 같은 임계값을 쓴다.
 */
describe('canShowViewCounts', () => {
  it('모든 항목이 임계값 이상이면 숫자를 적는다', () => {
    expect(canShowViewCounts(items(MIN_VISIBLE_VIEW_COUNT, 1234, 500))).toBe(
      true,
    )
  })

  it('한 항목이라도 임계값 아래면 목록 전체가 순위만 보인다', () => {
    expect(canShowViewCounts(items(1234, MIN_VISIBLE_VIEW_COUNT - 1))).toBe(
      false,
    )
    expect(canShowViewCounts(items(1, 1, 1, 1, 1))).toBe(false)
  })

  it('빈 목록·비유한 값은 적을 숫자가 없다', () => {
    expect(canShowViewCounts([])).toBe(false)
    expect(canShowViewCounts(items(Number.NaN, 100))).toBe(false)
  })
})
