import type { HomeMetricRanking } from '@/lib/home/metric-rankings'
import type { PopularDistrictsView } from '@/lib/home/popular-districts'

/**
 * 「지금 많이 본 지역」 미니 지도의 **레이어 계산**(ranking-mini-map.md D3-3 · D5-2).
 * 네트워크도 React 도 모른다.
 *
 * 지도는 목록을 되풀이하지 않는다 — 값·변화율은 목록에 있고, 지도는 「어디 · 겹침」만 더한다.
 *
 * - 지표 Top 5 → 구 칠(순위 1~5). 홈에는 지표당 Top 10 까지만 있어 25개 구 값으로 칠하는
 *   단계구분도가 아니라 **순위 칠**이다(`/status` 지도와 같은 이유).
 * - 많이 본 순위 → 구 중심의 순위 숫자 배지. 색만으로 전하지 않는다 — 숫자가 순위다.
 */

/** 칠할 지표 순위의 상한. 홈 목록(`RANKING_METRIC_TOP_N`)과 같은 5다. */
export const RANKING_MAP_FILL_LIMIT = 5

export type RankingMapBadge = { code: string; rank: number }

export type RankingMapLayers = {
  /** 지표 Top 5 — 구 코드 → 순위(1~5). 지표 레이어가 없으면 빈 Map. */
  fills: Map<string, number>
  /** 많이 본 순위. 조회 레이어가 없으면 빈 배열. 순위 오름차순. */
  badges: RankingMapBadge[]
  /** 두 레이어에 모두 든 구(조회 순위 순). */
  overlap: string[]
  /** 지도 `aria-label`. 그릴 레이어가 없으면 빈 문자열. */
  summary: string
}

const isDistrictCode = (code: unknown): code is string =>
  typeof code === 'string' && code.trim().length > 0

/**
 * 두 순위에서 지도 레이어를 만든다.
 *
 * 코드가 없는 항목은 지도에 놓을 자리가 없으므로 버린다. 같은 코드가 두 번 오면 앞(높은 순위)을
 * 남긴다 — 한 구에 칠 두 가지·배지 두 개를 그리지 않는다.
 */
export const buildRankingMapLayers = (
  view: PopularDistrictsView | null,
  metric: HomeMetricRanking | null,
): RankingMapLayers => {
  const fills = new Map<string, number>()
  const metricNames: string[] = []
  for (const item of metric?.items ?? []) {
    if (fills.size >= RANKING_MAP_FILL_LIMIT) break
    if (!isDistrictCode(item.districtCode) || fills.has(item.districtCode)) {
      continue
    }
    fills.set(item.districtCode, fills.size + 1)
    metricNames.push(item.districtName)
  }

  const badges: RankingMapBadge[] = []
  const viewNames: string[] = []
  const nameByCode = new Map<string, string>()
  for (const item of view?.items ?? []) {
    if (
      !isDistrictCode(item.districtCode) ||
      nameByCode.has(item.districtCode)
    ) {
      continue
    }
    badges.push({ code: item.districtCode, rank: badges.length + 1 })
    nameByCode.set(item.districtCode, item.name)
    viewNames.push(item.name)
  }

  const overlap = badges
    .map(badge => badge.code)
    .filter(code => fills.has(code))

  return {
    fills,
    badges,
    overlap,
    summary: summarize({
      metricLabel: metric?.label ?? null,
      metricNames,
      viewNames,
      overlapNames: overlap.map(code => nameByCode.get(code) ?? code),
    }),
  }
}

/** 요약 문장(D5-2). 스크린리더는 지도에서 이 한 문장을 듣고, 상세는 목록에서 읽는다. */
const summarize = ({
  metricLabel,
  metricNames,
  viewNames,
  overlapNames,
}: {
  metricLabel: string | null
  metricNames: string[]
  viewNames: string[]
  overlapNames: string[]
}): string => {
  const hasFills = metricLabel !== null && metricNames.length > 0
  const hasBadges = viewNames.length > 0

  if (hasFills && hasBadges) {
    const overlapSentence = overlapNames.length
      ? `둘 다 든 곳은 ${overlapNames.join(', ')}예요.`
      : '겹치는 곳은 없어요.'
    // 지표 목록을 걷어 낸 뒤(#600) 지표 Top 5 의 이름은 이 문장이 말한다 — 지표만 분기와 같은 모양으로 적는다.
    return `서울 지도에 많이 본 ${viewNames.length}곳과 ${metricLabel} Top ${metricNames.length} 를 표시했어요. ${metricLabel} Top ${metricNames.length}: ${metricNames.join(', ')}. ${overlapSentence}`
  }
  if (hasFills) {
    return `서울 지도에 ${metricLabel} Top ${metricNames.length} 를 진하기로 표시했어요: ${metricNames.join(', ')}.`
  }
  if (hasBadges) {
    return `서울 지도에 많이 본 ${viewNames.length}곳을 순위 숫자로 표시했어요: ${viewNames.join(', ')}.`
  }
  return ''
}
