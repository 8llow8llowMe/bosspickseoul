import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import {
  STATUS_SHEET_COLLAPSED_HEIGHT,
  STATUS_SHEET_EXPANDED_RATIO,
  STATUS_SHEET_MINIMUM_MAP_HEIGHT,
} from '@/lib/status/status-state'
import type { StatusRankedItem } from '@/types/status'
import StatusMobileSheet from './status-mobile-sheet'

const selectedItem: StatusRankedItem = {
  rank: 1,
  districtCode: '11650',
  districtName: '서초구',
  value: 123456,
  changeRate: 4.2,
}

const renderSheet = (
  snap: 'collapsed' | 'expanded',
  selectedItemOverride: StatusRankedItem | null = null,
) => {
  const styleSheet = new ServerStyleSheet()

  try {
    const markup = renderToStaticMarkup(
      styleSheet.collectStyles(
        createElement(StatusMobileSheet, {
          metric: 'footTraffic',
          items: [],
          selectedItem: selectedItemOverride,
          detail: null,
          isDetailLoading: false,
          detailErrorMessage: null,
          snap,
          onSnapChange: vi.fn(),
          onSelect: vi.fn(),
          onBackToTopTen: vi.fn(),
          onRetryDetail: vi.fn(),
        }),
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
    throw new Error('바텀시트 본문 영역을 찾을 수 없습니다.')
  }

  return bodyTag
}

const getBodyStyles = (markup: string, styles: string): string => {
  const classNames = getBodyTag(markup).match(/class="([^"]+)"/)?.[1]

  if (!classNames) {
    throw new Error('바텀시트 본문 스타일 클래스를 찾을 수 없습니다.')
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

describe('StatusMobileSheet', () => {
  it('접힌 상태에서는 본문을 비활성화하고 펼치기 핸들을 노출한다', () => {
    const { markup } = renderSheet('collapsed')
    const bodyTag = getBodyTag(markup)

    expect(markup).toContain('aria-label="구별 현황 바텀시트 펼치기"')
    expect(markup).toContain('aria-expanded="false"')
    expect(bodyTag).toContain('aria-hidden="true"')
    expect(bodyTag).toContain('inert=""')
  })

  it('펼친 상태에서는 본문을 활성화하고 접기 핸들을 노출한다', () => {
    const { markup } = renderSheet('expanded')
    const bodyTag = getBodyTag(markup)

    expect(markup).toContain('aria-label="구별 현황 바텀시트 접기"')
    expect(markup).toContain('aria-expanded="true"')
    expect(bodyTag).not.toContain('aria-hidden="true"')
    expect(bodyTag).not.toContain('inert=""')
  })

  it('본문 비노출 스타일은 접힌 상태에만 적용한다', () => {
    const collapsed = renderSheet('collapsed')
    const expanded = renderSheet('expanded')
    const collapsedBodyStyles = getBodyStyles(
      collapsed.markup,
      collapsed.styles,
    )
    const expandedBodyStyles = getBodyStyles(expanded.markup, expanded.styles)

    expect(collapsedBodyStyles).toContain('visibility:hidden')
    expect(collapsedBodyStyles).toContain('pointer-events:none')
    expect(collapsedBodyStyles).toContain('overflow:hidden')
    expect(expandedBodyStyles).not.toContain('visibility:hidden')
    expect(expandedBodyStyles).not.toContain('pointer-events:none')
    expect(expandedBodyStyles).not.toContain('overflow:hidden')
  })

  it('상세 콘텐츠를 축소하지 않고 본문 스크롤 높이에 포함한다', () => {
    const expanded = renderSheet('expanded', selectedItem)
    const expandedBodyStyles = getBodyStyles(expanded.markup, expanded.styles)

    expect(expandedBodyStyles).toContain('grid-auto-rows:max-content')
  })

  it('상세 헤더에 아이콘 뒤로가기 버튼을 표시한다', () => {
    const { markup } = renderSheet('expanded', selectedItem)

    expect(markup).toContain('aria-label="상위 10개로 돌아가기"')
    expect(markup).toMatch(
      /<button[^>]*aria-label="상위 10개로 돌아가기"[^>]*><svg/,
    )
    expect(markup).not.toContain('>상위 10개로 돌아가기</button>')
  })

  it('공유 높이 상수와 테두리를 제외한 핸들 높이를 스타일에 반영한다', () => {
    const { styles } = renderSheet('collapsed')

    // 값을 다시 적지 않고 공유 상수를 참조한다. 이 테스트의 목적이 "상수를 스타일에
    // 반영하는지" 확인하는 것이라, 숫자를 복제하면 상수를 바꿀 때마다 여기서 깨진다.
    expect(styles).toContain(
      `--status-sheet-collapsed-height:${STATUS_SHEET_COLLAPSED_HEIGHT}px`,
    )
    // styled-components 출력의 줄바꿈/공백에 영향받지 않도록 공백을 제거해 비교한다.
    expect(styles.replace(/\s/g, '')).toContain(
      `min(${STATUS_SHEET_EXPANDED_RATIO * 100}%,calc(100%-${STATUS_SHEET_MINIMUM_MAP_HEIGHT}px))`,
    )
    expect(styles).toContain('calc(var(--status-sheet-collapsed-height) - 1px)')
  })
})
