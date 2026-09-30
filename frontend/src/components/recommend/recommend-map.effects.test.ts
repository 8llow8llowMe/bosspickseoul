// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { createElement, StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AREA_LABEL_CLASS_NAME } from '@/lib/map/draw-area-label-layer'
import { resolveAreaPolygonStyle } from '@/lib/map/area-polygon-style'
import type { RecommendationMapItem } from '@/lib/recommend/recommend-map-model'
import {
  createFakeKakaoMaps,
  stubResizeObserver,
  type FakeCameraCall,
  type FakeKakaoMaps,
  type FakeMapInstance,
  type FakeResizeObserverHandle,
} from '@/test/fake-kakao-maps'
import type { AreaBoundaryItem, CoordinateTuple } from '@/types/recommend'

/*
 * 지도 이펙트의 **특성화 테스트**다(#375). `recommend-map.test.ts` 는 SSR 마크업과
 * 순수 함수만 보고, 이펙트·ref 타이밍은 전혀 덮지 않는다. 여기서는 가짜 카카오 SDK
 * (`src/test/fake-kakao-maps.ts`)로 실제 이펙트를 돌려, 이 컴포넌트가 지도에 하는
 * 일을 관찰 가능한 기록으로 못박는다.
 *
 * 특히 두 성질을 지킨다. ① 지도 핸들러·레이어는 한 번 등록되면 콜백 prop 이
 * 바뀌어도 **다시 만들지 않는다**. ② 그렇게 오래 사는 핸들러가 부르는 것은
 * **최신 prop** 이다. 최신값 ref 를 `useEffectEvent` 로 옮길 때 이 둘이 깨지면 안 된다.
 */

const { sdk } = vi.hoisted(() => ({
  sdk: { current: null as FakeKakaoMaps | null },
}))

vi.mock('@/lib/kakao-map', () => ({
  loadKakaoMapSdk: vi.fn(() => {
    if (!sdk.current) return Promise.reject(new Error('fake sdk missing'))
    return Promise.resolve(sdk.current.maps)
  }),
}))

import RecommendMap, { RECENTER_LABEL } from './recommend-map'

type Props = Parameters<typeof RecommendMap>[0]

const area = (
  areaCode: string,
  areaName: string,
  boundaryCoords: CoordinateTuple[],
): AreaBoundaryItem => ({
  areaCode,
  areaName,
  centerLng: boundaryCoords[0][0] + 0.001,
  centerLat: boundaryCoords[0][1] + 0.001,
  boundaryCoords,
})

const gangnam = area('11680', '강남구', [
  [127.03, 37.5],
  [127.06, 37.5],
  [127.05, 37.53],
])
const seocho = area('11650', '서초구', [
  [126.99, 37.47],
  [127.02, 37.47],
  [127.01, 37.5],
])
const yeoksam1 = area('1168010100', '역삼1동', [
  [127.031, 37.5],
  [127.04, 37.5],
  [127.035, 37.51],
])
const yeoksam2 = area('1168010200', '역삼2동', [
  [127.041, 37.5],
  [127.05, 37.5],
  [127.045, 37.51],
])
const commercialA = area('C1', '역삼역 상권', [
  [127.0311, 37.5011],
  [127.034, 37.5011],
  [127.032, 37.504],
])
const commercialB = area('C2', '선릉역 상권', [
  [127.0351, 37.5011],
  [127.038, 37.5011],
  [127.036, 37.504],
])

const result = (
  rank: number,
  commercialCode: string,
  boundaryCoords: CoordinateTuple[],
): RecommendationMapItem => ({
  rank,
  commercialCode,
  commercialName: `${commercialCode} 상권`,
  compositeScore: 100 - rank * 10,
  centerLng: boundaryCoords[0][0] + 0.0005,
  centerLat: boundaryCoords[0][1] + 0.0005,
  boundaryCoords,
})

const results = [
  result(1, 'R1', [
    [127.0312, 37.5012],
    [127.0322, 37.5012],
    [127.0317, 37.5022],
  ]),
  result(2, 'R2', [
    [127.0332, 37.5032],
    [127.0342, 37.5032],
    [127.0337, 37.5042],
  ]),
  result(3, 'R3', [
    [127.0352, 37.5052],
    [127.0362, 37.5052],
    [127.0357, 37.5062],
  ]),
]

const baseProps = (): Props => ({
  stage: 'district',
  districtAreas: [gangnam, seocho],
  administrationAreas: [],
  commercialAreas: [],
  resultAreas: [],
  selectedDistrictCode: null,
  selectedAdministrationCode: null,
  selectedCommercialCode: null,
  onDistrictSelect: vi.fn(),
  onAdministrationSelect: vi.fn(),
  onCommercialSelect: vi.fn(),
  onCommercialPreviewChange: vi.fn(),
  onBackgroundClick: vi.fn(),
  onViewportBoundsChange: vi.fn(),
  onCameraSettle: vi.fn(),
  onRecenter: vi.fn(),
})

