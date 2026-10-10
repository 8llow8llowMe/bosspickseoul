// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { createElement, useSyncExternalStore } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/*
 * 이름 검색으로 고르면 셸이 선택을 어디까지 채우고 URL 을 어떻게 남기는지 본다(#596).
 * 히스토리 규칙(map-shell.md D4-8)은 목록·지도와 같다 — 자치구·행정동·상권 확정은 `push`.
 * `next/navigation` 은 히스토리 테스트(analysis-map-shell.history.test.ts)와 같은 작은 URL 저장소다.
 */

const nav = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  const state = { search: '' }
  const go = (href: string) => {
    state.search = href.split('?')[1] ?? ''
    listeners.forEach(listener => listener())
  }
  return {
    state,
    listeners,
    push: vi.fn(go),
    replace: vi.fn(go),
    back: vi.fn(),
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, back: nav.back }),
  usePathname: () => '/analysis',
  useSearchParams: () => {
    const search = useSyncExternalStore(
      listener => {
        nav.listeners.add(listener)
        return () => nav.listeners.delete(listener)
      },
      () => nav.state.search,
      () => nav.state.search,
    )
    return new URLSearchParams(search)
  },
}))

vi.mock('@/components/analysis/analysis-map', () => ({ default: () => null }))
vi.mock('@/components/analysis/popular-commercials-shortcut', () => ({
  default: () => null,
}))
vi.mock('@/hooks/use-narrow-viewport', () => ({
  useNarrowViewport: () => false,
}))
vi.mock('@/hooks/use-resolved-analysis-period', () => ({
  useResolvedAnalysisPeriod: () => ({
    periodCode: '20261',
    catalog: { isUnavailable: false, refetch: () => undefined },
  }),
}))

const analytics = vi.hoisted(() => ({ trackEvent: vi.fn() }))
vi.mock('@/lib/analytics/events', () => analytics)

/** 망원역 좌표. 상권 「망원시장」 경계 안이다. */
const STATION = { lng: 126.9106, lat: 37.556 }
/** 서울 범위 안이지만 어느 경계에도 들지 않는 좌표. */
const NOWHERE = { lng: 127.2, lat: 37.7 }

const places = vi.hoisted(() => ({ searchSeoulPlaces: vi.fn() }))
vi.mock('@/lib/analysis/place-search', () => places)

const ok = <T>(dataBody: T) => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody,
})

const box = (
  areaCode: string,
  areaName: string,
  center: { lng: number; lat: number },
  half: number,
) => ({
  areaCode,
  areaName,
  centerLng: center.lng,
  centerLat: center.lat,
  boundaryCoords: [
    [center.lng - half, center.lat - half],
    [center.lng + half, center.lat - half],
    [center.lng + half, center.lat + half],
    [center.lng - half, center.lat + half],
  ],
})

/** 조회 창이 좁으면(장소 좌표 탐침) 그 점 둘레 경계를 준다. 지도 뷰포트 조회에는 빈 목록이다. */
const isProbe = (bounds: { lngSW: number; lngNE: number }) =>
  bounds.lngNE - bounds.lngSW < 0.01

vi.mock('@/lib/api/commercial-analysis', () => ({
  fetchDistricts: vi.fn(async () =>
    ok([{ districtCode: '11440', districtName: '마포구' }]),
  ),
  fetchCommercialServiceCategories: vi.fn(async () => ok([])),
}))

vi.mock('@/lib/api/recommend', () => ({
  fetchAdministrations: vi.fn(async () =>
    ok([
      { administrationCode: '11440660', administrationName: '서교동' },
      { administrationCode: '11440690', administrationName: '망원1동' },
    ]),
  ),
  fetchCommercials: vi.fn(async () =>
    ok([
      {
        commercialCode: '3110600',
        commercialName: '망원시장',
        commercialClassificationName: '전통시장',
        centerLat: STATION.lat,
        centerLng: STATION.lng,
      },
    ]),
  ),
  fetchDistrictMapAreas: vi.fn(async () => ok({ areas: [] })),
  fetchAdministrationMapAreas: vi.fn(
    async (bounds: { lngSW: number; lngNE: number }) =>
      ok({
        areas: isProbe(bounds)
          ? [box('11440690', '망원1동', STATION, 0.01)]
          : [],
      }),
  ),
  fetchCommercialMapAreas: vi.fn(
    async (bounds: { lngSW: number; lngNE: number }) =>
      ok({
        areas: isProbe(bounds)
          ? [box('3110600', '망원시장', STATION, 0.002)]
          : [],
      }),
  ),
  fetchCommercialRegion: vi.fn(async () =>
    ok({
      commercialCode: '3110600',
      commercialName: '망원시장',
      districtCode: '11440',
      districtName: '마포구',
      administrationCode: '11440690',
      administrationName: '망원1동',
    }),
  ),
  fetchCommercialProfile: vi.fn(async () => ok(null)),
}))

