import { describe, expect, it } from 'vitest'

import {
  formatAnalysisValue,
  formatKoreanMoney,
  formatPeriodCode,
  getMetricMaximum,
  normalizeAnalysisTab,
  toMetricRows,
} from '@/lib/analysis/presentation'

describe('analysis presentation', () => {
  it('지원하지 않는 탭은 요약으로 정규화한다', () => {
    expect(normalizeAnalysisTab('trend')).toBe('trend')
    expect(normalizeAnalysisTab('unknown')).toBe('summary')
    expect(normalizeAnalysisTab(null)).toBe('summary')
  })

  it('null 지표를 0으로 바꾸지 않는다', () => {
    expect(formatAnalysisValue(null, '원')).toBe('데이터 없음')
    expect(formatAnalysisValue(undefined, '명')).toBe('데이터 없음')
    expect(formatAnalysisValue(12000, '명')).toBe('12,000명')
  })

  it('금액을 억/만원 단위로 절사해 표기한다', () => {
    expect(formatKoreanMoney(345345345)).toBe('3억 4534만원')
    expect(formatKoreanMoney(3234278)).toBe('323만원')
    expect(formatKoreanMoney(471000000000)).toBe('4,710억원')
    expect(formatKoreanMoney(300000000)).toBe('3억원')
    expect(formatKoreanMoney(5000)).toBe('5,000원')
    expect(formatKoreanMoney(0)).toBe('0원')
    expect(formatKoreanMoney(null)).toBe('데이터 없음')
  })

  it("formatAnalysisValue는 unit이 '원'이면 억/만원 표기로 위임한다", () => {
    expect(formatAnalysisValue(345345345, '원')).toBe('3억 4534만원')
    expect(formatAnalysisValue(12000, '명')).toBe('12,000명')
  })

  it('분기 코드를 사용자 문구로 바꾼다', () => {
    expect(formatPeriodCode('20233')).toBe('2023년 3분기')
    expect(formatPeriodCode('invalid')).toBe('기준 시점 정보 없음')
  })

  it('객체 필드를 표시용 지표 배열로 바꾸고 최댓값을 구한다', () => {
    const rows = toMetricRows(
      { mondayFootTraffic: 10, tuesdayFootTraffic: null },
      [
        ['월', 'mondayFootTraffic'],
        ['화', 'tuesdayFootTraffic'],
      ] as const,
    )

    expect(rows).toEqual([
      { label: '월', value: 10 },
      { label: '화', value: null },
    ])
    expect(getMetricMaximum(rows)).toBe(10)
  })
})