/** 바뀐 콜백이 불리는지 보려고, 모든 콜백을 새 함수로 갈아 끼운 prop 조각. */
const freshCallbacks = (): Partial<Props> => ({
  onDistrictSelect: vi.fn(),
  onAdministrationSelect: vi.fn(),
  onCommercialSelect: vi.fn(),
  onCommercialPreviewChange: vi.fn(),
  onBackgroundClick: vi.fn(),
  onViewportBoundsChange: vi.fn(),
  onCameraSettle: vi.fn(),
  onRecenter: vi.fn(),
})

const fake = (): FakeKakaoMaps => {
  if (!sdk.current) throw new Error('fake sdk missing')
  return sdk.current
}

const theMap = (): FakeMapInstance => {
  const [map] = fake().mapInstances
  if (!map) throw new Error('map was not created')
  return map
}

const recenterButton = () =>
  screen.getByRole('button', { name: RECENTER_LABEL }) as HTMLButtonElement

const renderMap = async (
  overrides: Partial<Props> = {},
  { strict = false }: { strict?: boolean } = {},
) => {
  let props: Props = { ...baseProps(), ...overrides }
  const element = (next: Props) =>
    strict
      ? createElement(StrictMode, null, createElement(RecommendMap, next))
      : createElement(RecommendMap, next)
  /*
   * SDK 는 promise 로 붙는다. 그 `.then` 의 setState 를 **async act 안에서** 받아야
   * act 가 끝날 때 그 커밋의 이펙트(레이어 그리기)까지 비운다. `waitFor` 로 버튼이
   * 풀리기만 기다리면, DOM 커밋과 이펙트 실행 사이에 끼어 레이어가 비어 보이는
   * 경우가 생긴다(실측 — 15회 중 1회 꼴로 폴리곤 0개).
   */
  const mounted = await act(async () => render(element(props)))

  // SDK 가 붙으면 되돌리기 버튼이 풀린다.
  expect(recenterButton().disabled).toBe(false)

  return {
    get props() {
      return props
    },
    rerender(next: Partial<Props>) {
      props = { ...props, ...next }
      mounted.rerender(element(props))
    },
  }
}

const samePath = (
  path: ReadonlyArray<{ lat: number; lng: number }>,
  coords: readonly CoordinateTuple[],
) =>
  path.length === coords.length &&
  path.every(
    (point, index) =>
      point.lng === coords[index][0] && point.lat === coords[index][1],
  )

const livePolygonOf = (item: { boundaryCoords: CoordinateTuple[] }) => {
  const matches = fake()
    .livePolygons()
    .filter(polygon => samePath(polygon.path, item.boundaryCoords))
  if (matches.length !== 1) {
    throw new Error(`expected one live polygon, got ${matches.length}`)
  }
  return matches[0]
}

const liveLabels = () =>
  fake()
    .liveOverlays()
    .map(overlay => overlay.content)
    .filter(
      (node): node is HTMLButtonElement =>
        node instanceof HTMLButtonElement &&
        node.className === AREA_LABEL_CLASS_NAME,
    )

const labelOf = (item: AreaBoundaryItem) => {
  const label = liveLabels().find(
    node => node.getAttribute('aria-label') === `${item.areaName} 선택`,
  )
  if (!label) throw new Error(`no live label for ${item.areaName}`)
  return label
}

const liveMarkers = () =>
  fake()
    .liveOverlays()
    .map(overlay => overlay.content)
    .filter(
      (node): node is HTMLButtonElement =>
        node instanceof HTMLButtonElement &&
        node.className === 'recommend-rank-marker',
    )

const markerOf = (rank: number) => {
  const marker = liveMarkers().find(node => node.textContent === String(rank))
  if (!marker) throw new Error(`no live marker for rank ${rank}`)
  return marker
}

/** SDK 이벤트는 React 밖에서 온다. 상태를 건드릴 수 있으니 act 로 감싼다. */
const fire = (
  target: object,
  type: 'click' | 'idle' | 'mouseover' | 'mouseout',
) => act(() => fake().trigger(target, type))

const fireDom = (node: Element, type: string) =>
  act(() => {
    node.dispatchEvent(new Event(type, { bubbles: true }))
  })

const tokens = {
  baseStroke: '#2272eb',
  activeStroke: '#2272eb',
  fill: '#2272eb',
}
const WEIGHT = {
  default: resolveAreaPolygonStyle('default', tokens, 0).strokeWeight,
  hovered: resolveAreaPolygonStyle('hovered', tokens, 0).strokeWeight,
  selected: resolveAreaPolygonStyle('selected', tokens, 0).strokeWeight,
}

