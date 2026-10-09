import {
  estimateLabelWidth,
  LABEL_HEIGHT_ESTIMATE,
  type LabelRect,
  rankAreaLabels,
  selectVisibleLabels,
} from '@/lib/map/area-label-collision'
import { normalizeBoundary } from '@/lib/map/geometry'
import type { AreaBoundaryItem } from '@/types/recommend'

/**
 * 폴리곤 위에 지역 이름을 뱃지로 얹는다.
 *
 * `drawAreaPolygonLayer` 와 짝이다 — 면은 그쪽이, 이름표는 여기가 그린다.
 * 폴리곤만 있으면 어느 면이 어느 동네인지 지도만 보고는 알 수 없어서,
 * 상권분석·상권추천 모두 같은 뱃지를 쓴다(DESIGN.md §영역 폴리곤).
 *
 * 뱃지는 `<button>` 이다. 폴리곤 클릭은 포인터 전용이라, 키보드 사용자에게는
 * 이 뱃지가 지도 위의 선택 수단이 된다(목록 대안은 선택 패널).
 *
 * **`collide` 를 켜면 겹치는 뱃지를 숨긴다(#602).** 상권 단계만 켠다 — 한 화면에
 * 수십~수백 개라 서로 덮으면 하나도 읽히지 않는다. 자치구·행정동 단계는 이름표가 곧
 * 고를 대상의 전체 목록이라 겹쳐도 전부 보인다(기본값 false). 우선순위(선택 → `priorityByCode` → 면적)가 높은 뱃지부터
 * 자리를 잡고 겹치는 뒤 뱃지는 지도에서 뗀다(`area-label-collision.ts`). 화면상 상대
 * 위치는 줌 레벨에만 달려 있으므로 **`zoom_changed` 에서만** 다시 계산한다 — 팬으로는
 * 뱃지가 깜빡이지 않는다. 숨은 뱃지도 그 폴리곤에 호버·포커스가 가면(previewed) 다시 뜬다.
 */
export type DrawAreaLabelLayerParams = {
  map: KakaoMapInstance
  maps: KakaoMapsNamespace
  areas: readonly AreaBoundaryItem[]
  selectedCode: string | null
  previewedCode: string | null
  onSelect: (code: string) => void
  onPreviewChange: (code: string | null) => void
  /** 뱃지 클릭이 지도 배경 클릭으로 새어나가지 않게 막아야 하는 화면에서 넘긴다. */
  onBeforeSelect?: () => void
  /**
   * 겹칠 때 먼저 남길 순서(인기 순위 등, 작을수록 앞). 없으면 폴리곤 면적이 큰 순이다.
   * 지금은 두 호출부 모두 넘기지 않는다 — 지도 영역 응답(`AreaBoundaryItem`)에 인기 지표가 없다.
   */
  priorityByCode?: ReadonlyMap<string, number>
  /** 겹치는 뱃지를 숨길지. 상권 단계만 켠다(map-shell.md D4-7). 기본 false. */
  collide?: boolean
}

export type AreaLabelLayerHandle = {
  cleanup: () => void
  /** 레이어를 다시 그리지 않고 강조 대상의 z 순서·노출만 바꾼다. */
  setHighlight: (next: {
    selectedCode: string | null
    previewedCode: string | null
  }) => void
}

export const AREA_LABEL_CLASS_NAME = 'area-map-label'

/**
 * 뱃지 z 의 바닥. 뱃지는 카카오 오버레이 pane 에, 폴리곤은 그와 다른 벡터(SVG) pane 에
 * 그려져 둘의 zIndex 는 서로 비교되지 않는다(실측 DOM: 두 pane 이 각각 z-index:1 형제).
 * 이 값은 같은 pane 안의 다른 커스텀 오버레이(추천 순위 마커 등)와의 순서만 정한다.
 */
const BASE_Z_INDEX_OFFSET = 100

