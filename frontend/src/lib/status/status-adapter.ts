import type {
  DistrictRankingSummary,
  DistrictTopTenSummary,
  StatusRankedItem,
  StatusRankingsByMetric,
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

type RankingItem = TopTenItem & { rank: number }

const toFiniteOrNull = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/*
 * 전체 순위는 Top10 과 두 가지가 다르다(api-reference 「자치구 전체 순위 계약」).
 * - 순위는 응답의 `rank` 를 그대로 쓴다. 동점이면 같은 순위다(1, 2, 2, 4) — 배열 위치로 다시 매기면
 *   동점 구가 서로 다른 순위로 보인다.
 * - 변화율 null 을 0 으로 바꾸지 않는다. 0 은 「변동 없음」이라 결측을 다른 사실로 바꾼다.
 */
const toRankingItems = <T extends RankingItem>(
  items: T[],
  getValue: (item: T) => number,
  getChangeRate: (item: T) => number | null | undefined,
): StatusRankedItem[] =>
  items.map(item => ({
    rank: item.rank,
    districtCode: item.districtCode,
    districtName: item.districtName,
    value: getValue(item),
    changeRate: toFiniteOrNull(getChangeRate(item)),
  }))

export const normalizeStatusRankings = (
  source: DistrictRankingSummary,
): StatusRankingsByMetric => ({
  // Top10 과 같은 이유로 배열 누락을 막는다(H-2).
  footTraffic: toRankingItems(
    source.footTrafficRankings ?? [],
    item => item.totalFootTraffic,
    item => item.footTrafficChangeRate,
  ),
  sales: toRankingItems(
    source.salesRankings ?? [],
    item => item.totalSalesAmount,
    item => item.salesChangeRate,
  ),
  opened: toRankingItems(
    source.openedStoreRankings ?? [],
    item => item.openedStoreCount,
    item => item.openingChangeRate,
  ),
  closed: toRankingItems(
    source.closedStoreRankings ?? [],
    item => item.closedStoreCount,
    item => item.closureChangeRate,
  ),
})

export const STATUS_TOP_TEN_SIZE = 10

/**
 * 전체 순위에서 목록이 그릴 상위 10개. 응답이 이미 값 내림차순(같으면 구 코드 오름차순)이라 앞에서
 * 자른다. 10위 동점이 더 있으면 구 코드가 뒤인 구는 목록에서 빠진다 — `top-ten` 과 같은 규칙이다.
 */
export const selectStatusTopTen = (
  items: readonly StatusRankedItem[],
): StatusRankedItem[] => items.slice(0, STATUS_TOP_TEN_SIZE)

/**
 * 네 지표가 **동시에** 비었는지. 참이면 정상적인 결측이 아니라 데이터 공급 장애다.
 *
 * 한 지표만 비는 것은 있을 수 있는 일이다(그 분기의 적재가 늦는 경우). 그러나 유동인구·
 * 매출·개업·폐업이 한꺼번에 비는 것은 자치구 팩트 조회가 통째로 실패했다는 뜻이다 —
 * 2026-09-11 dev 에서 `spatial_version` 필터가 배포되고 백필이 안 된 상태로 실제로
 * 일어났고, 200 + 빈 배열이라 화면은 「데이터가 아직 없어요」로 조용히 넘어갔다(#371).
 *
 * 서울 자치구는 25개 고정이므로 정상 운영에서 이 함수가 참이 되는 경우는 없다.
 */
export const isStatusTopTenAllEmpty = (topTen: StatusTopTenByMetric): boolean =>
  topTen.footTraffic.length === 0 &&
  topTen.sales.length === 0 &&
  topTen.opened.length === 0 &&
  topTen.closed.length === 0