const toPoints = (coords: readonly CoordinateTuple[]) =>
  coords.map(([lng, lat]) => ({ lat, lng }))

/** 카메라 이펙트가 건 fit 만 고른다 — 패딩을 넘기는 쪽이 `applyCameraTarget` 이다. */
const paddedFits = (calls: readonly FakeCameraCall[]) =>
  calls.filter(
    (call): call is Extract<FakeCameraCall, { type: 'setBounds' }> =>
      call.type === 'setBounds' && call.padding.length === 4,
  )

const clearCameraCalls = () => {
  theMap().cameraCalls.length = 0
}

let resizeObserver: FakeResizeObserverHandle | null = null

beforeEach(() => {
  sdk.current = createFakeKakaoMaps()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  resizeObserver?.restore()
  resizeObserver = null
  sdk.current = null
})

describe('RecommendMap 지도 이펙트 — 단계 전환과 레이어', () => {
  it('구 단계는 구마다 폴리곤과 이름표를 하나씩 그린다', async () => {
    await renderMap()

    expect(fake().mapInstances).toHaveLength(1)
    expect(fake().livePolygons()).toHaveLength(2)
    expect(livePolygonOf(gangnam).clickable).toBe(true)
    expect(liveLabels().map(label => label.textContent)).toEqual([
      '강남구',
      '서초구',
    ])
  })

  it('단계가 바뀌면 이전 레이어를 걷고 새 단계 레이어를 그린다', async () => {
    const view = await renderMap()
    const districtPolygons = fake().livePolygons()
    const districtPolygon = livePolygonOf(gangnam)

    view.rerender({
      stage: 'administration',
      selectedDistrictCode: gangnam.areaCode,
      administrationAreas: [yeoksam1, yeoksam2],
    })

    // 이전 단계 폴리곤은 전부 지도에서 떼고, 리스너도 걷는다.
    districtPolygons.forEach(polygon => expect(polygon.attached).toBe(false))
    expect(fake().listenerCount(districtPolygon, 'click')).toBe(0)
    expect(fake().listenerCount(districtPolygon, 'mouseover')).toBe(0)

    // 새 단계: 고른 구의 맥락 외곽선 1 + 행정동 2.
    expect(fake().livePolygons()).toHaveLength(3)
    expect(livePolygonOf(gangnam).clickable).toBe(false)
    expect(livePolygonOf(yeoksam1).clickable).toBe(true)
    expect(liveLabels().map(label => label.textContent)).toEqual([
      '역삼1동',
      '역삼2동',
    ])
  })

  it('결과 단계는 행정동 맥락 + 결과 폴리곤·순위 마커를 그린다', async () => {
    await renderMap({
      stage: 'results',
      selectedDistrictCode: gangnam.areaCode,
      selectedAdministrationCode: yeoksam1.areaCode,
      administrationAreas: [yeoksam1, yeoksam2],
      resultAreas: results,
    })

    expect(fake().livePolygons()).toHaveLength(1 + results.length)
    expect(livePolygonOf(yeoksam1).style.fillOpacity).toBe(0)
    expect(liveLabels()).toHaveLength(0)
    expect(
      liveMarkers()
        .map(marker => marker.textContent)
        .sort(),
    ).toEqual(['1', '2', '3'])
  })

  it('의미가 같은 새 배열로는 다시 그리지 않는다', async () => {
    const view = await renderMap()
    const polygonCount = fake().polygons.length
    const overlayCount = fake().overlays.length

    view.rerender({ districtAreas: [{ ...gangnam }, { ...seocho }] })

    expect(fake().polygons).toHaveLength(polygonCount)
    expect(fake().overlays).toHaveLength(overlayCount)
  })

  /*
   * 레이어 이펙트는 `layerSemanticKey` 가 바뀔 때 돌고, 그릴 **값** 은 따로 읽는다.
   * 둘이 한 렌더라도 어긋나면 새 키로 옛 데이터를 그린다 — 여기서 고정한다.
   */
  it('키를 바꾼 그 렌더의 데이터로 그린다 — 키와 값이 어긋나지 않는다', async () => {
    const view = await renderMap()
    const movedSeocho = area(seocho.areaCode, seocho.areaName, [
      [126.98, 37.46],
      [127.0, 37.46],
      [126.99, 37.48],
    ])

    view.rerender({ districtAreas: [gangnam, movedSeocho] })

    expect(livePolygonOf(movedSeocho).attached).toBe(true)
    expect(
      fake()
        .livePolygons()
        .some(polygon => samePath(polygon.path, seocho.boundaryCoords)),
    ).toBe(false)

    // 단계와 데이터가 한 렌더에 같이 바뀌어도 새 단계의 새 데이터로 그린다.
    view.rerender({
      stage: 'commercial',
      selectedDistrictCode: gangnam.areaCode,
      selectedAdministrationCode: yeoksam2.areaCode,
      administrationAreas: [yeoksam1, yeoksam2],
      commercialAreas: [commercialA, commercialB],
    })

    expect(fake().livePolygons()).toHaveLength(3)
    expect(livePolygonOf(yeoksam2).clickable).toBe(false)
    expect(livePolygonOf(commercialA).clickable).toBe(true)
    expect(livePolygonOf(commercialB).clickable).toBe(true)
    expect(liveLabels().map(label => label.textContent)).toEqual([
      '역삼역 상권',
      '선릉역 상권',
    ])
  })
})

