// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AREA_LABEL_CLASS_NAME,
  drawAreaLabelLayer,
} from '@/lib/map/draw-area-label-layer'
import {
  createFakeKakaoMaps,
  type FakeKakaoMaps,
  type FakeMapInstance,
  type FakeOverlay,
} from '@/test/fake-kakao-maps'
import type { AreaBoundaryItem } from '@/types/recommend'

/** 한 변이 `side`° 인 정사각형 상권. 중심은 정사각형 가운데다. */
const area = (
  areaCode: string,
  areaName: string,
  centerLng: number,
  side: number,
): AreaBoundaryItem => {
  const lat = 37.55
  const half = side / 2
  return {
    areaCode,
    areaName,
    centerLng,
    centerLat: lat,
    boundaryCoords: [
      [centerLng - half, lat - half],
      [centerLng + half, lat - half],
      [centerLng + half, lat + half],
      [centerLng - half, lat + half],
    ],
  }
}

// 가짜 투영 level 3 에서 경도 0.0001° ≈ 9px. 라벨 폭은 근사치(한글 5자 ≈ 75px)다.
const big = area('BIG', '큰상권이름', 126.92, 0.004)
const smallNear = area('SMALL', '작은상권명', 126.92025, 0.001) // 약 22px 옆 → 겹친다
const far = area('FAR', '먼상권이름', 126.93, 0.001) // 약 890px 옆

let fake: FakeKakaoMaps
let map: FakeMapInstance

const labelOf = (name: string): FakeOverlay => {
  const found = fake.overlays.find(overlay => {
    const node = overlay.content as HTMLButtonElement
    return node.getAttribute('aria-label') === `${name} 선택`
  })
  if (!found) throw new Error(`no overlay for ${name}`)
  return found
}

const byName = (item: AreaBoundaryItem) => labelOf(item.areaName)

const draw = (
  areas: AreaBoundaryItem[],
  overrides: Partial<Parameters<typeof drawAreaLabelLayer>[0]> = {},
) =>
  drawAreaLabelLayer({
    map,
    maps: fake.maps,
    areas,
    selectedCode: null,
    previewedCode: null,
    onSelect: vi.fn(),
    onPreviewChange: vi.fn(),
    collide: true,
    ...overrides,
  })

beforeEach(() => {
  fake = createFakeKakaoMaps()
  map = new fake.maps.Map(document.createElement('div'), {
    center: new fake.maps.LatLng(37.55, 126.92),
    level: 3,
  }) as FakeMapInstance
})

