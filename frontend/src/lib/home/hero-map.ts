import { SEOUL_STATUS_FEATURES } from '@/data/seoul-status-map'
import { formatPeriodCode } from '@/lib/analysis/presentation'
import { normalizeStatusRankings } from '@/lib/status/status-adapter'
import { STATUS_METRIC_LABELS } from '@/lib/status/status-formatters'
import { resolveStatusMapValueSteps } from '@/lib/status/status-map-model'
import type {
  DistrictRankingSummary,
  StatusMetric,
  StatusRankedItem,
} from '@/types/status'

/**
 * 홈 히어로 지도의 값 칠(#588, hero-value-map.md). 네트워크도 React 도 모른다.
 *
 * 첫 화면의 서울 지도가 25개 구 모두 같은 회색이면 데이터 서비스인데 숫자가 하나도 읽히지 않는다.
 * 구별현황 지도와 **같은 5분위 규칙**(`resolveStatusMapValueSteps`)으로 칠한다 — 홈에서 진한 구가
 * 구별현황에서도 같은 농도다. 기본 지표는 유동인구다(결정 D-7). 지표 토글은 두지 않는다 — 히어로의
 * 일은 「고르기」이고 지표 비교는 구별현황이 한다.
 */
export const HERO_MAP_METRIC: StatusMetric = 'footTraffic'

export type HeroMapChoropleth = {
  /** 구 코드 → 단계(1 이 가장 많다). 값이 없는 구는 들어 있지 않다(회색). */
  steps: Map<string, number>
  /**
   * 구 코드 → 그 지표 순위 항목. 폴리곤 이름표가 순위를 함께 읽는 데 쓴다. **단계가 있는 구만** 담는다 —
   * 값이 유한수가 아니라 회색인 구가 「N위」로 읽히면 색과 이름표가 서로 다른 말을 한다.
   */
  itemsByCode: Map<string, StatusRankedItem>
  /** 「2026년 1분기 유동인구」. 응답에 분기가 없으면 지표 이름만 둔다. */
  basisLabel: string
  /** 칠하지 못한 구(값 없음)가 하나라도 있는가. 범례에 「데이터 없음」 칸을 둘지 정한다. */
  hasDistrictWithoutStep: boolean
}

/** 지도에 그리는 구 코드. 결측(회색) 판정은 응답 개수가 아니라 이 코드와의 교집합으로 센다. */
const MAP_DISTRICT_CODES = SEOUL_STATUS_FEATURES.map(
  feature => feature.districtCode,
)

const isPeriodCode = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}[1-4]$/.test(value)

/**
 * `GET /districts/rankings` 응답에서 히어로 지도가 칠할 단계를 만든다.
 *
 * 칠할 수 있는 구가 하나도 없으면 `null` 이다 — 그때 지도는 예전처럼 회색이고 범례를 그리지 않는다.
 * 「많음 → 적음」 범례만 남으면 칠하지 않은 지도를 칠한 것처럼 말한다.
 */
export const toHeroMapChoropleth = (
  body: DistrictRankingSummary | null | undefined,
): HeroMapChoropleth | null => {
  if (!body) return null

  const items = normalizeStatusRankings(body)[HERO_MAP_METRIC]
  const steps = resolveStatusMapValueSteps(items)
  if (steps.size === 0) return null

  const itemsByCode = new Map<string, StatusRankedItem>()
  for (const item of items) {
    // 같은 구가 두 번 오면 앞 항목을 쓴다(단계 계산과 같은 규칙).
    if (!steps.has(item.districtCode)) continue
    if (!itemsByCode.has(item.districtCode)) {
      itemsByCode.set(item.districtCode, item)
    }
  }

  const metricLabel = STATUS_METRIC_LABELS[HERO_MAP_METRIC]

  return {
    steps,
    itemsByCode,
    basisLabel: isPeriodCode(body.currentPeriodCode)
      ? `${formatPeriodCode(body.currentPeriodCode)} ${metricLabel}`
      : metricLabel,
    /*
      응답 개수로 세면, 지도에 없는 코드가 섞여 와도 25개를 채운 것으로 보고 회색 구가 있는데 「데이터
      없음」 칸을 빼게 된다. 지도에 그리는 구마다 단계가 있는지 본다.
    */
    hasDistrictWithoutStep: MAP_DISTRICT_CODES.some(code => !steps.has(code)),
  }
}

/**
 * 폴리곤 이름표. 순위가 있으면 「강남구, 유동인구 1위」, 없으면 이름만 읽는다.
 * 값·변화율은 넣지 않는다 — 25개 구를 Tab 으로 지날 때마다 긴 문장을 듣게 된다. 값은 툴팁이 준다.
 */
export const describeHeroMapDistrict = (
  name: string,
  item: StatusRankedItem | undefined,
): string =>
  item
    ? `${name}, ${STATUS_METRIC_LABELS[HERO_MAP_METRIC]} ${item.rank}위`
    : name