describe('RecommendMap 지도 이펙트 — 호버 하이라이트', () => {
  it('폴리곤 호버는 레이어를 다시 그리지 않고 강조만 바꾼다', async () => {
    await renderMap()
    const polygonCount = fake().polygons.length
    const polygon = livePolygonOf(seocho)

    expect(polygon.style.strokeWeight).toBe(WEIGHT.default)

    fire(polygon, 'mouseover')

    expect(polygon.style.strokeWeight).toBe(WEIGHT.hovered)
    expect(fake().polygons).toHaveLength(polygonCount)

    fire(polygon, 'mouseout')

    expect(polygon.style.strokeWeight).toBe(WEIGHT.default)
    expect(fake().polygons).toHaveLength(polygonCount)
  })

  it('이름표 포커스도 같은 호버 강조를 켜고, 버튼을 다시 만들지 않는다', async () => {
    await renderMap()
    const overlayCount = fake().overlays.length
    const label = labelOf(seocho)

    fireDom(label, 'focus')

    expect(livePolygonOf(seocho).style.strokeWeight).toBe(WEIGHT.hovered)
    // 포커스가 있는 버튼이 파괴되면 키보드 사용자가 자리를 잃는다.
    expect(labelOf(seocho)).toBe(label)
    expect(fake().overlays).toHaveLength(overlayCount)
  })

  it('레이어를 다시 그릴 때 지금의 호버를 이어받는다', async () => {
    const view = await renderMap()

    fire(livePolygonOf(seocho), 'mouseover')
    view.rerender({ selectedDistrictCode: gangnam.areaCode })

    // 선택이 바뀌어 새로 그린 폴리곤이 첫 칠부터 호버 상태다.
    expect(livePolygonOf(seocho).style.strokeWeight).toBe(WEIGHT.hovered)
    expect(livePolygonOf(gangnam).style.strokeWeight).toBe(WEIGHT.selected)
  })
})

