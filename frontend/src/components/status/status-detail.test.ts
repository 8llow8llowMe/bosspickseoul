import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import type { DistrictDetail, StatusSelectedDistrict } from '@/types/status'
import StatusDetail, { StatGrid } from './status-detail'

const squeeze = (css: string): string => css.replace(/\s+/g, '')

const renderStyles = (element: ReturnType<typeof createElement>): string => {
  const styleSheet = new ServerStyleSheet()

  try {
    renderToStaticMarkup(styleSheet.collectStyles(element))
    return styleSheet.getStyleTags()
  } finally {
    styleSheet.seal()
  }
}

/**
 * repeat(auto-fit, …) 은 열 수에 상한이 없다. CSS 에 max-columns 가 없으므로
 * 폭 상한과 짝지어야 한다. 셸에서 상한을 걷어낸 뒤 이 그리드는 2560px 칸에서
 * 18열까지 갔다 — 최소 트랙 폭만으로는 폭주를 막지 못한다.
 */
describe('/status 상세카드 지표 그리드', () => {
  it('auto-fit 그리드는 폭 상한과 짝을 이룬다', () => {
    const css = squeeze(renderStyles(createElement(StatGrid)))

    expect(css).toContain('repeat(auto-fit,minmax(200px,1fr))')
    expect(css).toContain('max-width:var(--w-wide)')
  })
})

describe('/status 상세 머리', () => {
  const renderHeader = (
    selectedDistrict: StatusSelectedDistrict,
    metric: 'sales' | 'opened' = 'sales',
    periodCode = '20261',
  ) =>
    renderToStaticMarkup(
      createElement(StatusDetail, {
        metric,
        periodCode,
        selectedDistrict,
        detail: null,
        isLoading: true,
        error: null,
        onRetry: vi.fn(),
      }),
    )

  it('순위 안의 구는 값·변화율과 「지표 N위」를 함께 적는다', () => {
    const markup = renderHeader({
      districtCode: '11680',
      districtName: '강남구',
      rankedItem: {
        rank: 1,
        districtCode: '11680',
        districtName: '강남구',
        value: 3_134_652_050_000,
        changeRate: -4.3,
      },
    })

    expect(markup).toContain('강남구 상세')
    expect(markup).toContain('3조 1,347억원')
    expect(markup).toContain('-4.3%')
    expect(markup).toContain('매출 1위')
  })

  // D-1 · #560 — 증감 칩도 목록과 같이 기준·방향을 읽히고 「개선/악화」를 글자로 적는다.
  it('증감 칩은 ▲▼ 를 숨기고 기준·방향을 읽히며 개선·악화를 적는다', () => {
    const selected = (changeRate: number): StatusSelectedDistrict => ({
      districtCode: '11680',
      districtName: '강남구',
      rankedItem: {
        rank: 1,
        districtCode: '11680',
        districtName: '강남구',
        value: 1_559,
        changeRate,
      },
    })
    const falling = renderHeader(selected(-4.3))
    const openedRising = renderHeader(selected(26.1), 'opened')

    expect(falling).toContain('<span aria-hidden="true">▼</span>')
    expect(falling).toMatch(/<span[^>]*>직전 분기 대비 감소 <\/span>/)
    expect(falling).toContain('<span>악화</span>')
    // 개업 증가는 좋은 쪽이다(폐업만 낮을수록 좋다).
    expect(openedRising).toContain('<span>개선</span>')
  })

  it('Top10 밖 구도 전체 순위의 값·변화율과 「지표 N위」를 적는다', () => {
    const markup = renderHeader({
      districtCode: '11545',
      districtName: '금천구',
      rankedItem: {
        rank: 14,
        districtCode: '11545',
        districtName: '금천구',
        value: 1_210_000_000_000,
        changeRate: -2.1,
      },
    })

    expect(markup).toContain('1조 2,100억원')
    expect(markup).toContain('-2.1%')
    expect(markup).toContain('매출 14위')
    expect(markup).not.toContain('10위 밖')
  })

  it('변화율이 null 이면 0% 가 아니라 결측으로 적는다', () => {
    const markup = renderHeader({
      districtCode: '11710',
      districtName: '송파구',
      rankedItem: {
        rank: 2,
        districtCode: '11710',
        districtName: '송파구',
        value: 100,
        changeRate: null,
      },
    })

    expect(markup).toContain('매출 2위')
    expect(markup).toContain('<span>변화율 데이터 없음</span>')
    expect(markup).not.toContain('–')
    expect(markup).not.toContain('0%')
    expect(markup).not.toContain('변동 없음')
  })

  it('지표 순위에 없는 구는 값 없이 「지표 데이터 없음」만 적는다', () => {
    // 그 분기 행이 없어 전체 순위에서도 빠진 구다.
    const markup = renderHeader(
      { districtCode: '11650', districtName: '서초구', rankedItem: null },
      'opened',
    )

    expect(markup).toContain('서초구 상세')
    expect(markup).toContain('개업 데이터 없음')
    expect(markup).not.toContain('%')
  })

  // 과거 분기를 고르면 상세가 어느 분기 값인지 머리에서 드러나야 한다(status.md 1.6).
  it('순위 줄 뒤에 기준 분기를 적는다', () => {
    const ranked = renderHeader(
      {
        districtCode: '11680',
        districtName: '강남구',
        rankedItem: {
          rank: 2,
          districtCode: '11680',
          districtName: '강남구',
          value: 100,
          changeRate: 1,
        },
      },
      'sales',
      '20233',
    )
    const outside = renderHeader(
      { districtCode: '11650', districtName: '서초구', rankedItem: null },
      'opened',
      '20261',
    )

    expect(ranked).toContain('매출 2위')
    expect(ranked).toContain('2023년 3분기 기준')
    expect(outside).toContain('개업 데이터 없음')
    expect(outside).toContain('2026년 1분기 기준')
  })
})

describe('/status 상세 바로가기와 분석 CTA', () => {
  const selectedDistrict: StatusSelectedDistrict = {
    districtCode: '11650',
    districtName: '서초구',
    rankedItem: null,
  }
  const render = (props: Partial<ComponentProps<typeof StatusDetail>> = {}) =>
    renderToStaticMarkup(
      createElement(StatusDetail, {
        metric: 'sales',
        periodCode: '20261',
        selectedDistrict,
        detail: null,
        isLoading: false,
        error: null,
        onRetry: vi.fn(),
        ...props,
      }),
    )

  it('자치구 상권분석으로 가는 CTA 를 붙인다 — 로딩 중에도 출구는 보인다', () => {
    const markup = render({ isLoading: true })

    expect(markup).toContain('href="/analysis?districtCode=11650"')
    expect(markup).toContain('서초구 상권 분석하기')
  })

  it('상세가 없으면 바로가기 칩을 그리지 않는다', () => {
    expect(render({ isLoading: true })).not.toContain('data-status-detail-chip')
    expect(render()).not.toContain('data-status-detail-chip')
  })

  it('상세가 있으면 네 묶음 바로가기와 그 앵커를 그린다', () => {
    const markup = render({ detail: {} as DistrictDetail })

    for (const key of ['flow', 'footTraffic', 'store', 'sales']) {
      expect(markup).toContain(`data-status-detail-chip="${key}"`)
      expect(markup).toContain(`data-status-detail-section="${key}"`)
    }
    // 처음엔 첫 묶음이 켜져 있다.
    expect(markup).toMatch(
      /aria-current="location"[^>]*data-status-detail-chip="flow"/,
    )
  })
})
