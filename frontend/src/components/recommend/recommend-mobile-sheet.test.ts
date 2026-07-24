import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import type { CandidateCommercial } from '@/types/recommend'
import RecommendMobileSheet, {
  canStartRecommendationSheetPointer,
  didRecommendationSheetDrag,
  finishRecommendationSheetPointer,
  getRecommendationSheetBounds,
  getRecommendationSheetReleaseVelocity,
  isRecommendationSheetInteractive,
  RECOMMENDATION_SHEET_EXPANDED_RATIO,
  RECOMMENDATION_SHEET_MINIMUM_MAP_HEIGHT,
  RECOMMENDATION_SHEET_COLLAPSED_HEIGHT,
  releaseRecommendationSheetPointerCapture,
  resolveRecommendationSheetSnap,
  restoreRecommendationSheetHandleFocus,
  selectRecommendationSheetFocusEffect,
  shouldSuppressRecommendationSheetClick,
  tryCaptureRecommendationSheetPointer,
} from './recommend-mobile-sheet'

const selectedResult: CandidateCommercial = {
  rank: 1,
  commercialCode: 'TRDAR-001',
  commercialName: '망원시장',
  compositeScore: 86.6,
  grade: 'A',
  summaryLabel: '생활밀착형 상권',
  selectionReason: '유동인구와 매출이 안정적입니다.',
  opportunityLabel: '성장 여력',
  riskLabel: null,
  metricBreakdown: [],
  reasonTags: [],
}

const renderSheet = (
  snap: 'collapsed' | 'expanded',
  result: CandidateCommercial | null = selectedResult,
  view: 'criteria' | 'results' = 'results',
) => {
  const styleSheet = new ServerStyleSheet()

  try {
    const markup = renderToStaticMarkup(
      styleSheet.collectStyles(
        createElement(
          RecommendMobileSheet,
          {
            snap,
            view,
            selectedResult: result,
            onSnapChange: vi.fn(),
          },
          createElement(
            'div',
            { 'data-sheet-body-content': 'true' },
            '추천 상세 본문',
          ),
        ),
      ),
    )

    return {
      markup,
      styles: styleSheet.getStyleTags(),
    }
  } finally {
    styleSheet.seal()
  }
}

const getBodyTag = (markup: string): string => {
  const bodyTag = markup.match(/<div(?=[^>]*role="region")[^>]*>/)?.[0]

  if (!bodyTag) {
    throw new Error('추천 바텀시트 본문 영역을 찾을 수 없습니다.')
  }

  return bodyTag
}

const getElementStyles = (elementTag: string, styles: string): string => {
  const classNames = elementTag.match(/class="([^"]+)"/)?.[1]

  if (!classNames) {
    throw new Error('추천 바텀시트 요소의 스타일 클래스를 찾을 수 없습니다.')
  }

  return classNames
    .split(' ')
    .map(className => {
      const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      return styles.match(
        new RegExp(`\\.${escapedClassName}\\{([^}]*)\\}`),
      )?.[1]
    })
    .filter((style): style is string => Boolean(style))
    .join(' ')
}

describe('getRecommendationSheetBounds', () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])(
    '유효하지 않은 viewport 높이 %s에서는 collapsed 높이를 고정한다',
    viewportHeight => {
      expect(getRecommendationSheetBounds(viewportHeight)).toEqual({
        collapsedHeight: 44,
        expandedHeight: 44,
      })
    },
  )

  it('지도 최소 노출 높이를 보장하며 560px viewport에서는 380px로 펼친다', () => {
    expect(getRecommendationSheetBounds(560)).toEqual({
      collapsedHeight: 44,
      expandedHeight: 380,
    })
  })

  it('viewport가 작아도 expanded 높이는 collapsed보다 작아지지 않는다', () => {
    expect(getRecommendationSheetBounds(200)).toEqual({
      collapsedHeight: 44,
      expandedHeight: 44,
    })
  })
})

