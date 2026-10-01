import { readFileSync } from 'node:fs'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import CommunityFeedback from './community-feedback'
import {
  getCommunityLocationDisplayName,
  readCommunityLocationOptions,
} from '@/lib/community/community-location'
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

describe('getCommunityLocationDisplayName', () => {
  it('prefers the name, then the code, then 서울 전체', () => {
    expect(
      getCommunityLocationDisplayName({
        targetType: 'DISTRICT',
        targetCode: '11680',
        targetName: '강남구',
      }),
    ).toBe('강남구')
    expect(
      getCommunityLocationDisplayName({
        targetType: 'DISTRICT',
        targetCode: '11680',
      }),
    ).toBe('11680')
    expect(getCommunityLocationDisplayName({})).toBe('서울 전체')
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
    targetId: '7',
    pending: false,
    errorMessage: null,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  }

  it('requires a nullable errorMessage prop', () => {
    expectTypeOf<CommunityReportDialogProps>().toEqualTypeOf<{
      open: boolean
      targetKind: 'POST' | 'COMMENT'
      targetId: string
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
    // 사유 라디오·상세 입력을 fieldset 하나로 묶어 함께 잠근다.
    expect(markup).toMatch(/<fieldset[^>]*disabled=""/)
  })

  it('groups five reason radios under a 신고 사유 legend (community.md §S4 신고 다이얼로그)', () => {
    const markup = render(CommunityReportDialog, baseProps)

    expect(markup).toMatch(/<fieldset[^>]*>\s*<legend[^>]*>신고 사유<\/legend>/)
    const legendId = /<legend[^>]*id="([^"]+)"/.exec(markup)?.[1]
    expect(legendId).toBeTruthy()
    expect(markup).toMatch(
      new RegExp(
        `<fieldset(?=[^>]*role="radiogroup")(?=[^>]*aria-labelledby="${legendId}")`,
      ),
    )
    const radios = Array.from(markup.matchAll(/<input[^>]*type="radio"[^>]*>/g))
    expect(radios).toHaveLength(5)
    const names = new Set(
      radios.map(([tag]) => /name="([^"]+)"/.exec(tag)?.[1] ?? ''),
    )
    expect(names.size).toBe(1)
    expect(Array.from(names)[0]).not.toBe('')
    expect(radios.some(([tag]) => tag.includes('checked'))).toBe(false)
    for (const label of [
      '스팸·홍보',
      '욕설·비방',
      '개인정보 노출',
      '거짓 정보',
      '기타',
    ]) {
      expect(markup).toContain(`value="${label}"`)
      expect(markup).toContain(`>${label}</span>`)
    }
  })

  it('labels the detail field as optional until 기타 is chosen', () => {
    const markup = render(CommunityReportDialog, baseProps)

    expect(markup).toMatch(/<label[^>]*>자세한 내용\(선택\)<\/label>/)
    expect(markup).not.toMatch(/<textarea[^>]*aria-required/)
  })
})

describe('CommunityReportDialog source contracts', () => {
  const source = readFileSync(
    new URL('./community-report-dialog.tsx', import.meta.url),
    'utf8',
  )

  it('레거시 640·760·768 분기 대신 479/480 을 쓴다', () => {
    expect(source).not.toMatch(/(max|min)-width:\s*(640|760|768)px/)
    expect(source).toContain('@media (max-width: 479px)')
  })

  /* 입력칸(styled.textarea)만 테두리형 포커스로 전역 링을 끈다(DESIGN.md §4 「Focus is one line」). */
  it('입력칸이 아닌 포커스 블록은 전역 링을 끄지 않고 글로우도 쓰지 않는다', () => {
    const withoutFields = source.replace(
      /styled\.textarea(?:<[^>`]*>)?`[^`]*`/g,
      '',
    )
    expect(withoutFields).not.toBe(source)
    const focusBlocks = Array.from(
      withoutFields.matchAll(/:focus-visible[^{]*\{([^}]*)\}/g),
    ).map(match => match[1] ?? '')

    expect(
      focusBlocks.filter(body => /outline\s*:\s*(none|0)\b/.test(body)),
    ).toEqual([])
    expect(withoutFields).not.toContain('--shadow-focus-primary')
  })

  it('파란 글자에 primary-700 대신 text-primary-on-light 를 쓴다', () => {
    expect(source).not.toMatch(/(?<![-\w])color:\s*var\(--color-primary-700\)/)
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
  it('server-renders theme surface and overlay tokens without literal colors', () => {
    const feedback = renderWithStyles(CommunityFeedback, {
      kind: 'error',
      onAction: vi.fn(),
    })
    const dialog = renderWithStyles(CommunityReportDialog, {
      open: true,
      targetKind: 'POST',
      targetId: '7',
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

  it('피드백 카드는 커뮤니티 모바일 분기(479)를 쓰고 레거시 640·760·768 을 쓰지 않는다', () => {
    const { styles } = renderWithStyles(CommunityFeedback, { kind: 'empty' })

    expect(styles).toMatch(/@media \(max-width:\s*479px\)/)
    // 커뮤니티는 레거시 640·760·768 을 쓰지 않는다(community.md §S4).
    expect(styles).not.toMatch(/(max|min)-width:\s*(640|760|768)px/)
  })
})
