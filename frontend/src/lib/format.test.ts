import { describe, expect, it } from 'vitest'

import { formatLargeWon } from '@/lib/format'

describe('formatLargeWon', () => {
  it('만원 단위 입력을 억·만원 자리로 나눠 표기한다', () => {
    // 입력은 만원이다. 23,450만원 = 2억 3,450만원.
    expect(formatLargeWon(23_450)).toBe('2억 3,450만원')
    expect(formatLargeWon(2_733_782)).toBe('273억 3,782만원')
  })

  it('만원 자리를 절사하지 않는다', () => {
    // 축약 포매터가 아니다 — 데이터 자체가 만원 단위라 이게 가능한 최대 정밀도다.
    expect(formatLargeWon(10_001)).toBe('1억 1만원')
    expect(formatLargeWon(10_050)).toBe('1억 50만원')
  })

  it('억 자리가 딱 떨어지면 만원 자리를 붙이지 않는다', () => {
    // `1억 0만원` 은 사람이 쓰지 않는 표기다.
    expect(formatLargeWon(10_000)).toBe('1억')
    expect(formatLargeWon(20_000)).toBe('2억')
  })

  it('0 은 0만원이 아니라 0원이다', () => {
    // 가맹 부담금은 `null`(항목 숨김)과 `0`(0원 표기)이 다른 자리다 — DESIGN.md S-SIM-2.
    expect(formatLargeWon(0)).toBe('0원')
  })

  it('억 미만은 만원으로만 표기한다', () => {
    expect(formatLargeWon(300)).toBe('300만원')
    expect(formatLargeWon(9_999)).toBe('9,999만원')
  })

  it('네 자리 억도 자릿수를 구분한다', () => {
    expect(formatLargeWon(12_345_678)).toBe('1,234억 5,678만원')
  })
})
