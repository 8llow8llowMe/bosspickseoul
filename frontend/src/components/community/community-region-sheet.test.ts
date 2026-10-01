import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { districts } from '@/data/districts'
import CommunitySheet from './community-sheet'
import CommunityRegionSheet, {
  CommunityRegionSheetPanel,
} from './community-region-sheet'
import { communityLocationQueryKeys } from '@/lib/community/community-location'

const renderWithStyles = (element: ReactElement) => {
  const sheet = new ServerStyleSheet()

  try {
    const markup = renderToStaticMarkup(sheet.collectStyles(element))
    return { markup, styles: sheet.getStyleTags() }
  } finally {
    sheet.seal()
  }
}

const withQueryClient = (client: QueryClient, element: ReactElement) =>
  createElement(QueryClientProvider, { client }, element)

describe('CommunitySheet', () => {
  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    expect(
      renderToStaticMarkup(
        createElement(
          CommunitySheet,
          { open: false, onClose: vi.fn(), title: '지역 선택' },
          '내용',
        ),
      ),
    ).toBe('')
  })

  it('열리면 제목에 이름이 묶인 모달 다이얼로그와 닫기 버튼을 그린다', () => {
    const { markup } = renderWithStyles(
      createElement(
        CommunitySheet,
        { open: true, onClose: vi.fn(), title: '지역 선택' },
        createElement('p', null, '시트 내용'),
      ),
    )
    const labelledBy = markup.match(/aria-labelledby="([^"]+)"/)?.[1]

    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-modal="true"')
    expect(labelledBy).toBeTruthy()
    expect(markup).toContain(`id="${labelledBy}"`)
    expect(markup).toMatch(/<h2[^>]*>지역 선택<\/h2>/)
    expect(markup).toMatch(/<button[^>]*aria-label="닫기"[^>]*type="button"/)
    expect(markup).toContain('시트 내용')
  })

  it('<480 은 위쪽만 둥근 바텀시트(최대 85dvh, 안전 영역), ≥480 은 폭 420 다이얼로그다', () => {
    const { styles } = renderWithStyles(
      createElement(
        CommunitySheet,
        { open: true, onClose: vi.fn(), title: '지역 선택' },
        '내용',
      ),
    )

    expect(styles).toMatch(/@media \(max-width:\s*479px\)/)
    expect(styles).toContain('max-height:85dvh')
    expect(styles).toContain(
      'border-radius:var(--radius-sheet) var(--radius-sheet) 0 0',
    )
    expect(styles).toContain('env(safe-area-inset-bottom)')
    expect(styles).toContain('420px')
    expect(styles).toContain('overflow-y:auto')
    expect(styles).toContain('var(--shadow-level-4)')
    expect(styles).not.toMatch(/(max|min)-width:\s*(640|760|768)px/)
  })
})

describe('CommunityRegionSheet 칩', () => {
  const render = (
    props: Partial<Parameters<typeof CommunityRegionSheet>[0]> = {},
  ) =>
    renderToStaticMarkup(
      createElement(CommunityRegionSheet, {
        value: {},
        mockEnabled: true,
        onChange: vi.fn(),
        ...props,
      }),
    )

  it('값이 없으면 「서울 전체」 칩만 그리고 해제 버튼은 없다', () => {
    const markup = render()

    expect(markup).toMatch(
      /<button[^>]*aria-expanded="false"[^>]*aria-haspopup="dialog"[^>]*>[\s\S]*?서울 전체[\s\S]*?<\/button>/,
    )
    expect(markup).not.toContain('aria-label="지역 필터 해제"')
    // 닫힌 시트는 그리지 않는다
    expect(markup).not.toContain('role="dialog"')
  })

  it('대상이 있으면 그 이름을 적고 옆에 해제 버튼을 둔다', () => {
    const markup = render({
      value: {
        targetType: 'ADMINISTRATION',
        targetCode: '1120065000',
        targetName: '성수1가1동',
      },
    })

    expect(markup).toContain('성수1가1동')
    expect(markup).toMatch(
      /<button[^>]*aria-label="지역 필터 해제"[^>]*type="button"/,
    )
  })

  it('비활성(검색 중·좋아요한 글)이면 칩을 끄고 해제 버튼을 숨긴다 — 칩이 「서울 전체」로 범위를 알린다', () => {
    const markup = render({ disabled: true })

    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?서울 전체/)
    expect(markup).not.toContain('aria-label="지역 필터 해제"')
  })
})

