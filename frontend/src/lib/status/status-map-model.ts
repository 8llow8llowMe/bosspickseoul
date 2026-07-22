import type { StatusRankedItem } from '@/types/status'

export type StatusMapCenter = {
  x: number
  y: number
}

export type StatusMapMarker = StatusRankedItem & StatusMapCenter

export function createStatusMapMarkers(
  items: StatusRankedItem[],
  centers: Record<string, StatusMapCenter>,
): StatusMapMarker[] {
  return items.slice(0, 10).flatMap(item => {
    const center = centers[item.districtCode]

    return center ? [{ ...item, ...center }] : []
  })
}
