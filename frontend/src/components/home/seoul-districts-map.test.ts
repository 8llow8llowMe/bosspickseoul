import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'
import SeoulDistrictsMap from '@/components/home/seoul-districts-map'
import { SEOUL_STATUS_FEATURES } from '@/data/seoul-status-map'
import { HOME_DISTRICT_RANKINGS_QUERY_KEY } from '@/hooks/use-home-district-rankings'
import type { DistrictRankingsResponse } from '@/types/status'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined }),
}))

const render = (
  props: Parameters<typeof SeoulDistrictsMap>[0] = {},
  rankings?: DistrictRankingsResponse,
) => {
  const client = new QueryClient()
  if (rankings) client.setQueryData(HOME_DISTRICT_RANKINGS_QUERY_KEY, rankings)

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(SeoulDistrictsMap, { key: 'map', ...props }),
    ),
  )
}

const CODES = SEOUL_STATUS_FEATURES.map(feature => feature.districtCode)
const MAPO = '11440'

/** 25개 구 유동인구 전체 순위. 마포구를 1위로 둔다. */
const createRankings = (count = 25): DistrictRankingsResponse => {
  const ordered = [MAPO, ...CODES.filter(code => code !== MAPO)].slice(0, count)
  return {
    dataHeader: { success: true, resultCode: null, resultMessage: null },
    dataBody: {
      currentPeriodCode: '20261',
      previousPeriodCode: '20254',
      footTrafficRankings: ordered.map((districtCode, index) => ({
        rank: index + 1,
        districtCode,
        districtName: `${index + 1}번구`,
        totalFootTraffic: 1_000_000 - index * 10_000,
        footTrafficChangeRate: 1,
      })),
      salesRankings: [],
      openedStoreRankings: [],
      closedStoreRankings: [],
    },
  }
}

const pathOf = (html: string, name: string) =>
  html.match(new RegExp(`<path[^>]*aria-label="${name}"[^>]*>`))?.[0] ?? ''

const countOf = (html: string, pattern: RegExp) =>
  (html.match(pattern) ?? []).length

/**
 * 히어로 지도(hero-picker-and-mobile-first-screen.md D4-4·D4-5).
 */
describe('SeoulDistrictsMap', () => {
  it('데스크톱(활성화 콜백 없음)은 폴리곤이 링크다', () => {
    const path = pathOf(render(), '마포구')

    expect(path).toContain('role="link"')
    expect(path).not.toContain('aria-pressed')
  })

  it('모바일(활성화 콜백 있음)은 이동하지 않는 버튼이고 선택을 알린다', () => {
    const html = render({
      onDistrictActivate: () => undefined,
      selectedCode: '11440',
    })

    expect(pathOf(html, '마포구')).toContain('role="button"')
    expect(pathOf(html, '마포구')).toContain('aria-pressed="true"')
    expect(pathOf(html, '강남구')).toContain('aria-pressed="false"')
  })

  it('지도 설명 캡션을 svg 에 잇는다', () => {
    const html = render()
    const describedBy = html.match(/<svg[^>]*aria-describedby="([^"]+)"/)?.[1]

    expect(describedBy).toBeTruthy()
    expect(html).toContain(`id="${describedBy}"`)
    expect(html).toContain('자치구 위에 올리면 시간대별 유동인구가 보이고')
    expect(html).toContain('자치구를 누르면 위 칸에서 바로 골라져요.')
  })
})

/*
 * 첫 화면 지도를 유동인구 5분위로 칠한다(#588). 구별현황 지도와 같은 단계 계산·같은 다섯 칸이다.
 * 단계 계산 자체는 `lib/home/hero-map.test.ts` 가 본다 — 여기서는 배선만.
 */
