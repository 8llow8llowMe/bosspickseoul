import { normalizeStatusTopTen } from '@/lib/status/status-adapter'
import type { DistrictTopTenSummary, StatusRankedItem } from '@/types/status'

/**
 * 홈이 노출하는 지표. `StatusMetric` 에서 `closed` 를 뺀 것이다.
 *
 * 폐업은 **상위가 나쁜 것**이라 다른 세 지표와 방향이 반대다. 같은 토글에 섞으면
 * ① 랜딩에서 「폐업 1위 자치구」를 순위표처럼 자랑하게 되고 ② 두 순위의 불일치를
 * 말하는 인사이트 문장(`ranking-insight`)이 정반대 의미가 된다.
 * `/status` 는 현황 조회가 목적이라 4지표를 그대로 유지한다.
 */
export type HomeMetric = 'footTraffic' | 'sales' | 'opened'

export const HOME_METRICS: readonly HomeMetric[] = [
  'footTraffic',
  'sales',
  'opened',
] as const

const METRIC_LABELS: Record<HomeMetric, string> = {
  footTraffic: '유동인구',
  sales: '매출',
  opened: '개업',
}

export const homeMetricLabel = (metric: HomeMetric): string =>
  METRIC_LABELS[metric]

export type HomeMetricRanking = {
  metric: HomeMetric
  label: string
  items: StatusRankedItem[]
}

/** 홈은 Top5 만 그린다. 좌측 조회수 8행 + 토글과 높이가 맞는다. */
const HOME_TOP_N = 5

/**
 * `top-ten` 응답을 홈이 쓰는 모양으로 옮긴다.
 *
 * 값·변화율 계산은 `normalizeStatusTopTen` 이 이미 한다 — 여기서 다시 하지 않는다.
 * 홈에서 따로 포맷하면 같은 숫자가 `/status` 와 홈에서 다르게 보이는 날이 온다.
 */
export const toHomeMetricRankings = (
  body: DistrictTopTenSummary,
): HomeMetricRanking[] => {
  const normalized = normalizeStatusTopTen(body)

  return HOME_METRICS.map(metric => ({
    metric,
    label: METRIC_LABELS[metric],
    items: normalized[metric].slice(0, HOME_TOP_N),
  }))
}

/**
 * `top-ten` 이 죽었을 때 01단계가 쓰는 예시. **랭킹 섹션은 이걸 쓰지 않는다** —
 * 거기서는 우측을 통째로 빼고, 스토리에서만 쓴다(단계 번호 01~04 에 구멍이 나면 안 된다).
 * 화면이 분기 없이 그리도록 실 데이터와 모양이 같다.
 *
 * 값의 단위는 `formatStatusValue`(`src/lib/status/status-formatters.ts`)가 기대하는
 * 그대로다 — footTraffic·sales 는 원시 카운트(명/원), opened 는 개수(개). 여기서
 * "만"·"억" 같은 축약을 미리 하면 포맷터가 다시 나누어 자릿수가 어긋난다.
 *
 * 값은 지어낸 숫자가 아니라 dev `GET /districts/top-ten` 2026-09-03 실측 스냅샷이다.
 * 지어낸 값은 자릿수가 실제와 8배까지 어긋날 수 있다(1차 구현에서 실제로 그랬다) —
 * 폴백이 API 장애 시 화면에 그대로 렌더되므로, 자릿수가 틀린 숫자는 폴백이 없는 것보다
 * 나쁘다. 변화율이 음수인 것도 실측 그대로다 — 보기 좋으라고 부호를 바꾸지 않는다.
 */
export const HOME_METRIC_FALLBACK: HomeMetricRanking[] = [
  {
    metric: 'footTraffic',
    label: METRIC_LABELS.footTraffic,
    items: [
      {
        rank: 1,
        districtCode: '11680',
        districtName: '강남구',
        value: 145_280_452,
        changeRate: 0.7,
      },
      {
        rank: 2,
        districtCode: '11620',
        districtName: '관악구',
        value: 128_048_887,
        changeRate: -1.1,
      },
      {
        rank: 3,
        districtCode: '11710',
        districtName: '송파구',
        value: 120_476_997,
        changeRate: -0.2,
      },
      {
        rank: 4,
        districtCode: '11290',
        districtName: '성북구',
        value: 117_624_977,
        changeRate: -2.6,
      },
      {
        rank: 5,
        districtCode: '11440',
        districtName: '마포구',
        value: 114_208_917,
        changeRate: -1.3,
      },
    ],
  },
  {
    metric: 'sales',
    label: METRIC_LABELS.sales,
    items: [
      {
        rank: 1,
        districtCode: '11680',
        districtName: '강남구',
        value: 3_345_727_318_759,
        changeRate: -1.0,
      },
      {
        rank: 2,
        districtCode: '11710',
        districtName: '송파구',
        value: 1_777_692_259_738,
        changeRate: -13.6,
      },
      {
        rank: 3,
        districtCode: '11650',
        districtName: '서초구',
        value: 1_537_328_677_669,
        changeRate: -3.9,
      },
      {
        rank: 4,
        districtCode: '11560',
        districtName: '영등포구',
        value: 1_455_334_022_762,
        changeRate: -3.3,
      },
      {
        rank: 5,
        districtCode: '11170',
        districtName: '용산구',
        value: 1_360_529_337_238,
        changeRate: -2.7,
      },
    ],
  },
  {
    metric: 'opened',
    label: METRIC_LABELS.opened,
    items: [
      {
        rank: 1,
        districtCode: '11680',
        districtName: '강남구',
        value: 1299,
        changeRate: -12.2,
      },
      {
        rank: 2,
        districtCode: '11710',
        districtName: '송파구',
        value: 946,
        changeRate: 0.1,
      },
      {
        rank: 3,
        districtCode: '11440',
        districtName: '마포구',
        value: 933,
        changeRate: -6.6,
      },
      {
        rank: 4,
        districtCode: '11500',
        districtName: '강서구',
        value: 788,
        changeRate: 0.2,
      },
      {
        rank: 5,
        districtCode: '11560',
        districtName: '영등포구',
        value: 709,
        changeRate: -4.2,
      },
    ],
  },
]
