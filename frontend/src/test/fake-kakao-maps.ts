/**
 * 테스트 전용 **가짜 카카오 지도 SDK**. jsdom 에서 지도 컴포넌트의 이펙트를 실제로
 * 돌려 보려고 만든다 — 실제 SDK 는 네트워크 스크립트라 테스트에서도, 브라우저
 * 페인에서도 뜨지 않는다(map-shell.md D6).
 *
 * `src/types/kakao-map.d.ts` 가 선언한 표면만 구현한다. 그리지 않고 **기록한다**:
 * 만들어진 폴리곤·오버레이, 붙은/떨어진 이벤트 리스너, 카메라 호출. 테스트는 이
 * 기록으로 「다시 만들었는가」「어느 콜백이 불렸는가」「카메라가 어디로 갔는가」를
 * 단언한다.
 *
 * 쓰는 법(로더 목은 테스트 파일에서 해야 한다 — `vi.mock` 은 호이스팅된다):
 *
 * ```ts
 * const { sdk } = vi.hoisted(() => ({ sdk: { current: null as FakeKakaoMaps | null } }))
 * vi.mock('@/lib/kakao-map', () => ({
 *   loadKakaoMapSdk: vi.fn(() => Promise.resolve(sdk.current!.maps)),
 * }))
 * beforeEach(() => { sdk.current = createFakeKakaoMaps() })
 *
 * // SDK 가 붙는 렌더는 async act 안에서 받는다. `waitFor` 로 DOM 만 기다리면
 * // 그 커밋의 이펙트(레이어 그리기)가 아직 안 돈 채로 단언하는 경합이 생긴다.
 * const view = await act(async () => render(createElement(RecommendMap, props)))
 * ```
 *
 * 한계: 실제 렌더링·타일·투영이 없다. `setBounds` 는 기록만 하고 중심·레벨을 바꾸지
 * 않으며, `idle` 은 SDK 가 스스로 내지 않는다 — `trigger(map, 'idle')` 로 직접 낸다.
 */

type KakaoEventType = 'click' | 'idle' | 'mouseover' | 'mouseout'
type Handler = () => void

export type FakePoint = { lat: number; lng: number }

export type FakeCameraCall =
  | { type: 'setCenter'; lat: number; lng: number }
  | { type: 'setLevel'; level: number }
  | {
      type: 'setBounds'
      points: FakePoint[]
      /** 카카오 기본 여백을 쓰면 비어 있다. */
      padding: number[]
    }

export type FakeViewport = { center: FakePoint; sw: FakePoint; ne: FakePoint }

class FakeLatLng implements KakaoMapLatLng {
  constructor(
    readonly lat: number,
    readonly lng: number,
  ) {}

  getLat() {
    return this.lat
  }

  getLng() {
    return this.lng
  }
}

class FakeLatLngBounds implements KakaoMapLatLngBounds {
  readonly points: FakePoint[] = []

  extend(position: KakaoMapLatLng) {
    this.points.push({ lat: position.getLat(), lng: position.getLng() })
  }

  getSouthWest() {
    return new FakeLatLng(
      Math.min(...this.points.map(point => point.lat)),
      Math.min(...this.points.map(point => point.lng)),
    )
  }

  getNorthEast() {
    return new FakeLatLng(
      Math.max(...this.points.map(point => point.lat)),
      Math.max(...this.points.map(point => point.lng)),
    )
  }
}

export type FakeMapInstance = KakaoMapInstance & {
  readonly container: HTMLElement
  readonly cameraCalls: FakeCameraCall[]
  readonly relayoutCount: number
  /** 사용자가 지도를 옮긴 것처럼 화면을 바꾼다. 리스너는 부르지 않는다. */
  moveViewport(viewport: FakeViewport, level?: number): void
}

export type FakePolygon = KakaoMapPolygon & {
  readonly path: FakePoint[]
  readonly style: {
    strokeColor?: string
    strokeWeight?: number
    strokeOpacity?: number
    fillColor?: string
    fillOpacity?: number
  }
  readonly zIndex: number
  readonly clickable: boolean
  /** `setMap(null)` 전이면 지도 위에 있다. */
  readonly attached: boolean
}

export type FakeOverlay = KakaoMapCustomOverlay & {
  readonly content: Node
  readonly position: FakePoint
  readonly zIndex: number
  readonly attached: boolean
}