import AnalysisMapShell from './analysis-map-shell'
import {
  fetchAdministrationMapAreas,
  fetchCommercialMapAreas,
  fetchCommercialRegion,
} from '@/lib/api/recommend'

/** 지도가 아직 정지하지 않았으니 셸은 초기 카메라(서울 기본)를 보존해 붙인다. */
const C = '&c=37.5665%2C126.978%2C8'

const memory = new Map<string, string>()

beforeEach(() => {
  nav.state.search = ''
  nav.push.mockClear()
  nav.replace.mockClear()
  analytics.trackEvent.mockClear()
  places.searchSeoulPlaces.mockReset()
  memory.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const renderShell = () =>
  render(
    createElement(
      QueryClientProvider,
      {
        client: new QueryClient({
          defaultOptions: { queries: { retry: false } },
        }),
      },
      createElement(AnalysisMapShell, null),
    ),
  )

/** 데스크톱 패널과 모바일 시트가 같은 칸을 두 벌 그린다. 첫 벌(데스크톱)에 입력한다. */
const search = async (text: string) => {
  const [input] = await screen.findAllByRole('combobox', {
    name: '상권·지하철역·동 이름으로 찾기',
  })
  await act(async () => {
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: text } })
  })
  return input
}

describe('상권분석 이름 검색 (렌더, #596)', () => {
  it('자치구 이름을 ↓ Enter 로 고르면 자치구를 push 하고 검색 경유로 계측한다', async () => {
    places.searchSeoulPlaces.mockResolvedValue([])
    renderShell()
    // 자치구 목록이 도착해야 이름 색인에 들어간다.
    await screen.findAllByRole('button', { name: /^마포구/ })

    const input = await search('마포')
    await waitFor(() =>
      expect(screen.getAllByRole('option').length).toBeGreaterThan(0),
    )
    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })

    await waitFor(() =>
      expect(nav.push).toHaveBeenCalledWith('/analysis?districtCode=11440' + C),
    )
    expect(analytics.trackEvent).toHaveBeenCalledWith('analysis_step_select', {
      step: 'district',
      method: 'search',
    })
  })

  it('지하철역을 고르면 좌표를 품은 상권으로 세 단계를 한 번에 채워 push 한다', async () => {
    places.searchSeoulPlaces.mockResolvedValue([
      {
        kind: 'place',
        id: 'p1',
        name: '망원역 6호선',
        category: '지하철역',
        address: '서울 마포구 월드컵로 지하 77',
        point: STATION,
      },
    ])
    renderShell()

    await search('망원역')
    const option = await screen.findByRole('option', { name: /망원역 6호선/ })
    await act(async () => {
      fireEvent.click(option)
    })

    await waitFor(() =>
      expect(nav.push).toHaveBeenCalledWith(
        '/analysis?districtCode=11440&administrationCode=11440690&commercialCode=3110600' +
          C,
      ),
    )
    expect(nav.push).toHaveBeenCalledTimes(1)
    expect(analytics.trackEvent).toHaveBeenCalledWith('analysis_step_select', {
      step: 'commercial',
      method: 'search',
    })
  })

  it('어느 경계에도 들지 않는 장소는 이동하지 않고 이유를 알린다', async () => {
    places.searchSeoulPlaces.mockResolvedValue([
      {
        kind: 'place',
        id: 'p2',
        name: '어딘가 공원',
        category: '공원',
        address: '서울 어딘가',
        point: NOWHERE,
      },
    ])
    renderShell()

    await search('어딘가')
    const option = await screen.findByRole('option', { name: /어딘가 공원/ })
    await act(async () => {
      fireEvent.click(option)
    })

    expect((await screen.findByRole('alert')).textContent).toBe(
      '서울 상권·행정동 경계 안에서 「어딘가 공원」 위치를 찾지 못했습니다. 가까운 동 이름으로 다시 찾아 주세요.',
    )
    expect(nav.push).not.toHaveBeenCalled()
  })
})

