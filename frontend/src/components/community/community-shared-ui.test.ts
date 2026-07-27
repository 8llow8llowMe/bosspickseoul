import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import CommunityFeedback from './community-feedback'
import {
  COMMUNITY_LOCATION_RETRY_MIN_HEIGHT,
  createCommunityLocationSyncState,
  getCommunityLocationDisplayName,
  readCommunityLocationOptions,
  reduceCommunityLocationSyncState,
  resolveCommunityLocationValue,
  serializeCommunityLocationIdentity,
  type CommunityLocationSelections,
} from './community-location-picker'
import CommunityReportDialog, {
  getDialogFocusTargetIndex,
  validateCommunityReportReason,
  type CommunityReportDialogProps,
} from './community-report-dialog'

const render = <Props extends object>(
  component: ComponentType<Props>,
  props: Props,
) => renderToStaticMarkup(createElement(component, props))

const renderWithStyles = <Props extends object>(
  component: ComponentType<Props>,
  props: Props,
) => {
  const sheet = new ServerStyleSheet()

  try {
    const markup = renderToStaticMarkup(
      sheet.collectStyles(createElement(component, props)),
    )
    return { markup, styles: sheet.getStyleTags() }
  } finally {
    sheet.seal()
  }
}

describe('CommunityFeedback', () => {
  it('renders three semantic skeleton rows with an accessible loading message', () => {
    const markup = render(CommunityFeedback, {
      kind: 'loading',
      title: '커뮤니티 로딩',
      description: '게시글을 불러오는 중이에요',
    })

    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain('커뮤니티 로딩')
    expect(markup).toContain('게시글을 불러오는 중이에요')
    expect(markup.match(/data-community-skeleton-row="true"/g)).toHaveLength(3)
    expect(markup).toContain('<ul')
    expect(markup).toContain('<li')
  })

  it('renders an alert and retry action for an error', () => {
    const markup = render(CommunityFeedback, {
      kind: 'error',
      title: '게시글을 불러오지 못했어요',
      description: '잠시 후 다시 시도해 주세요.',
      actionLabel: '다시 시도',
      onAction: vi.fn(),
    })

    expect(markup).toContain('role="alert"')
    expect(markup).toContain('게시글을 불러오지 못했어요')
    expect(markup).toContain('잠시 후 다시 시도해 주세요.')
    expect(markup).toContain('>다시 시도</button>')
  })

  it('renders tailored empty copy and an optional action', () => {
    const markup = render(CommunityFeedback, {
      kind: 'empty',
      title: '아직 게시글이 없어요',
      description: '첫 번째 이야기를 남겨 보세요.',
      actionLabel: '글쓰기',
      onAction: vi.fn(),
    })

    expect(markup).toContain('role="status"')
    expect(markup).toContain('아직 게시글이 없어요')
    expect(markup).toContain('첫 번째 이야기를 남겨 보세요.')
    expect(markup).toContain('>글쓰기</button>')
  })
})

describe('resolveCommunityLocationValue', () => {
  const selections: CommunityLocationSelections = {
    district: { code: '11680', name: '강남구' },
    administration: { code: '1168064000', name: '역삼1동' },
    commercial: { code: '3110008', name: '강남역 상권' },
  }

  it('resolves Seoul to no target', () => {
    expect(resolveCommunityLocationValue('none', selections)).toEqual({})
  })

  it('resolves a district and drops its descendants', () => {
    expect(resolveCommunityLocationValue('district', selections)).toEqual({
      targetType: 'DISTRICT',
      targetCode: '11680',
      targetName: '강남구',
    })
  })

  it('resolves an administration and ignores the selected commercial', () => {
    expect(resolveCommunityLocationValue('administration', selections)).toEqual(
      {
        targetType: 'ADMINISTRATION',
        targetCode: '1168064000',
        targetName: '역삼1동',
      },
    )
  })

  it('resolves a commercial', () => {
    expect(resolveCommunityLocationValue('commercial', selections)).toEqual({
      targetType: 'COMMERCIAL',
      targetCode: '3110008',
      targetName: '강남역 상권',
    })
  })

  it('returns no target when the requested selection is missing', () => {
    expect(
      resolveCommunityLocationValue('commercial', {
        district: selections.district,
        administration: selections.administration,
      }),
    ).toEqual({})
  })
})

