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
 * 이 뱃지가 유일한 선택 수단이 된다.
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
}

export type AreaLabelLayerHandle = {
  cleanup: () => void
  /** 레이어를 다시 그리지 않고 강조 대상의 z 순서만 올린다. */
  setHighlight: (next: {
    selectedCode: string | null
    previewedCode: string | null
  }) => void
}

export const AREA_LABEL_CLASS_NAME = 'area-map-label'

/** 선택·호버 뱃지가 이웃 뱃지에 가리지 않도록 올리는 z 값. */
const RAISED_Z_INDEX = 200
/** 뱃지는 폴리곤(baseZIndex = index + 10)보다 항상 위에 온다. */
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
}: DrawAreaLabelLayerParams): AreaLabelLayerHandle => {
  const overlays: KakaoMapCustomOverlay[] = []
  const cleanups: Array<() => void> = []
  const labelByCode = new Map<
    string,
    { overlay: KakaoMapCustomOverlay; baseZIndex: number }
  >()

  areas.forEach((area, index) => {
    const code = String(area.areaCode)
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

    marker.addEventListener('click', choose)
    marker.addEventListener('focus', preview)
    marker.addEventListener('pointerenter', preview)
    marker.addEventListener('blur', clearPreview)
    marker.addEventListener('pointerleave', clearPreview)
    cleanups.push(() => {
      marker.removeEventListener('click', choose)
      marker.removeEventListener('focus', preview)
      marker.removeEventListener('pointerenter', preview)
      marker.removeEventListener('blur', clearPreview)
      marker.removeEventListener('pointerleave', clearPreview)
    })

    const baseZIndex = index + BASE_Z_INDEX_OFFSET
    const overlay = new maps.CustomOverlay({
      map,
      position: new maps.LatLng(center.lat, center.lng),
      content: marker,
      xAnchor: 0.5,
      yAnchor: 0.5,
      zIndex: highlighted ? RAISED_Z_INDEX : baseZIndex,
      clickable: true,
    })
    overlays.push(overlay)
    labelByCode.set(code, { overlay, baseZIndex })
  })

  const setHighlight: AreaLabelLayerHandle['setHighlight'] = next => {
    labelByCode.forEach(({ overlay, baseZIndex }, code) => {
      const raised = code === next.selectedCode || code === next.previewedCode
      overlay.setZIndex(raised ? RAISED_Z_INDEX : baseZIndex)
    })
  }

  const cleanup = () => {
    cleanups.forEach(fn => fn())
    overlays.forEach(overlay => overlay.setMap(null))
    labelByCode.clear()
  }

  return { cleanup, setHighlight }
}