/** 재시도하지 않는 클라이언트 오류(404). 서버 오류면 `retryUnlessClientError` 가 한 번 더 부른다. */
const notFound = () =>
  Object.assign(new Error('not found'), {
    response: {
      status: 404,
      data: {
        dataHeader: {
          success: false,
          resultCode: 'REGION_404',
          resultMessage: '없음',
        },
      },
    },
  })

const MANGWON_STATION = {
  kind: 'place' as const,
  id: 'p1',
  name: '망원역 6호선',
  category: '지하철역',
  address: '서울 마포구 월드컵로 지하 77',
  point: STATION,
}

const pickStation = async () => {
  places.searchSeoulPlaces.mockResolvedValue([MANGWON_STATION])
  renderShell()
  await search('망원역')
  const option = await screen.findByRole('option', { name: /망원역 6호선/ })
  await act(async () => {
    fireEvent.click(option)
  })
}

describe('이름 검색 고르기의 예외 경로 (렌더, #596)', () => {
  it('역조회를 기다리는 사이 목록에서 다른 곳을 고르면 늦게 끝난 검색 결과는 버린다', async () => {
    type RegionResponse = Awaited<ReturnType<typeof fetchCommercialRegion>>
    let resolveRegion: (value: RegionResponse) => void = () => undefined
    vi.mocked(fetchCommercialRegion).mockImplementationOnce(
      () =>
        new Promise<RegionResponse>(resolve => {
          resolveRegion = resolve
        }),
    )
    await pickStation()
    await waitFor(() => expect(fetchCommercialRegion).toHaveBeenCalled())

    // 검색이 끝나기 전에 목록에서 자치구를 고른다.
    const [district] = await screen.findAllByRole('button', { name: /^마포구/ })
    await act(async () => {
      fireEvent.click(district)
    })
    await act(async () => {
      resolveRegion(
        ok({
          commercialCode: '3110600',
          commercialName: '망원시장',
          districtCode: '11440',
          districtName: '마포구',
          administrationCode: '11440690',
          administrationName: '망원1동',
        }) as RegionResponse,
      )
    })

    expect(nav.push.mock.calls.map(([href]) => href)).toEqual([
      '/analysis?districtCode=11440' + C,
    ])
    expect(analytics.trackEvent).not.toHaveBeenCalledWith(
      'analysis_step_select',
      { step: 'commercial', method: 'search' },
    )
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('상권 역조회가 실패하면 좌표를 품은 행정동을 소속으로 쓴다', async () => {
    vi.mocked(fetchCommercialRegion).mockRejectedValueOnce(notFound())
    await pickStation()

    await waitFor(() =>
      expect(nav.push).toHaveBeenCalledWith(
        '/analysis?districtCode=11440&administrationCode=11440690&commercialCode=3110600' +
          C,
      ),
    )
  })

  it('역조회가 실패하고 좌표를 품은 행정동도 없으면 이동하지 않고 이유를 알린다', async () => {
    vi.mocked(fetchCommercialRegion).mockRejectedValueOnce(notFound())
    vi.mocked(fetchAdministrationMapAreas).mockResolvedValueOnce(
      ok({ areas: [] }) as Awaited<
        ReturnType<typeof fetchAdministrationMapAreas>
      >,
    )
    await pickStation()

    expect((await screen.findByRole('alert')).textContent).toBe(
      '「망원시장」 상권이 속한 행정동을 찾지 못했습니다. 자치구부터 차례로 골라 주세요.',
    )
    expect(nav.push).not.toHaveBeenCalled()
  })

  it('장소 둘레 경계 조회가 둘 다 실패하면 이동하지 않고 이유를 알린다', async () => {
    vi.mocked(fetchCommercialMapAreas).mockRejectedValueOnce(notFound())
    vi.mocked(fetchAdministrationMapAreas).mockRejectedValueOnce(notFound())
    await pickStation()

    expect((await screen.findByRole('alert')).textContent).toBe(
      '고른 장소 주변의 상권 경계를 불러오지 못했습니다. 잠시 후 다시 골라 주세요.',
    )
    expect(nav.push).not.toHaveBeenCalled()
  })
})
