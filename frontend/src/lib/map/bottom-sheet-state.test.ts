import { describe, expect, it } from 'vitest'

import {
  BOTTOM_SHEET_COLLAPSED_HEIGHT,
  BOTTOM_SHEET_FLING_VELOCITY,
  didBottomSheetDrag,
  getBottomSheetHeightBounds,
  resolveBottomSheetSnapFromDrag,
  resolveBottomSheetViewportHeight,
  shouldSuppressBottomSheetClick,
} from '@/lib/map/bottom-sheet-state'

describe('resolveBottomSheetViewportHeight', () => {
  it('첫 번째 유한·양수 후보를 쓴다', () => {
    expect(resolveBottomSheetViewportHeight(747, 0, 812)).toBe(747)
  })

  it('0(=display:contents 래퍼의 clientHeight)은 건너뛰고 다음 후보로 폴백한다', () => {
    // 회귀 방지: parentElement.clientHeight가 0이어도 offsetParent/innerHeight로 폴백해야
    // 드래그 스냅 경계가 collapsed===expanded로 붕괴하지 않는다.
    expect(resolveBottomSheetViewportHeight(0, 812)).toBe(812)
    expect(resolveBottomSheetViewportHeight(0, 0, 900)).toBe(900)
  })

  it('null/undefined/NaN 후보는 무시한다', () => {
    expect(
      resolveBottomSheetViewportHeight(null, undefined, Number.NaN, 640),
    ).toBe(640)
  })

  it('유효한 후보가 없으면 0을 반환한다', () => {
    expect(resolveBottomSheetViewportHeight(0, null, undefined)).toBe(0)
  })
})

describe('getBottomSheetHeightBounds', () => {
  it('비정상 뷰포트는 접힘 높이로 고정한다', () => {
    expect(getBottomSheetHeightBounds(0)).toEqual({
      collapsedHeight: BOTTOM_SHEET_COLLAPSED_HEIGHT,
      expandedHeight: BOTTOM_SHEET_COLLAPSED_HEIGHT,
    })
    expect(getBottomSheetHeightBounds(Number.NaN).expandedHeight).toBe(
      BOTTOM_SHEET_COLLAPSED_HEIGHT,
    )
  })

  it('지도 최소 높이를 남기도록 펼침 높이를 제한한다', () => {
    // 720px 뷰포트: ratio(0.72)=518.4 vs (720-180)=540 → 더 작은 값 채택
    const bounds = getBottomSheetHeightBounds(720)
    expect(bounds.collapsedHeight).toBe(BOTTOM_SHEET_COLLAPSED_HEIGHT)
    expect(bounds.expandedHeight).toBeCloseTo(518.4)
  })

  it('작은 뷰포트에서는 지도 여백 규칙이 우선한다', () => {
    // 400px: ratio=288 vs (400-180)=220 → 220 채택
    expect(getBottomSheetHeightBounds(400).expandedHeight).toBe(220)
  })
})

describe('resolveBottomSheetSnapFromDrag', () => {
  const collapsed = 72
  const expanded = 520

  it('접힘에서 위로 충분히 끌면 펼침으로 스냅한다', () => {
    expect(
      resolveBottomSheetSnapFromDrag('collapsed', -300, collapsed, expanded),
    ).toBe('expanded')
  })

  it('접힘에서 조금만 끌면 접힘을 유지한다', () => {
    expect(
      resolveBottomSheetSnapFromDrag('collapsed', -40, collapsed, expanded),
    ).toBe('collapsed')
  })

  it('펼침에서 아래로 충분히 끌면 접힘으로 스냅한다', () => {
    expect(
      resolveBottomSheetSnapFromDrag('expanded', 300, collapsed, expanded),
    ).toBe('collapsed')
  })

  it('접힘에서 travel의 30% 이상 위로 끌면 펼침으로 스냅한다', () => {
    // -150px 위로 = 150 > 134.4 → 펼침 (기존 midpoint(224) 기준이면 접힘으로 오판)
    expect(
      resolveBottomSheetSnapFromDrag('collapsed', -150, collapsed, expanded),
    ).toBe('expanded')
  })

  it('접힘에서 travel의 30% 미만이면 접힘을 유지한다', () => {
    expect(
      resolveBottomSheetSnapFromDrag('collapsed', -120, collapsed, expanded),
    ).toBe('collapsed')
  })

  it('펼침에서 travel의 30% 이상 아래로 끌면 접힘으로 스냅한다', () => {
    expect(
      resolveBottomSheetSnapFromDrag('expanded', 150, collapsed, expanded),
    ).toBe('collapsed')
  })

  it('펼침에서 travel의 30% 미만이면 펼침을 유지한다', () => {
    expect(
      resolveBottomSheetSnapFromDrag('expanded', 120, collapsed, expanded),
    ).toBe('expanded')
  })

  it('경계값이 비정상이면 시작 스냅을 유지한다', () => {
    expect(resolveBottomSheetSnapFromDrag('expanded', 100, 0, expanded)).toBe(
      'expanded',
    )
    expect(resolveBottomSheetSnapFromDrag('collapsed', 100, 100, 50)).toBe(
      'collapsed',
    )
  })
})