describe('SeoulDistrictsMap — 값 5단계 칠(#588)', () => {
  it('25개 구 모두에 단계를 달고 1위 구는 1단계다', () => {
    const html = render({}, createRankings())

    expect(countOf(html, /data-value-step="\d"/g)).toBe(25)
    expect(pathOf(html, '마포구, 유동인구 1위')).toContain(
      'data-value-step="1"',
    )
    for (const step of [1, 2, 3, 4, 5]) {
      expect(countOf(html, new RegExp(`data-value-step="${step}"`, 'g'))).toBe(
        5,
      )
    }
  })

  it('지도 아래에 기준 분기·지표와 많음→적음 범례를 두고 svg 설명에 잇는다', () => {
    const html = render({}, createRankings())
    const legend =
      html.match(/<p[^>]*data-hero-map-legend[^>]*>[\s\S]*?<\/p>/)?.[0] ?? ''
    const legendId = legend.match(/id="([^"]+)"/)?.[1]
    const describedBy =
      html.match(/<svg[^>]*aria-describedby="([^"]+)"/)?.[1] ?? ''

    expect(legend).toContain('2026년 1분기 유동인구')
    expect(legend).toContain('많음')
    expect(legend).toContain('적음')
    expect(legendId).toBeTruthy()
    expect(describedBy.split(' ')).toContain(legendId)
    // 25개 구가 다 있으면 「데이터 없음」 칸이 없다.
    expect(legend).not.toContain('데이터 없음')
  })

  it('값이 빠진 구가 있으면 회색으로 두고 범례에 「데이터 없음」 칸을 더한다', () => {
    const html = render({}, createRankings(20))

    expect(countOf(html, /data-value-step="\d"/g)).toBe(20)
    expect(html).toContain('데이터 없음')
  })

  it('값을 못 받으면 예전처럼 칠하지 않고 범례 글자도 두지 않는다', () => {
    const html = render()
    const legend =
      html.match(/<p[^>]*data-hero-map-legend[^>]*>[\s\S]*?<\/p>/)?.[0] ?? ''

    expect(countOf(html, /data-value-step=/g)).toBe(0)
    expect(legend.replace(/<[^>]+>/g, '')).toBe('')
    expect(pathOf(html, '마포구')).toContain('role="link"')
  })

  it('칠과 함께 클릭 선택은 그대로다 — 고른 구는 data-selected 로 덮어 칠한다', () => {
    const html = render(
      { onDistrictActivate: () => undefined, selectedCode: MAPO },
      createRankings(),
    )
    const mapo = pathOf(html, '마포구, 유동인구 1위')

    expect(mapo).toContain('role="button"')
    expect(mapo).toContain('aria-pressed="true"')
    expect(mapo).toContain('data-selected="true"')
  })
})

describe('SeoulDistrictsMap — 단계 색 규칙', () => {
  const renderStyles = () => {
    const sheet = new ServerStyleSheet()
    try {
      renderToStaticMarkup(
        sheet.collectStyles(
          createElement(
            QueryClientProvider,
            { client: new QueryClient() },
            createElement(SeoulDistrictsMap),
          ),
        ),
      )
      return sheet.getStyleTags().replace(/\s+/g, '')
    } finally {
      sheet.seal()
    }
  }

  it('구별현황과 같은 다섯 칸(primary-600 60~11%)으로 칠한다', () => {
    const css = renderStyles()

    for (const percent of [60, 46, 33, 21, 11]) {
      expect(css).toContain(
        `fill:color-mix(insrgb,var(--color-primary-600)${percent}%,var(--color-surface))`,
      )
    }
  })

  it('고른 구·hover 칠은 단계 규칙보다 뒤에 와서 같은 명시도에서 이긴다', () => {
    const css = renderStyles()
    // 폴리곤마다 등장 지연이 달라 클래스가 25벌이다 — 첫 벌 안에서 순서를 본다.
    const lastStep = css.indexOf("[data-value-step='5']")
    const selected = css.indexOf(
      "[data-selected='true']{fill:var(--color-primary-700);}",
    )

    expect(lastStep).toBeGreaterThan(-1)
    expect(selected).toBeGreaterThan(lastStep)
  })
})