describe('RecommendMap 지도 이펙트 — 선택과 미리보기', () => {
  const resultsStage: Partial<Props> = {
    stage: 'results',
    selectedDistrictCode: gangnam.areaCode,
    selectedAdministrationCode: yeoksam1.areaCode,
    administrationAreas: [yeoksam1, yeoksam2],
    resultAreas: results,
  }

  it('결과 레이어를 그릴 때 지금의 선택·미리보기를 반영한다', async () => {
    await renderMap({
      ...resultsStage,
      selectedCommercialCode: 'R1',
      previewedCommercialCode: 'R2',
    })

    expect(markerOf(1).getAttribute('aria-pressed')).toBe('true')
    expect(markerOf(2).getAttribute('data-previewed')).toBe('true')
    expect(markerOf(3).getAttribute('aria-pressed')).toBe('false')
    expect(markerOf(3).getAttribute('data-previewed')).toBe('false')
    expect(livePolygonOf(results[0]).style.strokeWeight).toBe(WEIGHT.selected)
    expect(livePolygonOf(results[1]).style.strokeWeight).toBe(WEIGHT.hovered)
  })

  it('결과 단계의 선택·미리보기 변화는 오버레이를 다시 만들지 않고 표시만 바꾼다', async () => {
    const view = await renderMap({
      ...resultsStage,
      selectedCommercialCode: 'R1',
    })
    const polygonCount = fake().polygons.length
    const overlayCount = fake().overlays.length

    view.rerender({
      selectedCommercialCode: 'R3',
      previewedCommercialCode: 'R2',
    })

    expect(fake().polygons).toHaveLength(polygonCount)
    expect(fake().overlays).toHaveLength(overlayCount)
    expect(markerOf(1).getAttribute('aria-pressed')).toBe('false')
    expect(markerOf(3).getAttribute('aria-pressed')).toBe('true')
    expect(markerOf(2).getAttribute('data-previewed')).toBe('true')
    // 선택이 맨 위, 미리보기가 그다음이다.
    const [r1, r2, r3] = results.map(livePolygonOf)
    expect(r3.zIndex).toBeGreaterThan(r2.zIndex)
    expect(r2.zIndex).toBeGreaterThan(r1.zIndex)
  })

  it('상권 단계는 지금 고른 상권을 선택 상태로 그린다', async () => {
    await renderMap({
      stage: 'commercial',
      selectedDistrictCode: gangnam.areaCode,
      selectedAdministrationCode: yeoksam1.areaCode,
      administrationAreas: [yeoksam1, yeoksam2],
      commercialAreas: [commercialA, commercialB],
      selectedCommercialCode: commercialB.areaCode,
    })

    expect(livePolygonOf(commercialB).style.strokeWeight).toBe(WEIGHT.selected)
    expect(labelOf(commercialB).getAttribute('aria-pressed')).toBe('true')
    expect(labelOf(commercialA).getAttribute('aria-pressed')).toBe('false')
  })

  /*
   * 마운트 때 그리는 것만 보면 초깃값과 최신값이 같아 구분되지 않는다. 선택이 바뀐
   * **뒤에** 다른 이유로 레이어를 다시 그려야, 그리기가 최신 선택을 읽는지 드러난다.
   */
  it('선택이 바뀐 뒤 결과를 다시 그려도 지금의 선택·미리보기를 유지한다', async () => {
    const view = await renderMap({
      ...resultsStage,
      selectedCommercialCode: 'R1',
    })

    view.rerender({
      selectedCommercialCode: 'R3',
      previewedCommercialCode: 'R2',
    })
    const overlayCount = fake().overlays.length
    // 결과 이름이 바뀌면 의미 키가 바뀌어 레이어를 통째로 다시 그린다.
    view.rerender({
      resultAreas: results.map(item => ({
        ...item,
        commercialName: `${item.commercialName}(갱신)`,
      })),
    })

    expect(fake().overlays.length).toBeGreaterThan(overlayCount)
    expect(markerOf(3).getAttribute('aria-pressed')).toBe('true')
    expect(markerOf(1).getAttribute('aria-pressed')).toBe('false')
    expect(markerOf(2).getAttribute('data-previewed')).toBe('true')
  })

  it('선택이 바뀐 뒤 상권 레이어를 다시 그리면 지금 고른 상권을 선택 상태로 그린다', async () => {
    const view = await renderMap({
      stage: 'commercial',
      selectedDistrictCode: gangnam.areaCode,
      selectedAdministrationCode: yeoksam1.areaCode,
      administrationAreas: [yeoksam1, yeoksam2],
      commercialAreas: [commercialA, commercialB],
      selectedCommercialCode: commercialA.areaCode,
    })

    // 상권 단계의 의미 키에는 선택 상권이 없다 — 이 렌더만으로는 다시 그리지 않는다.
    view.rerender({ selectedCommercialCode: commercialB.areaCode })
    // 미리보기는 키에 있으므로 이 렌더가 레이어를 다시 그린다.
    view.rerender({ previewedCommercialCode: commercialA.areaCode })

    expect(livePolygonOf(commercialB).style.strokeWeight).toBe(WEIGHT.selected)
    expect(labelOf(commercialB).getAttribute('aria-pressed')).toBe('true')
    expect(labelOf(commercialA).getAttribute('aria-pressed')).toBe('false')
  })

  it('순위 마커 클릭은 미리보기 → 선택 순으로 올리고 지도 배경 클릭을 막는다', async () => {
    const view = await renderMap(resultsStage)
    const order: string[] = []
    vi.mocked(view.props.onCommercialPreviewChange!).mockImplementation(code =>
      order.push(`preview:${code}`),
    )
    vi.mocked(view.props.onCommercialSelect).mockImplementation(code =>
      order.push(`select:${code}`),
    )

    fireDom(markerOf(2), 'click')
    fire(theMap(), 'click')

    expect(order).toEqual(['preview:R2', 'select:R2'])
    expect(fake().preventMapCount).toBe(1)
    expect(view.props.onBackgroundClick).not.toHaveBeenCalled()
  })

  it('결과 폴리곤 호버는 미리보기를 켜고 끈다', async () => {
    const view = await renderMap(resultsStage)
    const polygon = livePolygonOf(results[2])

    fire(polygon, 'mouseover')
    fire(polygon, 'mouseout')

    expect(view.props.onCommercialPreviewChange).toHaveBeenNthCalledWith(
      1,
      'R3',
    )
    expect(view.props.onCommercialPreviewChange).toHaveBeenNthCalledWith(
      2,
      null,
    )
  })
})

