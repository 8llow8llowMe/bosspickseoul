import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import type { CandidateCommercial } from '@/types/recommend'
import {
  BOTTOM_SHEET_COLLAPSED_HEIGHT,
  BOTTOM_SHEET_EXPANDED_RATIO,
  BOTTOM_SHEET_MINIMUM_MAP_HEIGHT,
  didBottomSheetDrag,
  shouldSuppressBottomSheetClick,
} from '@/lib/map/bottom-sheet-state'
import RecommendMobileSheet, {
  canStartRecommendationSheetPointer,
  finishRecommendationSheetPointer,
  getRecommendationSheetReleaseVelocity,
  isRecommendationSheetInteractive,
  releaseRecommendationSheetPointerCapture,
  restoreRecommendationSheetHandleFocus,
  selectRecommendationSheetFocusEffect,
  tryCaptureRecommendationSheetPointer,
} from './recommend-mobile-sheet'
import RecommendResultList from './recommend-result-list'

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
  headline: { title: string; summary: string } = {
    title: '추천 결과',
    summary: '추천 상권 5곳',
  },
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
            title: headline.title,
            summary: headline.summary,
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

// 규격·스냅 판정은 `lib/map/bottom-sheet-state` 로 옮겼다(ux-followups C).
// 그 순수 로직의 테스트도 그 모듈 옆에 있다 — 여기서는 시트가 그것을 어떻게
// 쓰는지(합성·렌더)만 본다.

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
  // C-3 — 조건 선택 UX 에서 더한 picker 뷰가 통일 작업에서 빠지지 않게 한다.
  // 세 뷰 모두 시트를 잡고 끌 수 있어야 한다.
  it('criteria·picker·results 모두 click과 drag 상호작용을 허용한다', () => {
    expect(isRecommendationSheetInteractive('criteria')).toBe(true)
    expect(isRecommendationSheetInteractive('picker')).toBe(true)
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
    expect(didBottomSheetDrag(4)).toBe(false)
    expect(didBottomSheetDrag(-4.1)).toBe(true)
  })

  it('pointer drag 뒤 생성된 click만 막고 키보드 click은 허용한다', () => {
    expect(shouldSuppressBottomSheetClick(true, 1)).toBe(true)
    expect(shouldSuppressBottomSheetClick(true, 0)).toBe(false)
    expect(shouldSuppressBottomSheetClick(false, 1)).toBe(false)
  })

  it('pointermove가 누락돼도 pointerup의 최종 이동으로 drag를 판정한다', () => {
    expect(
      finishRecommendationSheetPointer('collapsed', -10, 0, {
        collapsedHeight: BOTTOM_SHEET_COLLAPSED_HEIGHT,
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
    const { markup } = renderSheet(
      'collapsed',
      { title: '상권 추천 조건', summary: '자치구부터 선택해 주세요' },
      'criteria',
    )
    const handleTag = markup.match(/<button(?=[^>]*aria-controls)[^>]*>/)?.[0]

    expect(markup).toContain('data-sheet-snap="collapsed"')
    expect(handleTag).toContain('aria-expanded="false"')
    expect(handleTag).not.toContain('aria-disabled')
    expect(handleTag).not.toContain('disabled=""')
    expect(handleTag).toContain('aria-label="상권 추천 바텀시트 펼치기"')
  })

  it('collapsed 상태에서 첫 줄만 보여주고 본문을 비활성화한다', () => {
    const { markup } = renderSheet('collapsed')
    const controlsId = markup.match(/aria-controls="([^"]+)"/)?.[1]

    expect(markup).toContain('data-sheet-snap="collapsed"')
    expect(markup).toContain('aria-expanded="false"')
    // C-1 — 접었을 때 아무 내용도 안 보이면 시트가 「닫힌 것」처럼 읽힌다.
    expect(markup).toContain('추천 결과')
    expect(markup).toContain('추천 상권 5곳')
    // 첫 줄만이다. 본문(순위·점수 카드)은 여전히 비활성이다.
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

  it('첫 줄은 받은 문구를 그대로 쓴다 — 시트가 문구를 만들지 않는다', () => {
    const { markup } = renderSheet('collapsed', {
      title: '업종 선택',
      summary: '강남구 · 역삼1동',
    })

    expect(markup).toContain('업종 선택')
    expect(markup).toContain('강남구 · 역삼1동')
    expect(markup).not.toContain('추천 상권 5곳')
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

    // 분석 시트와 같은 값을 쓴다 — 공유 모듈이 정본이다(ux-followups C).
    expect(BOTTOM_SHEET_COLLAPSED_HEIGHT).toBe(72)
    expect(BOTTOM_SHEET_MINIMUM_MAP_HEIGHT).toBe(180)
    expect(BOTTOM_SHEET_EXPANDED_RATIO).toBe(0.72)
    expect(expanded.styles).toContain('--recommend-sheet-collapsed-height:72px')
    expect(expanded.styles).toMatch(/min\(\s*72%,\s*calc\(100% - 180px\)\s*\)/)
    expect(peekHandleStyles).toContain('env(safe-area-inset-bottom)')
    expect(expandedHandleStyles).not.toContain('env(safe-area-inset-bottom)')
    expect(bodyStyles).toContain('env(safe-area-inset-bottom)')
    expect(expanded.styles).toContain('overscroll-behavior:contain')
    expect(expanded.styles).toMatch(/prefers-reduced-motion:\s*reduce/)
  })
})

describe('RecommendMobileSheet result content', () => {
  const renderSheetWithResults = (item: CandidateCommercial) => {
    const styleSheet = new ServerStyleSheet()

    try {
      const markup = renderToStaticMarkup(
        styleSheet.collectStyles(
          createElement(
            RecommendMobileSheet,
            {
              snap: 'expanded' as const,
              view: 'results' as const,
              title: '추천 결과',
              summary: `${item.rank}위 ${item.commercialName}`,
              onSnapChange: vi.fn(),
            },
            createElement(RecommendResultList, {
              results: [item],
              selectedCommercialCode: item.commercialCode,
              selectedServiceCode: 'CS100001',
              isLoading: false,
              feedback: null,
              onSelect: vi.fn(),
              onRetry: vi.fn(),
            }),
          ),
        ),
      )

      return { markup, styles: styleSheet.getStyleTags() }
    } finally {
      styleSheet.seal()
    }
  }

  it('shows blue ocean categories inside the sheet body and lets long names wrap', () => {
    const { markup, styles } = renderSheetWithResults({
      ...selectedResult,
      blueOceanCategories: [
        {
          serviceCode: 'CS100005',
          serviceName: '컴퓨터및주변장치판매',
          commercialStoreCount: 0,
          administrationStoreCount: 29,
          storeRate: 3.33,
        },
      ],
    })

    expect(markup).toContain('data-blue-ocean="true"')
    expect(markup).toContain('컴퓨터및주변장치판매')
    expect(markup).toContain('상권 0곳 / 행정동 29곳 (3.33%)')
    // 긴 한국어 업종명이 카드 밖으로 넘치지 않아야 한다.
    expect(styles).toContain('overflow-wrap:anywhere')
    expect(styles).toContain('flex-wrap:wrap')
  })

  it('omits the blue ocean section when the backend sends no categories', () => {
    const { markup } = renderSheetWithResults({
      ...selectedResult,
      blueOceanCategories: [],
    })

    expect(markup).not.toContain('data-blue-ocean="true"')
  })
})