describe('resolveRecommendationSheetSnap', () => {
  const bounds = {
    collapsedHeight: 44,
    expandedHeight: 380,
  }

  it('느린 drag가 중간점을 넘으면 가까운 snap으로 이동한다', () => {
    expect(resolveRecommendationSheetSnap('collapsed', -169, 0.1, bounds)).toBe(
      'expanded',
    )
    expect(resolveRecommendationSheetSnap('expanded', 169, 0.1, bounds)).toBe(
      'collapsed',
    )
  })

  it('빠른 flick은 이동 거리가 짧아도 방향 snap으로 이동한다', () => {
    expect(resolveRecommendationSheetSnap('collapsed', -10, -0.5, bounds)).toBe(
      'expanded',
    )
    expect(resolveRecommendationSheetSnap('expanded', 10, 0.5, bounds)).toBe(
      'collapsed',
    )
  })

  it('중간점을 넘지 않은 느린 drag는 시작 snap을 유지한다', () => {
    expect(
      resolveRecommendationSheetSnap('collapsed', -167, -0.1, bounds),
    ).toBe('collapsed')
    expect(resolveRecommendationSheetSnap('expanded', 167, 0.1, bounds)).toBe(
      'expanded',
    )
  })

  it('유효하지 않은 delta나 이동 거리는 시작 snap을 유지한다', () => {
    expect(
      resolveRecommendationSheetSnap('collapsed', Number.NaN, 0, bounds),
    ).toBe('collapsed')
    expect(
      resolveRecommendationSheetSnap('expanded', 200, 0, {
        collapsedHeight: 44,
        expandedHeight: 44,
      }),
    ).toBe('expanded')
  })
})

describe('getRecommendationSheetReleaseVelocity', () => {
  it('pointerup 위치가 마지막 move와 같으면 마지막 이동 속도를 유지한다', () => {
    expect(
      getRecommendationSheetReleaseVelocity(
        { y: 300, time: 100 },
        300,
        120,
        -0.6,
      ),
    ).toBe(-0.6)
  })

  it('pointerup에서도 이동했으면 마지막 구간 속도를 사용한다', () => {
    expect(
      getRecommendationSheetReleaseVelocity(
        { y: 300, time: 100 },
        320,
        120,
        0.2,
      ),
    ).toBe(1)
  })
})