describe('RecommendMap 지도 이펙트 — 카메라', () => {
  it('아무것도 고르지 않았으면 서울 기본 카메라로 맞춘다', async () => {
    await renderMap()

    expect(theMap().cameraCalls).toEqual([
      { type: 'setCenter', lat: 37.5665, lng: 126.978 },
      { type: 'setLevel', level: 8 },
    ])
  })

  it('고른 구로 맞추고, 타깃이 같으면 다시 맞추지 않는다', async () => {
    const view = await renderMap()
    clearCameraCalls()

    view.rerender({ selectedDistrictCode: gangnam.areaCode })

    const fits = paddedFits(theMap().cameraCalls)
    expect(fits).toHaveLength(1)
    expect(fits[0].points).toEqual(toPoints(gangnam.boundaryCoords))

    clearCameraCalls()
    view.rerender(freshCallbacks())

    expect(theMap().cameraCalls).toEqual([])
  })

  it('결과가 오면 결과 전체로, 직접 고르면 그 상권으로 맞춘다', async () => {
    const view = await renderMap({
      stage: 'results',
      selectedDistrictCode: gangnam.areaCode,
      selectedAdministrationCode: yeoksam1.areaCode,
      administrationAreas: [yeoksam1, yeoksam2],
      resultAreas: results,
      selectedCommercialCode: 'R1',
    })
    const [allFit] = paddedFits(theMap().cameraCalls).slice(-1)
    expect(allFit.points).toEqual(
      results.flatMap(item => toPoints(item.boundaryCoords)),
    )

    clearCameraCalls()
    view.rerender({
      selectedCommercialCode: 'R2',
      isResultSelectionExplicit: true,
    })

    const fits = paddedFits(theMap().cameraCalls)
    expect(fits).toHaveLength(1)
    expect(fits[0].points).toEqual(toPoints(results[1].boundaryCoords))
  })

  it('링크 카메라 모드는 자동 맞춤을 잠그고, 되돌리기는 원래 타깃으로 즉시 맞춘다', async () => {
    const view = await renderMap({
      cameraMode: 'url',
      initialCamera: { lat: 37.51, lng: 127.04, level: 5 },
    })

    expect(theMap().cameraCalls).toEqual([])
    expect(theMap().getLevel()).toBe(5)

    /*
     * 잠긴 동안 선택이 바뀌어도 카메라 이펙트는 맞추지 않는다. 패딩 없는 `setBounds` 는
     * 구 폴리곤 레이어(`drawAreaPolygonLayer` 의 fitToSelected)가 거는 것이라 세지 않는다.
     */
    view.rerender({ selectedDistrictCode: seocho.areaCode })
    expect(paddedFits(theMap().cameraCalls)).toEqual([])

    clearCameraCalls()
    act(() => recenterButton().click())

    const fits = paddedFits(theMap().cameraCalls)
    expect(fits).toHaveLength(1)
    expect(fits[0].points).toEqual(toPoints(seocho.boundaryCoords))
    expect(view.props.onRecenter).toHaveBeenCalledTimes(1)
  })

  it('되돌리기는 지금 렌더의 선택을 타깃으로 쓴다', async () => {
    const view = await renderMap({ cameraMode: 'url' })

    view.rerender({ selectedDistrictCode: seocho.areaCode })
    clearCameraCalls()
    act(() => recenterButton().click())

    const fits = paddedFits(theMap().cameraCalls)
    expect(fits).toHaveLength(1)
    expect(fits[0].points).toEqual(toPoints(seocho.boundaryCoords))
  })

  it('되돌릴 타깃이 keep 이면 아무 일도 하지 않는다', async () => {
    const view = await renderMap({
      stage: 'results',
      selectedDistrictCode: gangnam.areaCode,
      selectedAdministrationCode: yeoksam1.areaCode,
      administrationAreas: [yeoksam1, yeoksam2],
      resultAreas: [],
      isResultsLoading: true,
      cameraMode: 'url',
    })
    clearCameraCalls()

    act(() => recenterButton().click())

    expect(theMap().cameraCalls).toEqual([])
    expect(view.props.onRecenter).not.toHaveBeenCalled()
  })

  it('창 크기가 바뀌면 relayout 하고 최신 타깃으로 다시 맞춘다', async () => {
    resizeObserver = stubResizeObserver()
    const view = await renderMap()
    expect(resizeObserver.activeCount).toBe(1)

    view.rerender({ selectedDistrictCode: seocho.areaCode })
    clearCameraCalls()
    act(() => resizeObserver?.resize())

    expect(theMap().relayoutCount).toBe(1)
    const fits = paddedFits(theMap().cameraCalls)
    expect(fits).toHaveLength(1)
    expect(fits[0].points).toEqual(toPoints(seocho.boundaryCoords))
  })

  it('링크 카메라 모드에서는 창 크기가 바뀌어도 화면을 옮기지 않는다', async () => {
    resizeObserver = stubResizeObserver()
    await renderMap({
      cameraMode: 'url',
      selectedDistrictCode: seocho.areaCode,
    })
    clearCameraCalls()

    act(() => resizeObserver?.resize())

    expect(theMap().relayoutCount).toBe(1)
    expect(theMap().cameraCalls).toEqual([])
  })
})