export type FakeKakaoMaps = {
  maps: KakaoMapsNamespace
  /** `new maps.Map` 으로 만들어진 지도들. 재시도·StrictMode 에서도 1개여야 정상이다. */
  readonly mapInstances: FakeMapInstance[]
  /** 지금까지 만들어진 **모든** 폴리곤(떼어 낸 것 포함). 재생성 여부는 길이로 본다. */
  readonly polygons: FakePolygon[]
  /** 지금까지 만들어진 **모든** 커스텀 오버레이(떼어 낸 것 포함). */
  readonly overlays: FakeOverlay[]
  livePolygons(): FakePolygon[]
  liveOverlays(): FakeOverlay[]
  /** SDK 이벤트를 낸다. 붙어 있는 리스너만 불린다. */
  trigger(target: object, type: KakaoEventType): void
  listenerCount(target: object, type: KakaoEventType): number
  /** `maps.event.preventMap()` 호출 횟수. */
  readonly preventMapCount: number
}

const DEFAULT_LEVEL = 3
const DEFAULT_VIEWPORT_HALF_SPAN = 0.02

export const createFakeKakaoMaps = (): FakeKakaoMaps => {
  const listeners = new Map<object, Map<KakaoEventType, Set<Handler>>>()
  const mapInstances: FakeMapInstance[] = []
  const polygons: FakePolygon[] = []
  const overlays: FakeOverlay[] = []
  let preventMapCount = 0

  const handlersOf = (target: object, type: KakaoEventType): Set<Handler> => {
    let byType = listeners.get(target)
    if (!byType) {
      byType = new Map()
      listeners.set(target, byType)
    }
    let handlers = byType.get(type)
    if (!handlers) {
      handlers = new Set()
      byType.set(type, handlers)
    }
    return handlers
  }

  class FakeMap implements FakeMapInstance {
    readonly cameraCalls: FakeCameraCall[] = []
    relayoutCount = 0
    private center: FakePoint
    private level: number
    private viewport: FakeViewport

    constructor(
      readonly container: HTMLElement,
      options: { center: KakaoMapLatLng; level?: number },
    ) {
      this.center = {
        lat: options.center.getLat(),
        lng: options.center.getLng(),
      }
      this.level = options.level ?? DEFAULT_LEVEL
      this.viewport = {
        center: this.center,
        sw: {
          lat: this.center.lat - DEFAULT_VIEWPORT_HALF_SPAN,
          lng: this.center.lng - DEFAULT_VIEWPORT_HALF_SPAN,
        },
        ne: {
          lat: this.center.lat + DEFAULT_VIEWPORT_HALF_SPAN,
          lng: this.center.lng + DEFAULT_VIEWPORT_HALF_SPAN,
        },
      }
      mapInstances.push(this)
    }

    getBounds() {
      const bounds = new FakeLatLngBounds()
      bounds.extend(new FakeLatLng(this.viewport.sw.lat, this.viewport.sw.lng))
      bounds.extend(new FakeLatLng(this.viewport.ne.lat, this.viewport.ne.lng))
      return bounds
    }

    getCenter() {
      return new FakeLatLng(this.center.lat, this.center.lng)
    }

    getLevel() {
      return this.level
    }

    setLevel(level: number) {
      this.level = level
      this.cameraCalls.push({ type: 'setLevel', level })
    }

    relayout() {
      this.relayoutCount += 1
    }

    getNode() {
      return this.container
    }

    setBounds(
      bounds: KakaoMapLatLngBounds,
      ...padding: Array<number | undefined>
    ) {
      this.cameraCalls.push({
        type: 'setBounds',
        points: bounds instanceof FakeLatLngBounds ? [...bounds.points] : [],
        padding: padding.filter(
          (value): value is number => typeof value === 'number',
        ),
      })
    }

    setCenter(position: KakaoMapLatLng) {
      this.center = { lat: position.getLat(), lng: position.getLng() }
      this.cameraCalls.push({ type: 'setCenter', ...this.center })
    }

    moveViewport(viewport: FakeViewport, level?: number) {
      this.viewport = viewport
      this.center = viewport.center
      if (level !== undefined) this.level = level
    }
  }

  class FakePolygonImpl implements FakePolygon {
    readonly path: FakePoint[]
    readonly style: FakePolygon['style']
    readonly clickable: boolean
    zIndex = 0
    private map: KakaoMapInstance | null

    constructor(options: {
      map?: KakaoMapInstance
      path: KakaoMapLatLng[]
      strokeWeight?: number
      strokeColor?: string
      strokeOpacity?: number
      fillColor?: string
      fillOpacity?: number
      clickable?: boolean
    }) {
      this.map = options.map ?? null
      this.path = options.path.map(point => ({
        lat: point.getLat(),
        lng: point.getLng(),
      }))
      this.style = {
        strokeColor: options.strokeColor,
        strokeWeight: options.strokeWeight,
        strokeOpacity: options.strokeOpacity,
        fillColor: options.fillColor,
        fillOpacity: options.fillOpacity,
      }
      this.clickable = Boolean(options.clickable)
      polygons.push(this)
    }

    get attached() {
      return this.map !== null
    }

    setMap(map: KakaoMapInstance | null) {
      this.map = map
    }

    setOptions(options: FakePolygon['style']) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          Object.assign(this.style, { [key]: value })
        }
      })
    }

    setZIndex(zIndex: number) {
      this.zIndex = zIndex
    }
  }

  class FakeOverlayImpl implements FakeOverlay {
    readonly content: Node
    readonly position: FakePoint
    zIndex: number
    private map: KakaoMapInstance | null

    constructor(options: {
      map?: KakaoMapInstance
      position: KakaoMapLatLng
      content: Node
      zIndex?: number
    }) {
      this.map = options.map ?? null
      this.content = options.content
      this.position = {
        lat: options.position.getLat(),
        lng: options.position.getLng(),
      }
      this.zIndex = options.zIndex ?? 0
      overlays.push(this)
    }

    get attached() {
      return this.map !== null
    }

    setMap(map: KakaoMapInstance | null) {
      this.map = map
    }

    setZIndex(zIndex: number) {
      this.zIndex = zIndex
    }
  }

  const maps: KakaoMapsNamespace = {
    load: callback => callback(),
    Map: FakeMap,
    LatLng: FakeLatLng,
    LatLngBounds: FakeLatLngBounds,
    Polygon: FakePolygonImpl,
    CustomOverlay: FakeOverlayImpl,
    event: {
      addListener: (target, type, handler) => {
        handlersOf(target, type).add(handler)
      },
      removeListener: (target, type, handler) => {
        handlersOf(target, type).delete(handler)
      },
      preventMap: () => {
        preventMapCount += 1
      },
    },
  }

  return {
    maps,
    mapInstances,
    polygons,
    overlays,
    livePolygons: () => polygons.filter(polygon => polygon.attached),
    liveOverlays: () => overlays.filter(overlay => overlay.attached),
    trigger: (target, type) => {
      // 핸들러가 스스로 떼어져도 이번 발사는 끝까지 돈다(카카오와 같은 순서 보장은 아니다).
      Array.from(handlersOf(target, type)).forEach(handler => handler())
    },
    listenerCount: (target, type) => handlersOf(target, type).size,
    get preventMapCount() {
      return preventMapCount
    },
  }
}

