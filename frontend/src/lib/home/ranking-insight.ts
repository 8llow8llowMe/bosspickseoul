import type { HomeMetricRanking } from '@/lib/home/metric-rankings'
import type { PopularDistrict } from '@/lib/home/popular-districts'

export type RankingInsight = {
  /** 화면에 그대로 쓰는 문장. */
  sentence: string
  /** 양쪽 목록에서 함께 강조할 자치구 코드. */
  highlightCode: string
}

/** 상위 몇 개까지를 「상위」로 볼 것인가. */
const TOP_N = 3

/**
 * 두 순위의 **집합 차이**에서 문장 하나를 만든다.
 *
 * 문장은 소속만 진술한다 — 「좋다/나쁘다/유망하다」로 해석하지 않는다.
 * 지표 상위가 곧 좋은 상권이라는 근거가 우리에게 없다.
 *
 * 규칙에 걸리는 게 없으면 `null` 이다. **억지 문장을 만들지 않는다.**
 */
export const buildRankingInsight = (
  views: readonly PopularDistrict[],
  metric: HomeMetricRanking,
): RankingInsight | null => {
  if (views.length === 0 || metric.items.length === 0) return null

  const viewCodes = new Set(views.map(item => item.districtCode))
  const metricCodes = new Set(metric.items.map(item => item.districtCode))

  // 규칙 A — 지표 상위인데 아무도 안 보는 곳. 창업 후보를 찾는 사람에게 더 값지다.
  const unseen = metric.items
    .slice(0, TOP_N)
    .find(item => !viewCodes.has(item.districtCode))

  if (unseen) {
    return {
      sentence: `${metric.label} ${unseen.rank}위 ${unseen.districtName}는 지금 많이 본 ${views.length}곳에 들지 않았습니다.`,
      highlightCode: unseen.districtCode,
    }
  }

  // 규칙 B — 많이 보는데 지표 Top5 밖인 곳.
  const outside = views
    .slice(0, TOP_N)
    .find(item => !metricCodes.has(item.districtCode))

  if (outside) {
    return {
      sentence: `조회수 ${outside.rank}위 ${outside.name}는 ${metric.label} Top ${metric.items.length} 밖입니다.`,
      highlightCode: outside.districtCode,
    }
  }

  return null
}