describe('community location controlled state', () => {
  const districtValue = {
    targetType: 'DISTRICT' as const,
    targetCode: '11680',
    targetName: '강남구',
  }
  const administrationValue = {
    targetType: 'ADMINISTRATION' as const,
    targetCode: '1168064000',
    targetName: '역삼1동',
  }
  const commercialValue = {
    targetType: 'COMMERCIAL' as const,
    targetCode: '3110008',
    targetName: '강남역 상권',
  }
  const districtSelections: CommunityLocationSelections = {
    district: { code: '11680', name: '강남구' },
  }
  const administrationSelections: CommunityLocationSelections = {
    ...districtSelections,
    administration: { code: '1168064000', name: '역삼1동' },
  }
  const commercialSelections: CommunityLocationSelections = {
    ...administrationSelections,
    commercial: { code: '3110008', name: '강남역 상권' },
  }

  it('stays editing through district, administration, and commercial echoes', () => {
    let state = createCommunityLocationSyncState({})

    expect(state.isChanging).toBe(true)

    const steps = [
      [districtValue, districtSelections],
      [administrationValue, administrationSelections],
      [commercialValue, commercialSelections],
    ] as const

    for (const [value, selections] of steps) {
      state = reduceCommunityLocationSyncState(state, {
        type: 'draft',
        selections,
      })
      const emittedValueKey = serializeCommunityLocationIdentity(value)
      state = reduceCommunityLocationSyncState(state, {
        type: 'external',
        valueKey: emittedValueKey,
        isEmpty: false,
        lastEmittedValueKey: emittedValueKey,
      })

      expect(state.isChanging).toBe(true)
      expect(state.selections).toEqual(selections)
    }
  })

  it('collapses for an external replacement and reopens with a cleared draft', () => {
    let state = createCommunityLocationSyncState(districtValue)

    expect(state.isChanging).toBe(false)

    state = reduceCommunityLocationSyncState(state, {
      type: 'external',
      valueKey: serializeCommunityLocationIdentity({
        targetType: 'COMMERCIAL',
        targetCode: '3999999',
        targetName: '외부 상권',
      }),
      isEmpty: false,
      lastEmittedValueKey: null,
    })

    expect(state).toMatchObject({
      isChanging: false,
      selections: {},
    })

    state = reduceCommunityLocationSyncState(state, {
      type: 'external',
      valueKey: serializeCommunityLocationIdentity({}),
      isEmpty: true,
      lastEmittedValueKey: null,
    })

    expect(state).toMatchObject({
      isChanging: true,
      selections: {},
    })
  })

  it('does not mistake a different external value for an echo', () => {
    const state = reduceCommunityLocationSyncState(
      createCommunityLocationSyncState({}),
      {
        type: 'external',
        valueKey: serializeCommunityLocationIdentity({
          targetType: 'COMMERCIAL',
          targetCode: '3999999',
          targetName: '외부 상권',
        }),
        isEmpty: false,
        lastEmittedValueKey: serializeCommunityLocationIdentity(districtValue),
      },
    )

    expect(state.isChanging).toBe(false)
    expect(state.selections).toEqual({})
  })

  it('preserves the draft when a parent echo omits the emitted target name', () => {
    let state = createCommunityLocationSyncState({})
    state = reduceCommunityLocationSyncState(state, {
      type: 'draft',
      selections: districtSelections,
    })
    const emittedIdentityKey = serializeCommunityLocationIdentity(districtValue)

    state = reduceCommunityLocationSyncState(state, {
      type: 'external',
      valueKey: serializeCommunityLocationIdentity({
        targetType: 'DISTRICT',
        targetCode: '11680',
      }),
      isEmpty: false,
      lastEmittedValueKey: emittedIdentityKey,
    })

    expect(state.isChanging).toBe(true)
    expect(state.selections).toEqual(districtSelections)
  })

  it('updates display copy without resetting a same-identity draft', () => {
    let state = createCommunityLocationSyncState(districtValue)
    state = reduceCommunityLocationSyncState(state, {
      type: 'start-change',
    })
    const renamedValue = {
      ...districtValue,
      targetName: '새 강남구 표시명',
    }

    const nextState = reduceCommunityLocationSyncState(state, {
      type: 'external',
      valueKey: serializeCommunityLocationIdentity(renamedValue),
      isEmpty: false,
      lastEmittedValueKey: null,
    })

    expect(nextState).toBe(state)
    expect(getCommunityLocationDisplayName(renamedValue)).toBe(
      '새 강남구 표시명',
    )
  })
})