describe('RecommendMap 지도 이펙트 — viewport 디바운스', () => {
  it('idle 이 멈추고 300ms 뒤에 카메라와 bounds 를 한 번 올린다', async () => {
    const view = await renderMap()
    vi.useFakeTimers()

    fire(theMap(), 'idle')
    vi.advanceTimersByTime(200)
    fire(theMap(), 'idle')
    vi.advanceTimersByTime(299)

    expect(view.props.onCameraSettle).not.toHaveBeenCalled()
    expect(view.props.onViewportBoundsChange).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)

    expect(view.props.onCameraSettle).toHaveBeenCalledTimes(1)
    expect(view.props.onCameraSettle).toHaveBeenCalledWith({
      lat: 37.5665,
      lng: 126.978,
      level: 8,
    })
    expect(view.props.onViewportBoundsChange).toHaveBeenCalledTimes(1)
  })

  it('bounds 가 같으면 카메라만 올리고, 달라지면 bounds 도 올린다', async () => {
    const view = await renderMap()
    vi.useFakeTimers()

    fire(theMap(), 'idle')
    vi.advanceTimersByTime(300)
    fire(theMap(), 'idle')
    vi.advanceTimersByTime(300)

    expect(view.props.onCameraSettle).toHaveBeenCalledTimes(2)
    expect(view.props.onViewportBoundsChange).toHaveBeenCalledTimes(1)

    theMap().moveViewport(
      {
        center: { lat: 37.5, lng: 127.0 },
        sw: { lat: 37.45, lng: 126.95 },
        ne: { lat: 37.55, lng: 127.05 },
      },
      6,
    )
    fire(theMap(), 'idle')
    vi.advanceTimersByTime(300)

    expect(view.props.onCameraSettle).toHaveBeenLastCalledWith({
      lat: 37.5,
      lng: 127.0,
      level: 6,
    })
    expect(view.props.onViewportBoundsChange).toHaveBeenCalledTimes(2)
    expect(view.props.onViewportBoundsChange).toHaveBeenLastCalledWith({
      lngSW: 126.95,
      latSW: 37.45,
      lngNE: 127.05,
      latNE: 37.55,
    })
  })

  it('언마운트하면 대기 중인 디바운스를 버린다', async () => {
    const view = await renderMap()
    vi.useFakeTimers()

    fire(theMap(), 'idle')
    cleanup()
    vi.advanceTimersByTime(300)

    expect(view.props.onCameraSettle).not.toHaveBeenCalled()
    expect(fake().listenerCount(theMap(), 'idle')).toBe(0)
    expect(fake().listenerCount(theMap(), 'click')).toBe(0)
  })
})

