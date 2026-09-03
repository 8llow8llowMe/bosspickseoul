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
  // H-2. 네 배열 모두 백엔드가 200 을 주면서 통째로 누락시킬 수 있다.
  // `?? []` 없이 `.slice()` 를 부르면 렌더 중 TypeError 로 죽는다 — 이 어댑터는
  // `/status` 뿐 아니라 홈 랜딩(popular-districts, metric-ranking-board)에서도
  // 쓰이므로 여기 하나를 방어하면 두 화면이 함께 안전해진다.
  footTraffic: toRankedItems(
    source.footTrafficTopTenItems ?? [],
    item => item.totalFootTraffic,
    item => item.footTrafficChangeRate,
  ),
  sales: toRankedItems(
    source.salesTopTenItems ?? [],
    item => item.totalSalesAmount,
    item => item.salesChangeRate,
  ),
  opened: toRankedItems(
    source.openedStoreTopTenItems ?? [],
    item => item.openedStoreCount,
    item => item.openingChangeRate,
  ),
  closed: toRankedItems(
    source.closedStoreTopTenItems ?? [],
    item => item.closedStoreCount,
    item => item.closureChangeRate,
  ),
})