describe('추천 바텀시트 pointer interaction guard', () => {
  it('criteria와 results 모두 click과 drag 상호작용을 허용한다', () => {
    expect(isRecommendationSheetInteractive('criteria')).toBe(true)
    expect(isRecommendationSheetInteractive('results')).toBe(true)
  })

  it('primary pointer와 마우스 왼쪽 버튼만 drag를 시작한다', () => {
    expect(
      canStartRecommendationSheetPointer({
        isPrimary: true,
        hasActivePointer: false,
        pointerType: 'touch',
        button: 0,
      }),
    ).toBe(true)
    expect(
      canStartRecommendationSheetPointer({
        isPrimary: false,
        hasActivePointer: false,
        pointerType: 'touch',
        button: 0,
      }),
    ).toBe(false)
    expect(
      canStartRecommendationSheetPointer({
        isPrimary: true,
        hasActivePointer: true,
        pointerType: 'touch',
        button: 0,
      }),
    ).toBe(false)
    expect(
      canStartRecommendationSheetPointer({
        isPrimary: true,
        hasActivePointer: false,
        pointerType: 'mouse',
        button: 2,
      }),
    ).toBe(false)
  })

  it('4px를 초과한 이동만 drag로 판정한다', () => {
    expect(didRecommendationSheetDrag(4)).toBe(false)
    expect(didRecommendationSheetDrag(-4.1)).toBe(true)
  })

  it('pointer drag 뒤 생성된 click만 막고 키보드 click은 허용한다', () => {
    expect(shouldSuppressRecommendationSheetClick(true, 1)).toBe(true)
    expect(shouldSuppressRecommendationSheetClick(true, 0)).toBe(false)
    expect(shouldSuppressRecommendationSheetClick(false, 1)).toBe(false)
  })

  it('pointermove가 누락돼도 pointerup의 최종 이동으로 drag를 판정한다', () => {
    expect(
      finishRecommendationSheetPointer('collapsed', -10, 0, {
        collapsedHeight: 44,
        expandedHeight: 380,
      }),
    ).toEqual({
      nextSnap: 'collapsed',
      suppressClick: true,
    })
  })

  it('pointer capture API가 일부만 지원되면 drag를 시작하지 않는다', () => {
    expect(
      tryCaptureRecommendationSheetPointer(
        {
          setPointerCapture: vi.fn(),
        },
        1,
      ),
    ).toBe(false)
  })

  it('pointer capture 설정이나 확인이 실패해도 throw하지 않고 폴백한다', () => {
    const setErrorTarget = {
      setPointerCapture: vi.fn(() => {
        throw new Error('set failed')
      }),
      hasPointerCapture: vi.fn(() => false),
      releasePointerCapture: vi.fn(),
    }
    const hasErrorTarget = {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => {
        throw new Error('has failed')
      }),
      releasePointerCapture: vi.fn(),
    }

    expect(tryCaptureRecommendationSheetPointer(setErrorTarget, 1)).toBe(false)
    expect(tryCaptureRecommendationSheetPointer(hasErrorTarget, 1)).toBe(false)
    expect(hasErrorTarget.releasePointerCapture).toHaveBeenCalledWith(1)
  })

  it('pointer capture 해제 API가 없거나 실패해도 throw하지 않는다', () => {
    expect(() => releaseRecommendationSheetPointerCapture({}, 1)).not.toThrow()
    const missingHasTarget = {
      releasePointerCapture: vi.fn(),
    }

    expect(() =>
      releaseRecommendationSheetPointerCapture(missingHasTarget, 1),
    ).not.toThrow()
    expect(missingHasTarget.releasePointerCapture).toHaveBeenCalledWith(1)
    expect(() =>
      releaseRecommendationSheetPointerCapture(
        {
          setPointerCapture: vi.fn(),
          hasPointerCapture: vi.fn(() => true),
          releasePointerCapture: vi.fn(() => {
            throw new Error('release failed')
          }),
        },
        1,
      ),
    ).not.toThrow()
  })

  it('지원되는 pointer capture를 설정하고 안전하게 해제한다', () => {
    const target = {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
    }

    expect(tryCaptureRecommendationSheetPointer(target, 7)).toBe(true)
    releaseRecommendationSheetPointerCapture(target, 7)

    expect(target.setPointerCapture).toHaveBeenCalledWith(7)
    expect(target.releasePointerCapture).toHaveBeenCalledWith(7)
  })
})

describe('restoreRecommendationSheetHandleFocus', () => {
  it('접히는 본문 내부에 focus가 있으면 handle로 복원한다', () => {
    const activeElement = {} as Node
    const handle = { focus: vi.fn() }
    const body = { contains: vi.fn(() => true) }

    expect(
      restoreRecommendationSheetHandleFocus(body, handle, activeElement),
    ).toBe(true)
    expect(body.contains).toHaveBeenCalledWith(activeElement)
    expect(handle.focus).toHaveBeenCalledOnce()
  })

  it('focus가 본문 외부에 있거나 대상이 없으면 이동하지 않는다', () => {
    const activeElement = {} as Node
    const handle = { focus: vi.fn() }

    expect(
      restoreRecommendationSheetHandleFocus(
        { contains: vi.fn(() => false) },
        handle,
        activeElement,
      ),
    ).toBe(false)
    expect(
      restoreRecommendationSheetHandleFocus(null, handle, activeElement),
    ).toBe(false)
    expect(handle.focus).not.toHaveBeenCalled()
  })

  it('client에서는 layout effect를, server에서는 passive effect를 선택한다', () => {
    const layoutEffect = vi.fn()
    const passiveEffect = vi.fn()

    expect(
      selectRecommendationSheetFocusEffect(true, layoutEffect, passiveEffect),
    ).toBe(layoutEffect)
    expect(
      selectRecommendationSheetFocusEffect(false, layoutEffect, passiveEffect),
    ).toBe(passiveEffect)
  })
})