describe('readCommunityLocationOptions', () => {
  it('reads only a successful list response', () => {
    const areas = [{ administrationCode: '1168064000' }]

    expect(
      readCommunityLocationOptions({
        dataHeader: {
          success: true,
          resultCode: null,
          resultMessage: null,
        },
        dataBody: areas,
      }),
    ).toEqual(areas)
  })

  it('rejects failed and malformed envelopes without throwing', () => {
    expect(
      readCommunityLocationOptions({
        dataHeader: {
          success: false,
          resultCode: 'FAILED',
          resultMessage: null,
        },
        dataBody: [],
      }),
    ).toBeNull()
    expect(readCommunityLocationOptions({})).toBeNull()
  })
})

describe('CommunityReportDialog', () => {
  const baseProps = {
    open: true,
    targetKind: 'POST' as const,
    targetId: 7,
    pending: false,
    errorMessage: null,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  }

  it('requires a nullable errorMessage prop', () => {
    expectTypeOf<CommunityReportDialogProps>().toEqualTypeOf<{
      open: boolean
      targetKind: 'POST' | 'COMMENT'
      targetId: number
      pending: boolean
      errorMessage: string | null
      onClose: () => void
      onSubmit: (reason: string) => void
    }>()
  })

  it('renders nothing while closed', () => {
    expect(render(CommunityReportDialog, { ...baseProps, open: false })).toBe(
      '',
    )
  })

  it('renders an accessible, focusable post report dialog', () => {
    const markup = render(CommunityReportDialog, baseProps)

    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-modal="true"')
    expect(markup).toContain('tabindex="-1"')
    expect(markup).toContain('게시글 신고')
    expect(markup).toContain('신고 사유')
    expect(markup).toContain('maxLength="500"')
    expect(markup).toContain('0 / 500')
  })

  it('uses the comment title and disables all controls while pending', () => {
    const markup = render(CommunityReportDialog, {
      ...baseProps,
      targetKind: 'COMMENT',
      pending: true,
    })

    expect(markup).toContain('댓글 신고')
    expect(markup).toContain('disabled=""')
    expect(markup).toContain('신고 중')
  })
})

describe('getDialogFocusTargetIndex', () => {
  it('wraps forward and backward at the dialog boundaries', () => {
    expect(getDialogFocusTargetIndex(3, 2, 'forward')).toBe(0)
    expect(getDialogFocusTargetIndex(3, 0, 'backward')).toBe(2)
  })

  it('moves to the adjacent target within the dialog', () => {
    expect(getDialogFocusTargetIndex(3, 0, 'forward')).toBe(1)
    expect(getDialogFocusTargetIndex(3, 2, 'backward')).toBe(1)
  })

  it('handles empty, single, and currently untracked focus', () => {
    expect(getDialogFocusTargetIndex(0, -1, 'forward')).toBeNull()
    expect(getDialogFocusTargetIndex(1, 0, 'forward')).toBe(0)
    expect(getDialogFocusTargetIndex(1, 0, 'backward')).toBe(0)
    expect(getDialogFocusTargetIndex(3, -1, 'forward')).toBe(0)
    expect(getDialogFocusTargetIndex(3, -1, 'backward')).toBe(2)
  })
})

describe('validateCommunityReportReason', () => {
  it('rejects a blank reason', () => {
    expect(validateCommunityReportReason(' \n ')).toBe(
      '신고 사유를 입력해 주세요.',
    )
  })

  it('rejects a reason over 500 characters', () => {
    expect(validateCommunityReportReason('가'.repeat(501))).toBe(
      '신고 사유는 500자 이하로 입력해 주세요.',
    )
  })

  it('accepts valid content after trimming', () => {
    expect(validateCommunityReportReason('  부적절한 내용입니다.  ')).toBeNull()
  })
})

describe('community shared UI style contracts', () => {
  it('keeps location retry controls at least 48px tall', () => {
    expect(COMMUNITY_LOCATION_RETRY_MIN_HEIGHT).toBe('48px')
  })

  it('server-renders theme surface and overlay tokens without literal colors', () => {
    const feedback = renderWithStyles(CommunityFeedback, {
      kind: 'error',
      onAction: vi.fn(),
    })
    const dialog = renderWithStyles(CommunityReportDialog, {
      open: true,
      targetKind: 'POST',
      targetId: 7,
      pending: false,
      errorMessage: null,
      onClose: vi.fn(),
      onSubmit: vi.fn(),
    })
    const styles = `${feedback.styles}${dialog.styles}`

    expect(styles).toContain('var(--color-surface)')
    expect(styles).toContain('background:var(--color-overlay)')
    expect(styles).not.toMatch(/(?:color|background):white/)
    expect(styles).not.toContain('rgba(')
  })
})
