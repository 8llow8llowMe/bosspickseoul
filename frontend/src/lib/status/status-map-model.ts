import type { DistrictRecord } from '@/data/districts'
import type { StatusRankedItem } from '@/types/status'

export type StatusMapFeature = {
  readonly districtCode: string
  readonly path: string
  readonly center: {
    readonly x: number
    readonly y: number
  }
}

export type StatusMapLabel = {
  readonly districtCode: string
  readonly districtName: string
  readonly x: number
  readonly y: number
  readonly rank: number | null
  readonly isTopTen: boolean
}

export function createStatusMapLabels(
  items: readonly StatusRankedItem[],
  features: readonly StatusMapFeature[],
  districtRecords: ReadonlyArray<Pick<DistrictRecord, 'gooCode' | 'gooName'>>,
): StatusMapLabel[] {
  const districtNamesByCode = new Map(
    districtRecords.map(record => [String(record.gooCode), record.gooName]),
  )
  const topTenItemsByDistrictCode = new Map(
    items.slice(0, 10).map(item => [item.districtCode, item]),
  )

  return features.flatMap(feature => {
    const districtName = districtNamesByCode.get(feature.districtCode)

    if (districtName === undefined) return []

    const topTenItem = topTenItemsByDistrictCode.get(feature.districtCode)

    return [
      {
        districtCode: feature.districtCode,
        districtName,
        ...feature.center,
        rank: topTenItem?.rank ?? null,
        isTopTen: Boolean(topTenItem),
      },
    ]
  })
}

export function findSelectedStatusMapFeature(
  features: readonly StatusMapFeature[],
  districtCode: string | null,
): StatusMapFeature | null {
  return features.find(feature => feature.districtCode === districtCode) ?? null
}