describe('RecommendMobileSheet', () => {
  it('criteria에서도 collapsed를 유지하고 handle을 활성화한다', () => {
    const { markup } = renderSheet('collapsed', null, 'criteria')
    const handleTag = markup.match(/<button(?=[^>]*aria-controls)[^>]*>/)?.[0]

    expect(markup).toContain('data-sheet-snap="collapsed"')
    expect(handleTag).toContain('aria-expanded="false"')
    expect(handleTag).not.toContain('aria-disabled')
    expect(handleTag).not.toContain('disabled=""')
    expect(handleTag).toContain('aria-label="상권 추천 바텀시트 펼치기"')
  })

  it('collapsed 상태에서는 핸들만 남기고 본문을 비활성화한다', () => {
    const { markup } = renderSheet('collapsed')
    const controlsId = markup.match(/aria-controls="([^"]+)"/)?.[1]

    expect(markup).toContain('data-sheet-snap="collapsed"')
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).not.toContain('1위')
    expect(markup).not.toContain('망원시장')
    expect(markup).not.toContain('87점')
    expect(markup).toContain('aria-label="상권 추천 바텀시트 펼치기"')
    expect(controlsId).toBeTruthy()
    expect(markup).toContain(`id="${controlsId}"`)
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('inert=""')
  })

  it('expanded 상태에서 children을 활성화된 스크롤 본문에 렌더한다', () => {
    const { markup } = renderSheet('expanded')
    const bodyTag = getBodyTag(markup)

    expect(markup).toContain('data-sheet-snap="expanded"')
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('data-sheet-body-content="true"')
    expect(bodyTag).toContain('aria-hidden="false"')
    expect(bodyTag).not.toContain('inert=""')
  })

  it('선택 결과가 없어도 collapsed에서는 핸들만 표시한다', () => {
    const { markup } = renderSheet('collapsed', null)

    expect(markup).not.toContain('추천 결과를 확인해 보세요')
    expect(markup).toContain('aria-label="상권 추천 바텀시트 펼치기"')
  })

  it('높이·safe area·overscroll·reduced motion 규칙을 스타일에 반영한다', () => {
    const expanded = renderSheet('expanded')
    const collapsed = renderSheet('collapsed')
    const expandedHandleTag = expanded.markup.match(
      /<button(?=[^>]*aria-controls)[^>]*>/,
    )?.[0]
    const peekHandleTag = collapsed.markup.match(
      /<button(?=[^>]*aria-controls)[^>]*>/,
    )?.[0]

    if (!expandedHandleTag || !peekHandleTag) {
      throw new Error('추천 바텀시트 handle을 찾을 수 없습니다.')
    }

    const expandedHandleStyles = getElementStyles(
      expandedHandleTag,
      expanded.styles,
    )
    const peekHandleStyles = getElementStyles(peekHandleTag, collapsed.styles)
    const bodyStyles = getElementStyles(
      getBodyTag(expanded.markup),
      expanded.styles,
    )

    expect(RECOMMENDATION_SHEET_COLLAPSED_HEIGHT).toBe(44)
    expect(RECOMMENDATION_SHEET_MINIMUM_MAP_HEIGHT).toBe(180)
    expect(RECOMMENDATION_SHEET_EXPANDED_RATIO).toBe(0.72)
    expect(expanded.styles).toContain('--recommend-sheet-collapsed-height:44px')
    expect(expanded.styles).toMatch(/min\(\s*72%,\s*calc\(100% - 180px\)\s*\)/)
    expect(peekHandleStyles).toContain('env(safe-area-inset-bottom)')
    expect(expandedHandleStyles).not.toContain('env(safe-area-inset-bottom)')
    expect(bodyStyles).toContain('env(safe-area-inset-bottom)')
    expect(expanded.styles).toContain('overscroll-behavior:contain')
    expect(expanded.styles).toMatch(/prefers-reduced-motion:\s*reduce/)
  })
})
