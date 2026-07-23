import type {
  DistrictTopTenSummary,
  StatusRankedItem,
  StatusTopTenByMetric,
} from '@/types/status'

type TopTenItem = {
  districtCode: string
  districtName: string
}

const toRankedItems = <T extends TopTenItem>(
  items: T[],
  getValue: (item: T) => number,
  getChangeRate: (item: T) => number,
): StatusRankedItem[] =>
  items.slice(0, 10).map((item, index) => ({
    rank: index + 1,
    districtCode: item.districtCode,
    districtName: item.districtName,
    value: getValue(item),
    changeRate: getChangeRate(item),
  }))

export const normalizeStatusTopTen = (
  source: DistrictTopTenSummary,
): StatusTopTenByMetric => ({
  footTraffic: toRankedItems(
    source.footTrafficTopTenItems,
    item => item.totalFootTraffic,
    item => item.footTrafficChangeRate,
  ),
  sales: toRankedItems(
    source.salesTopTenItems,
    item => item.totalSalesAmount,
    item => item.salesChangeRate,
  ),
  opened: toRankedItems(
    source.openedStoreTopTenItems,
    item => item.openedStoreCount,
    item => item.openingChangeRate,
  ),
  closed: toRankedItems(
    source.closedStoreTopTenItems,
    item => item.closedStoreCount,
    item => item.closureChangeRate,
  ),
})