describe('CommunityRegionSheetPanel', () => {
  it('최상위에서 「서울 전체」 확정 행과 들어가는 자치구 25개 행을 그린다', () => {
    const client = new QueryClient()
    const { markup } = renderWithStyles(
      withQueryClient(
        client,
        createElement(CommunityRegionSheetPanel, {
          value: {},
          mockEnabled: true,
          onCommit: vi.fn(),
        }),
      ),
    )

    expect(districts).toHaveLength(25)
    expect(markup.match(/data-region-descend="true"/g)).toHaveLength(25)
    expect(markup).toMatch(
      /data-region-commit="true"[^>]*data-region-selected="true"[^>]*>[\s\S]*?서울 전체/,
    )
    expect(markup).toContain('aria-label="지역 경로"')
    expect(markup).toContain('aria-label="지역 이름으로 찾기"')
    expect(markup).toContain('강남구')

    client.clear()
  })

  it('자치구 값으로 열면 그 구 단계에서 시작해 공유 캐시의 행정동을 그린다', () => {
    const client = new QueryClient()
    client.setQueryData(
      communityLocationQueryKeys.administrations(true, '11680'),
      {
        dataHeader: { success: true, resultCode: null, resultMessage: null },
        dataBody: [
          {
            administrationCode: '1168064000',
            administrationName: '역삼1동',
            centerLat: 0,
            centerLng: 0,
          },
        ],
      },
    )

    const { markup } = renderWithStyles(
      withQueryClient(
        client,
        createElement(CommunityRegionSheetPanel, {
          value: {
            targetType: 'DISTRICT',
            targetCode: '11680',
            targetName: '강남구',
          },
          mockEnabled: true,
          onCommit: vi.fn(),
        }),
      ),
    )

    expect(markup).toMatch(
      /data-region-commit="true"[^>]*data-region-selected="true"[^>]*>[\s\S]*?강남구 전체/,
    )
    expect(markup).toContain('역삼1동')
    expect(markup.match(/data-region-descend="true"/g)).toHaveLength(1)
    // 브레드크럼: 서울 전체(버튼) › 강남구(현재)
    expect(markup).toMatch(/<button[^>]*type="button"[^>]*>서울 전체<\/button>/)
    expect(markup).toMatch(/aria-current="location"[^>]*>강남구</)

    client.clear()
  })

  it('행정동을 아직 받지 못했으면 불러오는 중 상태를 보인다', () => {
    const client = new QueryClient()
    const { markup } = renderWithStyles(
      withQueryClient(
        client,
        createElement(CommunityRegionSheetPanel, {
          value: { targetType: 'DISTRICT', targetCode: '11680' },
          mockEnabled: true,
          onCommit: vi.fn(),
        }),
      ),
    )

    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain('행정동을 불러오는 중이에요')
    // 「그 구 전체」 확정은 목록과 상관없이 늘 고를 수 있다
    expect(markup).toContain('강남구 전체')

    client.clear()
  })

  it('실패 응답이면 다시 시도 버튼을 보인다', () => {
    const client = new QueryClient()
    client.setQueryData(
      communityLocationQueryKeys.administrations(false, '11680'),
      {
        dataHeader: {
          success: false,
          resultCode: 'REGION_500',
          resultMessage: '행정동 조회 실패',
        },
        dataBody: null,
      },
    )

    const { markup } = renderWithStyles(
      withQueryClient(
        client,
        createElement(CommunityRegionSheetPanel, {
          value: { targetType: 'DISTRICT', targetCode: '11680' },
          mockEnabled: false,
          onCommit: vi.fn(),
        }),
      ),
    )

    expect(markup).toContain('행정동을 불러오지 못했어요.')
    expect(markup).toMatch(/<button[^>]*type="button"[^>]*>다시 시도<\/button>/)
    expect(markup).not.toContain('data-region-descend="true"')

    client.clear()
  })

  it('행 높이는 48 이상이다', () => {
    const client = new QueryClient()
    const { styles } = renderWithStyles(
      withQueryClient(
        client,
        createElement(CommunityRegionSheetPanel, {
          value: {},
          mockEnabled: true,
          onCommit: vi.fn(),
        }),
      ),
    )

    expect(styles).toContain('min-height:48px')

    client.clear()
  })
})
