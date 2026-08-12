import { describe, expect, it } from 'vitest'

import {
  ANALYSIS_SHEET_COLLAPSED_HEIGHT,
  didAnalysisSheetDrag,
  getAnalysisSheetHeightBounds,
  resolveAnalysisSheetSnapFromDrag,
  shouldSuppressAnalysisSheetClick,
} from '@/lib/analysis/analysis-sheet-state'

describe('getAnalysisSheetHeightBounds', () => {
  it('비정상 뷰포트는 접힘 높이로 고정한다', () => {
    expect(getAnalysisSheetHeightBounds(0)).toEqual({
      collapsedHeight: ANALYSIS_SHEET_COLLAPSED_HEIGHT,
      expandedHeight: ANALYSIS_SHEET_COLLAPSED_HEIGHT,
    })
    expect(getAnalysisSheetHeightBounds(Number.NaN).expandedHeight).toBe(
      ANALYSIS_SHEET_COLLAPSED_HEIGHT,
    )
  })

  it('지도 최소 높이를 남기도록 펼침 높이를 제한한다', () => {
    // 720px 뷰포트: ratio(0.72)=518.4 vs (720-180)=540 → 더 작은 값 채택
    const bounds = getAnalysisSheetHeightBounds(720)
    expect(bounds.collapsedHeight).toBe(ANALYSIS_SHEET_COLLAPSED_HEIGHT)
    expect(bounds.expandedHeight).toBeCloseTo(518.4)
  })

  it('작은 뷰포트에서는 지도 여백 규칙이 우선한다', () => {
    // 400px: ratio=288 vs (400-180)=220 → 220 채택
    expect(getAnalysisSheetHeightBounds(400).expandedHeight).toBe(220)
  })
})

describe('resolveAnalysisSheetSnapFromDrag', () => {
  const collapsed = 72
  const expanded = 520

  it('접힘에서 위로 충분히 끌면 펼침으로 스냅한다', () => {
    expect(
      resolveAnalysisSheetSnapFromDrag('collapsed', -300, collapsed, expanded),
    ).toBe('expanded')
  })

  it('접힘에서 조금만 끌면 접힘을 유지한다', () => {
    expect(
      resolveAnalysisSheetSnapFromDrag('collapsed', -40, collapsed, expanded),
    ).toBe('collapsed')
  })

  it('펼침에서 아래로 충분히 끌면 접힘으로 스냅한다', () => {
    expect(
      resolveAnalysisSheetSnapFromDrag('expanded', 300, collapsed, expanded),
    ).toBe('collapsed')
  })

  it('접힘에서 travel의 30% 이상 위로 끌면 펼침으로 스냅한다', () => {
    // -150px 위로 = 150 > 134.4 → 펼침 (기존 midpoint(224) 기준이면 접힘으로 오판)
    expect(
      resolveAnalysisSheetSnapFromDrag('collapsed', -150, collapsed, expanded),
    ).toBe('expanded')
  })

  it('접힘에서 travel의 30% 미만이면 접힘을 유지한다', () => {
    expect(
      resolveAnalysisSheetSnapFromDrag('collapsed', -120, collapsed, expanded),
    ).toBe('collapsed')
  })

  it('펼침에서 travel의 30% 이상 아래로 끌면 접힘으로 스냅한다', () => {
    expect(
      resolveAnalysisSheetSnapFromDrag('expanded', 150, collapsed, expanded),
    ).toBe('collapsed')
  })

  it('펼침에서 travel의 30% 미만이면 펼침을 유지한다', () => {
    expect(
      resolveAnalysisSheetSnapFromDrag('expanded', 120, collapsed, expanded),
    ).toBe('expanded')
  })

  it('경계값이 비정상이면 시작 스냅을 유지한다', () => {
    expect(resolveAnalysisSheetSnapFromDrag('expanded', 100, 0, expanded)).toBe(
      'expanded',
    )
    expect(resolveAnalysisSheetSnapFromDrag('collapsed', 100, 100, 50)).toBe(
      'collapsed',
    )
  })
})

describe('didAnalysisSheetDrag', () => {
  it('임계값을 넘는 이동만 드래그로 본다', () => {
    expect(didAnalysisSheetDrag(2)).toBe(false)
    expect(didAnalysisSheetDrag(10)).toBe(true)
    expect(didAnalysisSheetDrag(-10)).toBe(true)
    expect(didAnalysisSheetDrag(Number.NaN)).toBe(false)
  })
})

describe('shouldSuppressAnalysisSheetClick', () => {
  it('드래그 후 마우스 click(detail>0)만 무시한다', () => {
    expect(shouldSuppressAnalysisSheetClick(true, 1)).toBe(true)
    expect(shouldSuppressAnalysisSheetClick(true, 0)).toBe(false) // 키보드
    expect(shouldSuppressAnalysisSheetClick(false, 1)).toBe(false)
  })
})
