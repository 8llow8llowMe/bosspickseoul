// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AreaBoundaryItem } from '@/types/recommend'

/*
 * SDK 로드 실패와 재시도는 **클라이언트에서만** 일어난다. `recommend-map.test.ts`
 * 는 `renderToStaticMarkup` 이라 이 경로를 덮지 못한다.
 *
 * 「불러오는 중」으로 되돌리는 일을 로딩 이펙트 첫 줄이 아니라 재시도 클릭이 하도록
 * 옮겼으므로(`react-hooks/set-state-in-effect`), 그 이동이 동작을 바꾸지 않았다는
 * 것을 여기서 못박는다. 첫 마운트는 초기값이 이미 `'loading'` 이라 이펙트의 그
 * 호출이 하는 일이 없었고, 이펙트가 다시 도는 경로는 이 버튼뿐이다.
 */

/*
 * 로더의 동작은 **이 상자를 갈아끼워** 바꾼다. `mockImplementation` 을 테스트 안에서
 * 부르면 그 시점에 만들어진 거부 promise 가 미처리로 잡혀 테스트가 엉뚱한 곳에서
 * 깨졌다(실측). 팩토리 구현을 고정해 두고 안쪽만 바꾸면 그 창이 없다.
 */
const { behavior } = vi.hoisted(() => ({
  behavior: { load: (): Promise<unknown> => Promise.reject(new Error('stub')) },
}))

vi.mock('@/lib/kakao-map', () => ({
  loadKakaoMapSdk: vi.fn(() => behavior.load()),
}))

import { loadKakaoMapSdk } from '@/lib/kakao-map'
import RecommendMap from './recommend-map'

const loadSdk = vi.mocked(loadKakaoMapSdk)

const failLoad = () => {
  behavior.load = () => Promise.reject(new Error('sdk unavailable'))
}

/** 응답을 매달아 둔다 — 「불러오는 중」에 머무는지 보려는 것이다. */
const hangLoad = () => {
  behavior.load = () => new Promise(() => {})
}

const district: AreaBoundaryItem = {
  areaCode: '11680',
  areaName: '강남구',
  centerLng: 127.047,
  centerLat: 37.517,
  boundaryCoords: [
    [127.03, 37.5],
    [127.06, 37.5],
    [127.05, 37.53],
  ],
}

const baseProps: Parameters<typeof RecommendMap>[0] = {
  stage: 'district',
  districtAreas: [district],
  administrationAreas: [],
  commercialAreas: [],
  resultAreas: [],
  selectedDistrictCode: null,
  selectedAdministrationCode: null,
  selectedCommercialCode: null,
  onDistrictSelect: vi.fn(),
  onAdministrationSelect: vi.fn(),
  onCommercialSelect: vi.fn(),
}

const renderMap = () => render(createElement(RecommendMap, baseProps))

const ERROR_TITLE = '지도를 불러오지 못했어요'

beforeEach(() => {
  loadSdk.mockClear()
  failLoad()
})
afterEach(cleanup)

describe('RecommendMap SDK 재시도', () => {
  it('로드에 실패하면 에러와 재시도 버튼을 보여준다', async () => {
    renderMap()

    expect(await screen.findByText(ERROR_TITLE)).toBeTruthy()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy()
    expect(loadSdk).toHaveBeenCalledTimes(1)
  })

  it('실패한 동안에는 「선택 범위로 이동」이 잠겨 있다', async () => {
    renderMap()
    await screen.findByText(ERROR_TITLE)

    const recenter = screen.getByRole('button', {
      name: '선택 범위로 이동',
    }) as HTMLButtonElement

    expect(recenter.disabled).toBe(true)
  })

  it('재시도를 누르면 에러가 걷히고 SDK 를 다시 부른다', async () => {
    renderMap()
    await screen.findByText(ERROR_TITLE)

    hangLoad()
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    await waitFor(() => expect(loadSdk).toHaveBeenCalledTimes(2))
    // 상태가 'loading' 으로 돌아갔으므로 에러 표면이 사라진다.
    expect(screen.queryByText(ERROR_TITLE)).toBeNull()
    expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull()
  })
})
