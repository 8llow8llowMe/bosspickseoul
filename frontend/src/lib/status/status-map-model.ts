import type { StatusRankedItem } from '@/types/status'

export type StatusMapFeature = {
  readonly districtCode: string
  readonly path: string
  readonly center: {
    readonly x: number
    readonly y: number
  }
}

export type StatusMapMarker = StatusRankedItem & StatusMapFeature['center']

export function createStatusMapMarkers(
  items: StatusRankedItem[],
  features: readonly StatusMapFeature[],
): StatusMapMarker[] {
  const featuresByDistrictCode = new Map(
    features.map(feature => [feature.districtCode, feature]),
  )

  return items.slice(0, 10).flatMap(item => {
    const feature = featuresByDistrictCode.get(item.districtCode)

    return feature ? [{ ...item, ...feature.center }] : []
  })
}

export function findSelectedStatusMapFeature(
  features: readonly StatusMapFeature[],
  districtCode: string | null,
): StatusMapFeature | null {
  return features.find(feature => feature.districtCode === districtCode) ?? null
}