describe('drawAreaLabelLayer — 겹치는 라벨 숨김(#602)', () => {
  it('겹치면 면적이 큰 상권만 남기고, 떨어진 라벨은 그대로 둔다', () => {
    draw([smallNear, big, far])

    expect(byName(big).attached).toBe(true)
    expect(byName(far).attached).toBe(true)
    expect(byName(smallNear).attached).toBe(false)
  })

  it('선택된 상권은 작아도 남고, 겹친 큰 상권이 숨는다', () => {
    draw([smallNear, big, far], { selectedCode: 'SMALL' })

    expect(byName(smallNear).attached).toBe(true)
    expect(byName(big).attached).toBe(false)
  })

  it('호출부 순위(priorityByCode)가 면적보다 앞선다', () => {
    draw([smallNear, big], { priorityByCode: new Map([['SMALL', 1]]) })

    expect(byName(smallNear).attached).toBe(true)
    expect(byName(big).attached).toBe(false)
  })

  it('숨은 라벨도 그 상권을 미리보기(호버·포커스)하면 떴다가, 미리보기가 끝나면 다시 숨는다', () => {
    const handle = draw([smallNear, big])

    handle.setHighlight({ selectedCode: null, previewedCode: 'SMALL' })
    expect(byName(smallNear).attached).toBe(true)
    expect(byName(big).attached).toBe(true)
    expect(byName(smallNear).zIndex).toBeGreaterThan(byName(big).zIndex)

    handle.setHighlight({ selectedCode: null, previewedCode: null })
    expect(byName(smallNear).attached).toBe(false)
  })

  it('줌인(zoom_changed)에서 다시 계산해 숨었던 라벨을 되살린다', () => {
    draw([smallNear, big])
    expect(byName(smallNear).attached).toBe(false)

    // level 1 이면 축척이 4배 — 두 중심이 약 89px 떨어져 근사 폭 + 여백(79px)보다 멀다.
    map.setLevel(1)
    fake.trigger(map, 'zoom_changed')

    expect(byName(smallNear).attached).toBe(true)
    expect(byName(big).attached).toBe(true)
  })

  it('팬(idle)이나 레벨이 그대로인 이벤트로는 다시 계산하지 않는다 — 깜빡임 방지', () => {
    draw([smallNear, big])
    const projection = vi.spyOn(map, 'getProjection')

    fake.trigger(map, 'idle')
    fake.trigger(map, 'zoom_changed')

    expect(projection).not.toHaveBeenCalled()
    expect(fake.listenerCount(map, 'idle')).toBe(0)
  })

  it('우선순위가 높을수록 위에 쌓이고, 선택 라벨은 그 모두보다 위다', () => {
    const many = Array.from({ length: 150 }, (_, index) =>
      area(`A${index}`, `상권${index}`, 126.9 + index * 0.01, 0.001),
    )
    draw([...many, big], { selectedCode: 'A149' })

    const selected = labelOf('상권149')
    const others = fake.overlays.filter(overlay => overlay !== selected)
    expect(byName(big).zIndex).toBeGreaterThan(labelOf('상권0').zIndex)
    // 예전에는 강조 z 가 200 고정이라 101번째 라벨부터 강조 라벨을 덮었다.
    expect(Math.max(...others.map(overlay => overlay.zIndex))).toBeLessThan(
      selected.zIndex,
    )
  })

  it('정리하면 줌 리스너를 떼고 모든 라벨을 지도에서 내린다', () => {
    const handle = draw([smallNear, big, far])
    expect(fake.listenerCount(map, 'zoom_changed')).toBe(1)

    handle.cleanup()

    expect(fake.listenerCount(map, 'zoom_changed')).toBe(0)
    expect(fake.liveOverlays()).toHaveLength(0)
  })

  it('collide 를 끄면(자치구·행정동 단계) 겹쳐도 전부 붙어 있고 줌 리스너도 달지 않는다', () => {
    draw([smallNear, big, far], { collide: false })

    expect(byName(smallNear).attached).toBe(true)
    expect(byName(big).attached).toBe(true)
    expect(byName(far).attached).toBe(true)
    expect(fake.listenerCount(map, 'zoom_changed')).toBe(0)
  })

  it('collide 는 기본값이 꺼져 있다', () => {
    drawAreaLabelLayer({
      map,
      maps: fake.maps,
      areas: [smallNear, big],
      selectedCode: null,
      previewedCode: null,
      onSelect: vi.fn(),
      onPreviewChange: vi.fn(),
    })

    expect(byName(smallNear).attached).toBe(true)
  })

  it('포커스를 가진 라벨은 미리보기가 풀려도 숨기지 않는다', () => {
    const handle = draw([smallNear, big])
    handle.setHighlight({ selectedCode: null, previewedCode: 'SMALL' })
    const node = byName(smallNear).content as HTMLButtonElement
    document.body.appendChild(node)
    node.focus()

    // 포인터가 다른 폴리곤을 지나가 미리보기가 다른 곳으로 옮겨 가도
    handle.setHighlight({ selectedCode: null, previewedCode: 'BIG' })
    expect(byName(smallNear).attached).toBe(true)

    // 포커스가 떠나면 다음 동기화에서 숨는다.
    node.blur()
    handle.setHighlight({ selectedCode: null, previewedCode: null })
    expect(byName(smallNear).attached).toBe(false)
    node.remove()
  })

  describe('폴리곤 → 떠오른 라벨로 포인터를 옮겨도 깜빡이지 않는다', () => {
    beforeEach(() => {
      vi.useFakeTimers({
        toFake: [
          'requestAnimationFrame',
          'cancelAnimationFrame',
          'setTimeout',
          'clearTimeout',
        ],
      })
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    const fireDom = (node: Node, type: string) =>
      node.dispatchEvent(new Event(type))

    it('라벨 pointerenter 뒤에 폴리곤 mouseout(미리보기 null)이 와도 라벨은 붙어 있다', () => {
      const onPreviewChange = vi.fn()
      const handle = draw([smallNear, big], { onPreviewChange })
      // 폴리곤 hover 로 숨은 라벨이 떴다.
      handle.setHighlight({ selectedCode: null, previewedCode: 'SMALL' })
      const node = byName(smallNear).content

      // 실제 브라우저 순서: 라벨 pointerenter → 폴리곤 mouseout.
      fireDom(node, 'pointerenter')
      expect(onPreviewChange).toHaveBeenLastCalledWith('SMALL')
      handle.setHighlight({ selectedCode: null, previewedCode: null })

      expect(byName(smallNear).attached).toBe(true)
      // 겹친 이웃(BIG)보다 위에 남아야 이웃이 포인터를 덮어 가져가지 않는다.
      expect(byName(smallNear).zIndex).toBeGreaterThan(byName(big).zIndex)
    })

    it('라벨에서 자기 폴리곤으로 내려오면(pointerleave → 폴리곤 mouseover) 한 번도 떨어지지 않는다', () => {
      const handle = draw([smallNear, big])
      handle.setHighlight({ selectedCode: null, previewedCode: 'SMALL' })
      const node = byName(smallNear).content
      fireDom(node, 'pointerenter')
      const detach = vi.spyOn(byName(smallNear), 'setMap')

      fireDom(node, 'pointerleave')
      handle.setHighlight({ selectedCode: null, previewedCode: null })
      handle.setHighlight({ selectedCode: null, previewedCode: 'SMALL' })
      vi.advanceTimersByTime(50)

      expect(detach).not.toHaveBeenCalled()
      expect(byName(smallNear).attached).toBe(true)
    })

    it('라벨에서 지도 빈 곳으로 나가면 다음 프레임에 숨는다', () => {
      const handle = draw([smallNear, big])
      handle.setHighlight({ selectedCode: null, previewedCode: 'SMALL' })
      const node = byName(smallNear).content
      fireDom(node, 'pointerenter')

      fireDom(node, 'pointerleave')
      handle.setHighlight({ selectedCode: null, previewedCode: null })
      expect(byName(smallNear).attached).toBe(true)

      vi.advanceTimersByTime(50)
      expect(byName(smallNear).attached).toBe(false)
    })

    it('나간 그 프레임 안에 다시 들어오면 숨기기 예약을 취소한다', () => {
      const handle = draw([smallNear, big])
      handle.setHighlight({ selectedCode: null, previewedCode: 'SMALL' })
      const node = byName(smallNear).content
      fireDom(node, 'pointerenter')

      fireDom(node, 'pointerleave')
      handle.setHighlight({ selectedCode: null, previewedCode: null })
      fireDom(node, 'pointerenter')
      vi.advanceTimersByTime(50)

      expect(byName(smallNear).attached).toBe(true)
    })

    it('정리하면 예약된 숨기기도 취소한다', () => {
      const handle = draw([smallNear, big])
      const node = byName(smallNear).content
      handle.setHighlight({ selectedCode: null, previewedCode: 'SMALL' })
      fireDom(node, 'pointerenter')
      fireDom(node, 'pointerleave')

      handle.cleanup()
      expect(() => vi.advanceTimersByTime(50)).not.toThrow()
      expect(vi.getTimerCount()).toBe(0)
    })
  })

  it('라벨은 공용 클래스를 쓰는 버튼이다', () => {
    draw([big])
    const node = byName(big).content as HTMLButtonElement
    expect(node.tagName).toBe('BUTTON')
    expect(node.className).toBe(AREA_LABEL_CLASS_NAME)
    expect(node.getAttribute('aria-pressed')).toBe('false')
  })
})