export const drawAreaLabelLayer = ({
  map,
  maps,
  areas,
  selectedCode,
  previewedCode,
  onSelect,
  onPreviewChange,
  onBeforeSelect,
  priorityByCode,
  collide = false,
}: DrawAreaLabelLayerParams): AreaLabelLayerHandle => {
  const cleanups: Array<() => void> = []
  type Label = {
    overlay: KakaoMapCustomOverlay
    marker: HTMLButtonElement
    position: KakaoMapLatLng
    baseZIndex: number
    attached: boolean
    size: { width: number; height: number } | null
  }
  const labelByCode = new Map<string, Label>()

  const order = rankAreaLabels(areas, { selectedCode, priorityByCode })
  const rankByCode = new Map(order.map((code, rank) => [code, rank]))
  // 우선순위가 높을수록 위에 쌓는다. 강조(선택·호버)는 그 모두보다 위다.
  const raisedZIndex = BASE_Z_INDEX_OFFSET + order.length + 1

  let current = { selectedCode, previewedCode }
  let visibleByCollision: ReadonlySet<string> | null = null
  /**
   * 포인터가 올라가 있는 뱃지. 숨김 대상이어도 떼지 않는다.
   *
   * 폴리곤 → 떠오른 뱃지로 포인터를 옮기면 이벤트가 `pointerenter`(뱃지, 미리보기 A) →
   * `mouseout`(폴리곤, 미리보기 null) 순으로 온다 — 포인터 이벤트가 마우스 호환 이벤트보다
   * 먼저다. 미리보기만 보면 마지막 값이 null 이라 뱃지가 떨어졌다가 포인터가 다시 폴리곤에
   * 닿아 붙는 깜빡임이 생겼다(실측 Chromium, 뱃지 가장자리에서 1회씩). 그래서 「포인터
   * 아래 뱃지」를 따로 들고 표시 조건에 넣는다.
   *
   * 떠날 때는 한 프레임 미룬다. 뱃지 → 자기 폴리곤으로 내려오면 `pointerleave`(null) 뒤에
   * 폴리곤 `mouseover`(A) 가 와서, 즉시 지우면 그 사이 한 번 떨어진다. 그 프레임 안에 다시
   * 들어오면 예약을 취소한다.
   */
  let hoveredLabelCode: string | null = null
  let pendingUnhover: { cancel: () => void } | null = null
  const nextFrame = (run: () => void): { cancel: () => void } => {
    if (typeof requestAnimationFrame === 'function') {
      const id = requestAnimationFrame(run)
      return { cancel: () => cancelAnimationFrame(id) }
    }
    const id = setTimeout(run, 16)
    return { cancel: () => clearTimeout(id) }
  }

  areas.forEach(area => {
    const code = String(area.areaCode)
    if (labelByCode.has(code)) return
    const center = normalizeBoundary([[area.centerLng, area.centerLat]])[0]
    if (!center) return

    const selected = code === selectedCode
    const highlighted = selected || code === previewedCode

    const marker = document.createElement('button')
    marker.type = 'button'
    marker.className = AREA_LABEL_CLASS_NAME
    marker.textContent = area.areaName
    marker.dataset.selected = String(selected)
    marker.setAttribute('aria-pressed', String(selected))
    marker.setAttribute('aria-label', `${area.areaName} 선택`)

    const choose = (event: Event) => {
      event.stopPropagation()
      onBeforeSelect?.()
      onSelect(code)
    }
    const preview = () => onPreviewChange(code)
    const clearPreview = () => onPreviewChange(null)
    const enter = () => {
      pendingUnhover?.cancel()
      pendingUnhover = null
      hoveredLabelCode = code
      syncZIndex()
      preview()
    }
    const leave = () => {
      clearPreview()
      pendingUnhover?.cancel()
      pendingUnhover = nextFrame(() => {
        pendingUnhover = null
        if (hoveredLabelCode === code) hoveredLabelCode = null
        syncZIndex()
        syncAttachment()
      })
    }

    marker.addEventListener('click', choose)
    marker.addEventListener('focus', preview)
    marker.addEventListener('pointerenter', enter)
    marker.addEventListener('blur', clearPreview)
    marker.addEventListener('pointerleave', leave)
    cleanups.push(() => {
      marker.removeEventListener('click', choose)
      marker.removeEventListener('focus', preview)
      marker.removeEventListener('pointerenter', enter)
      marker.removeEventListener('blur', clearPreview)
      marker.removeEventListener('pointerleave', leave)
    })

    const baseZIndex =
      BASE_Z_INDEX_OFFSET + order.length - (rankByCode.get(code) ?? 0)
    const position = new maps.LatLng(center.lat, center.lng)
    const overlay = new maps.CustomOverlay({
      map,
      position,
      content: marker,
      xAnchor: 0.5,
      yAnchor: 0.5,
      zIndex: highlighted ? raisedZIndex : baseZIndex,
      clickable: true,
    })
    labelByCode.set(code, {
      overlay,
      marker,
      position,
      baseZIndex,
      attached: true,
      size: null,
    })
  })

  /**
   * 뱃지 크기. 오버레이는 만들 때 동기로 DOM 에 붙으므로(실측) 붙어 있는 동안 한 번 재서
   * 기억한다 — 줌이 바뀌어도 글자 크기는 그대로다. 잴 수 없으면(jsdom) 근사치를 쓴다.
   */
  const sizeOf = (code: string, label: Label) => {
    if (label.size) return label.size
    const measuredWidth = label.marker.offsetWidth
    const measuredHeight = label.marker.offsetHeight
    if (measuredWidth > 0 && measuredHeight > 0) {
      label.size = { width: measuredWidth, height: measuredHeight }
      return label.size
    }
    return {
      width: estimateLabelWidth(label.marker.textContent ?? code),
      height: LABEL_HEIGHT_ESTIMATE,
    }
  }

  /**
   * 포인터 아래 뱃지도 올린다. 숨김 대상 뱃지는 겹친 이웃보다 z 가 낮아서, 미리보기가
   * null 로 풀린 순간 바닥 z 로 내려가면 이웃 뱃지가 포인터를 덮어 가져간다(실측).
   */
  const syncZIndex = () => {
    labelByCode.forEach(({ overlay, baseZIndex }, code) => {
      const raised =
        code === current.selectedCode ||
        code === current.previewedCode ||
        code === hoveredLabelCode
      overlay.setZIndex(raised ? raisedZIndex : baseZIndex)
    })
  }

  const syncAttachment = () => {
    labelByCode.forEach((label, code) => {
      const show =
        visibleByCollision === null ||
        visibleByCollision.has(code) ||
        code === current.selectedCode ||
        code === current.previewedCode ||
        code === hoveredLabelCode ||
        // 포커스를 가진 뱃지를 떼면 포커스가 body 로 튕긴다. 키보드로 훑는 중에 줌이
        // 바뀌거나 포인터가 다른 폴리곤을 지나가 미리보기가 풀려도 남겨 둔다.
        label.marker === document.activeElement
      if (show === label.attached) return
      label.overlay.setMap(show ? map : null)
      label.attached = show
    })
  }

  let computedLevel: number | null = null
  const applyCollision = () => {
    computedLevel = map.getLevel()
    const projection = map.getProjection()
    // 크기를 먼저 모두 읽어 레이아웃 계산을 한 번으로 묶는다(읽기·쓰기 교차 방지).
    const rects: LabelRect[] = []
    order.forEach(code => {
      const label = labelByCode.get(code)
      if (!label) return
      const point = projection.containerPointFromCoords(label.position)
      const { width, height } = sizeOf(code, label)
      rects.push({ code, centerX: point.x, centerY: point.y, width, height })
    })
    visibleByCollision = selectVisibleLabels(rects)
    syncAttachment()
  }

  if (collide) applyCollision()

  // `idle` 이 아니라 `zoom_changed` 를 듣는다. 팬은 상대 위치를 바꾸지 않으니 들을
  // 이유가 없고, 레벨이 바뀌는 즉시 투영도 새 레벨이라(실측) 애니메이션을 기다릴
  // 필요도 없다. 지도 셸의 `idle` 리스너 수(종류별 1개)에도 끼어들지 않는다.
  const handleZoomChanged = () => {
    if (map.getLevel() !== computedLevel) applyCollision()
  }
  if (collide) maps.event.addListener(map, 'zoom_changed', handleZoomChanged)

  const setHighlight: AreaLabelLayerHandle['setHighlight'] = next => {
    current = next
    syncZIndex()
    syncAttachment()
  }

  const cleanup = () => {
    pendingUnhover?.cancel()
    pendingUnhover = null
    if (collide) {
      maps.event.removeListener(map, 'zoom_changed', handleZoomChanged)
    }
    cleanups.forEach(fn => fn())
    labelByCode.forEach(({ overlay }) => overlay.setMap(null))
    labelByCode.clear()
  }

  return { cleanup, setHighlight }
}