describe('공유 규격', () => {
  // C-1 — 접힘 높이가 화면마다 다르던 것(분석 72 / 추천 44)을 한 값으로 못박는다.
  // 손잡이만 보이는 높이로 되돌아가면 시트가 「닫힌 것」처럼 읽힌다.
  it('접힘 높이는 내용 첫 줄이 보이는 72px 이다', () => {
    expect(BOTTOM_SHEET_COLLAPSED_HEIGHT).toBe(72)
  })
})

describe('resolveBottomSheetSnapFromDrag — 플링', () => {
  const collapsed = 72
  const expanded = 520

  it('속도를 넘기면 짧게 끌어도 방향대로 스냅한다', () => {
    // -20px 은 거리 규칙(134.4px)에 한참 못 미치지만 위로 튕긴 속도가 임계값을 넘는다.
    expect(
      resolveBottomSheetSnapFromDrag(
        'collapsed',
        -20,
        collapsed,
        expanded,
        -BOTTOM_SHEET_FLING_VELOCITY,
      ),
    ).toBe('expanded')
    expect(
      resolveBottomSheetSnapFromDrag(
        'expanded',
        20,
        collapsed,
        expanded,
        BOTTOM_SHEET_FLING_VELOCITY,
      ),
    ).toBe('collapsed')
  })

  it('속도가 임계값 미만이면 거리 규칙으로 판정한다', () => {
    expect(
      resolveBottomSheetSnapFromDrag(
        'collapsed',
        -20,
        collapsed,
        expanded,
        0.1,
      ),
    ).toBe('collapsed')
    expect(
      resolveBottomSheetSnapFromDrag(
        'collapsed',
        -300,
        collapsed,
        expanded,
        0.1,
      ),
    ).toBe('expanded')
  })

  // 분석 시트는 속도를 넘기지 않는다 — 넘기지 않은 호출이 예전과 똑같이 동작해야 한다.
  it('속도를 넘기지 않으면 거리 규칙만 쓴다', () => {
    expect(
      resolveBottomSheetSnapFromDrag('collapsed', -20, collapsed, expanded),
    ).toBe('collapsed')
    expect(
      resolveBottomSheetSnapFromDrag(
        'collapsed',
        -20,
        collapsed,
        expanded,
        Number.NaN,
      ),
    ).toBe('collapsed')
  })

  it('경계값이 비정상이면 속도가 커도 시작 스냅을 유지한다', () => {
    expect(resolveBottomSheetSnapFromDrag('collapsed', -20, 100, 50, -2)).toBe(
      'collapsed',
    )
  })
})

describe('didBottomSheetDrag', () => {
  it('임계값을 넘는 이동만 드래그로 본다', () => {
    expect(didBottomSheetDrag(2)).toBe(false)
    expect(didBottomSheetDrag(10)).toBe(true)
    expect(didBottomSheetDrag(-10)).toBe(true)
    expect(didBottomSheetDrag(Number.NaN)).toBe(false)
  })
})

describe('shouldSuppressBottomSheetClick', () => {
  it('드래그 후 마우스 click(detail>0)만 무시한다', () => {
    expect(shouldSuppressBottomSheetClick(true, 1)).toBe(true)
    expect(shouldSuppressBottomSheetClick(true, 0)).toBe(false) // 키보드
    expect(shouldSuppressBottomSheetClick(false, 1)).toBe(false)
  })
})