export type FakeResizeObserverHandle = {
  /** 관찰 중인 모든 옵저버의 콜백을 부른다(창 크기가 바뀐 것처럼). */
  resize(): void
  readonly activeCount: number
  restore(): void
}

/**
 * jsdom 에는 `ResizeObserver` 가 없다. 지도 컴포넌트는 없으면 그 이펙트를 건너뛰므로,
 * 크기 변화 경로를 보려면 이것으로 전역을 잠시 채운다. `restore()` 를 꼭 부른다.
 */
export const stubResizeObserver = (): FakeResizeObserverHandle => {
  const active = new Set<{ fire: () => void }>()
  const original = globalThis.ResizeObserver

  class FakeResizeObserver {
    private readonly entry: { fire: () => void }

    constructor(callback: ResizeObserverCallback) {
      this.entry = {
        fire: () => callback([], this as unknown as ResizeObserver),
      }
    }

    observe() {
      active.add(this.entry)
    }

    unobserve() {
      active.delete(this.entry)
    }

    disconnect() {
      active.delete(this.entry)
    }
  }

  globalThis.ResizeObserver =
    FakeResizeObserver as unknown as typeof ResizeObserver

  return {
    resize: () => Array.from(active).forEach(entry => entry.fire()),
    get activeCount() {
      return active.size
    },
    restore: () => {
      if (original) {
        globalThis.ResizeObserver = original
      } else {
        Reflect.deleteProperty(globalThis, 'ResizeObserver')
      }
    },
  }
}
