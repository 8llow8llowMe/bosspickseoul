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
 * 단계 선택의 히스토리를 **렌더 수준에서** 본다(#562, map-shell.md D4-8 · TC-MS-039).
 *
 * `next/navigation` 을 작은 URL 저장소로 바꿔, `router.push/replace` 가 실제로 쿼리를 바꾸고
 * 셸이 그 URL 로 다시 렌더되게 한다. 카카오 지도·인기 상권·분기 카탈로그처럼 이 흐름과 상관없는
 * 외부 의존은 걷어 내고, 목록 API 는 고정 응답을 준다.
 */

const nav = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  const state = { search: '' }
  const go = (href: string) => {
    const query = href.split('?')[1] ?? ''
    state.search = query
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

vi.mock('@/components/analysis/analysis-map', () => ({
  default: () => null,
}))
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

const ok = <T>(dataBody: T) => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody,
})

vi.mock('@/lib/api/commercial-analysis', () => ({
  fetchDistricts: vi.fn(async () =>
    ok([{ districtCode: '11440', districtName: '마포구' }]),
  ),
  fetchCommercialServiceCategories: vi.fn(async () =>
    ok([
      {
        serviceCode: 'CS100001',
        serviceName: '한식음식점',
        serviceType: { name: '외식업' },
      },
      {
        serviceCode: 'CS100010',
        serviceName: '커피-음료',
        serviceType: { name: '외식업' },
      },
    ]),
  ),
}))

vi.mock('@/lib/api/recommend', () => {
  const emptyAreas = async () => ok({ areas: [] })
  return {
    fetchAdministrations: vi.fn(async () =>
      ok([{ administrationCode: '11440660', administrationName: '서교동' }]),
    ),
    fetchCommercials: vi.fn(async () =>
      ok([
        {
          commercialCode: '3110565',
          commercialName: '홍대 걷고싶은거리',
          commercialClassificationName: '골목상권',
          centerLat: 37.55,
          centerLng: 126.92,
        },
      ]),
    ),
    fetchDistrictMapAreas: vi.fn(emptyAreas),
    fetchAdministrationMapAreas: vi.fn(emptyAreas),
    fetchCommercialMapAreas: vi.fn(emptyAreas),
    fetchCommercialProfile: vi.fn(async () => ok(null)),
  }
})

import AnalysisMapShell from './analysis-map-shell'

const memory = new Map<string, string>()

beforeEach(() => {
  nav.state.search = ''
  nav.push.mockClear()
  nav.replace.mockClear()
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

/** 지도가 아직 정지하지 않았으니 셸은 초기 카메라(서울 기본)를 보존해 붙인다. */
const C = '&c=37.5665%2C126.978%2C8'

const renderShell = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AnalysisMapShell, null),
    ),
  )
}

/** 데스크톱 패널과 모바일 시트가 같은 목록을 두 벌 그린다. 첫 벌(데스크톱)을 누른다. */
const pick = async (name: string) => {
  // 상권 행은 분류(「골목상권」)까지 접근 이름에 들어가므로 앞부분으로 찾는다.
  const [button] = await screen.findAllByRole('button', {
    name: new RegExp(`^${name}`),
  })
  await act(async () => {
    fireEvent.click(button)
  })
}

describe('단계 선택의 히스토리 (렌더, #562)', () => {
  it('자치구→행정동→상권은 push 3회, 업종은 replace 다', async () => {
    renderShell()

    await pick('마포구')
    await pick('서교동')
    await pick('홍대 걷고싶은거리')
    await pick('한식음식점')

    expect(nav.push.mock.calls.map(([href]) => href)).toEqual([
      '/analysis?districtCode=11440' + C,
      '/analysis?districtCode=11440&administrationCode=11440660' + C,
      '/analysis?districtCode=11440&administrationCode=11440660&commercialCode=3110565' +
        C,
    ])
    expect(nav.replace).toHaveBeenCalledTimes(1)
    expect(nav.replace).toHaveBeenLastCalledWith(
      '/analysis?districtCode=11440&administrationCode=11440660&commercialCode=3110565&serviceCode=CS100001' +
        C,
    )
  })

  it('마지막으로 쓴 업종을 상권 선택 때 채우고, 자치구를 바꿔도 남긴다', async () => {
    memory.set(
      'bps_analysis_last_service',
      JSON.stringify({ code: 'CS100010', name: '커피-음료' }),
    )
    renderShell()

    await pick('마포구')
    await pick('서교동')
    await pick('홍대 걷고싶은거리')

    expect(nav.push).toHaveBeenLastCalledWith(
      '/analysis?districtCode=11440&administrationCode=11440660&commercialCode=3110565&serviceCode=CS100010' +
        C,
    )
    await waitFor(() =>
      expect(
        screen.getAllByRole('button', { name: '업종: 커피-음료' }).length,
      ).toBeGreaterThan(0),
    )
  })
})