describe('RecommendMap 지도 이펙트 — 핸들러 수명', () => {
  it('콜백 prop 이 바뀌어도 지도 리스너·폴리곤·오버레이를 다시 만들지 않는다', async () => {
    const view = await renderMap({
      stage: 'results',
      selectedDistrictCode: gangnam.areaCode,
      selectedAdministrationCode: yeoksam1.areaCode,
      administrationAreas: [yeoksam1, yeoksam2],
      resultAreas: results,
    })
    const polygonCount = fake().polygons.length
    const overlayCount = fake().overlays.length

    view.rerender(freshCallbacks())
    view.rerender(freshCallbacks())

    expect(fake().mapInstances).toHaveLength(1)
    expect(fake().listenerCount(theMap(), 'click')).toBe(1)
    expect(fake().listenerCount(theMap(), 'idle')).toBe(1)
    expect(fake().polygons).toHaveLength(polygonCount)
    expect(fake().overlays).toHaveLength(overlayCount)
  })

  it('오래 사는 지도 핸들러가 최신 콜백을 부른다', async () => {
    const view = await renderMap()
    const first = view.props
    vi.useFakeTimers()

    view.rerender(freshCallbacks())
    const latest = view.props

    fire(theMap(), 'click')
    fire(theMap(), 'idle')
    vi.advanceTimersByTime(300)

    expect(latest.onBackgroundClick).toHaveBeenCalledTimes(1)
    expect(latest.onCameraSettle).toHaveBeenCalledTimes(1)
    expect(latest.onViewportBoundsChange).toHaveBeenCalledTimes(1)
    expect(first.onBackgroundClick).not.toHaveBeenCalled()
    expect(first.onCameraSettle).not.toHaveBeenCalled()
    expect(first.onViewportBoundsChange).not.toHaveBeenCalled()
  })

  it('오래 사는 단계 레이어 핸들러가 최신 선택 콜백을 부른다', async () => {
    const view = await renderMap({
      stage: 'administration',
      selectedDistrictCode: gangnam.areaCode,
      administrationAreas: [yeoksam1, yeoksam2],
    })
    const first = view.props
    const polygon = livePolygonOf(yeoksam2)

    view.rerender(freshCallbacks())
    // 다시 그리지 않았으니 같은 폴리곤이다.
    expect(livePolygonOf(yeoksam2)).toBe(polygon)

    fire(polygon, 'click')
    fireDom(labelOf(yeoksam1), 'click')

    expect(view.props.onAdministrationSelect).toHaveBeenNthCalledWith(
      1,
      yeoksam2.areaCode,
    )
    expect(view.props.onAdministrationSelect).toHaveBeenNthCalledWith(
      2,
      yeoksam1.areaCode,
    )
    expect(first.onAdministrationSelect).not.toHaveBeenCalled()
  })

  it('오래 사는 구·상권 레이어 핸들러도 최신 콜백을 부른다', async () => {
    const view = await renderMap()
    view.rerender(freshCallbacks())
    fire(livePolygonOf(gangnam), 'click')
    expect(view.props.onDistrictSelect).toHaveBeenCalledWith(gangnam.areaCode)

    view.rerender({
      stage: 'commercial',
      selectedDistrictCode: gangnam.areaCode,
      selectedAdministrationCode: yeoksam1.areaCode,
      administrationAreas: [yeoksam1, yeoksam2],
      commercialAreas: [commercialA, commercialB],
    })
    view.rerender(freshCallbacks())
    fire(livePolygonOf(commercialA), 'click')
    expect(view.props.onCommercialSelect).toHaveBeenCalledWith(
      commercialA.areaCode,
    )
  })

  it('오래 사는 결과 레이어 핸들러가 최신 콜백을 부른다', async () => {
    const view = await renderMap({
      stage: 'results',
      selectedDistrictCode: gangnam.areaCode,
      selectedAdministrationCode: yeoksam1.areaCode,
      administrationAreas: [yeoksam1, yeoksam2],
      resultAreas: results,
    })
    const first = view.props

    view.rerender(freshCallbacks())
    const latest = view.props

    fireDom(markerOf(1), 'click')
    fireDom(markerOf(2), 'pointerenter')
    fireDom(markerOf(2), 'pointerleave')
    fire(livePolygonOf(results[2]), 'click')

    expect(latest.onCommercialSelect).toHaveBeenNthCalledWith(1, 'R1')
    expect(latest.onCommercialSelect).toHaveBeenNthCalledWith(2, 'R3')
    expect(latest.onCommercialPreviewChange).toHaveBeenNthCalledWith(1, 'R1')
    expect(latest.onCommercialPreviewChange).toHaveBeenNthCalledWith(2, 'R2')
    expect(latest.onCommercialPreviewChange).toHaveBeenNthCalledWith(3, null)
    expect(first.onCommercialSelect).not.toHaveBeenCalled()
    expect(first.onCommercialPreviewChange).not.toHaveBeenCalled()
  })

  /*
   * 가드를 켜는 것은 이름표·결과 폴리곤·순위 마커다. 단계 폴리곤(`drawAreaPolygonLayer`)
   * 은 가드를 부르지 않는다 — 여기서는 있는 그대로 이름표로 본다.
   */
  it('이름표 클릭과 같은 턴의 지도 클릭은 배경 클릭으로 올리지 않는다', async () => {
    const view = await renderMap()

    act(() => {
      labelOf(gangnam).dispatchEvent(new Event('click', { bubbles: true }))
      fake().trigger(theMap(), 'click')
    })
    expect(view.props.onBackgroundClick).not.toHaveBeenCalled()

    // 다음 턴의 배경 클릭은 다시 올린다.
    await act(async () => {
      await Promise.resolve()
    })
    fire(theMap(), 'click')
    expect(view.props.onBackgroundClick).toHaveBeenCalledTimes(1)
  })

  it('StrictMode 에서도 지도는 하나, 지도 리스너는 종류별로 하나다', async () => {
    await renderMap({}, { strict: true })

    expect(fake().mapInstances).toHaveLength(1)
    expect(fake().listenerCount(theMap(), 'click')).toBe(1)
    expect(fake().listenerCount(theMap(), 'idle')).toBe(1)
    expect(fake().livePolygons()).toHaveLength(2)
    expect(liveLabels()).toHaveLength(2)
  })
})
