/**
 * 비교 화면의 **표시 로직**. 네트워크도 React도 모른다.
 *
 * 비용 항목 자체는 `report-presentation` 의 `toCostBreakdown` 을 재사용한다 — 단일 리포트와
 * 비교가 같은 항목·같은 순서·같은 `levy` 규칙을 쓰게 해야 두 화면이 다른 말을 하지 않는다.
 * 이 모듈이 더하는 것은 **좌우를 나란히 놓기 위한 것들**뿐이다: 미러 막대 비율, 차액 문구.
 */

import { toCostBreakdown } from '@/lib/simulation/report-presentation'
import {
  formatStoreSize,
  type SimulationConditionState,
} from '@/lib/simulation/conditions'
import { formatLargeWon } from '@/lib/format'
import type { SimulationCondition, SimulationReport } from '@/types/simulation'

/**
 * 조건 한 줄 — 「마포구 · 한식음식점 · 맛나감자탕 · 66㎡ (약 20평) · 1층」. 결과 헤드와, 비교한 뒤
 * 접힌 편집기 요약(C3)이 같이 쓴다. 두 곳이 다른 말을 하면 접힌 줄이 결과와 같은 조건인지 의심된다.
 */
export const describeCompareConditionLine = (
  condition: SimulationCondition,
): string => {
  const parts = [
    condition.districtName,
    condition.serviceName,
    formatStoreSize(condition.storeSize),
    condition.floorType.name,
  ]
  if (condition.brandName) parts.splice(2, 0, condition.brandName)
  return parts.join(' · ')
}

export type SimulationCompareWinner = 'left' | 'right' | 'tie'

export type SimulationCostGap = {
  /** 총 창업 비용이 **더 낮은** 쪽. 같으면 `'tie'`. */
  winner: SimulationCompareWinner
  /** 차액 문구. 동점이면 같다는 사실을 말한다. */
  message: string
  /** 차액 (만원). 동점이면 0. */
  difference: number
}

/**
 * 비교가 말하지 않는 것을 밝히는 문구. **화면에서 이 문구를 빼지 않는다.**
 *
 * 비용이 낮은 쪽에 시각적 강조가 붙는 순간 사용자는 그것을 "더 나은 선택"으로 읽는다.
 * 이 리포트에는 매출·수익 지표가 없으므로 그 판단의 근거가 애초에 없다.
 */
export const SIMULATION_COMPARE_NEUTRAL_NOTICE =
  '창업 비용만 비교한 결과예요. 매출·수익 지표는 계산하지 않아요.'

/** 비교 컬럼의 사람이 읽는 이름. 좌우가 뒤바뀌어 보이지 않게 한 곳에서 만든다. */
export const SIMULATION_COMPARE_SIDE_LABELS = {
  left: '조건 A',
  right: '조건 B',
} as const

/**
 * 막대·범례 앞의 짧은 표식. 세로로 쌓이면(≤767) 두 막대를 **색으로만** 가르게 되는데, 색을
 * 구분하지 못하는 사용자는 어느 줄이 어느 조건인지 알 수 없었다(C4).
 */
export const SIMULATION_COMPARE_SIDE_MARKS = { left: 'A', right: 'B' } as const

/**
 * 총 창업 비용 차액.
 *
 * `winner` 는 "비용이 낮은 쪽"이라는 **사실**이고 추천이 아니다. 이름이 승자라서 화면이
 * 추천처럼 그리기 쉬우므로, 중립 문구(`SIMULATION_COMPARE_NEUTRAL_NOTICE`)와 항상 함께 쓴다.
 */
export const describeSimulationCostGap = (
  left: SimulationReport,
  right: SimulationReport,
): SimulationCostGap => {
  const difference = Math.abs(left.totalPrice - right.totalPrice)

  if (left.totalPrice === right.totalPrice) {
    return {
      winner: 'tie',
      difference: 0,
      message: '두 조건의 예상 총 창업 비용이 같아요.',
    }
  }

  const winner: SimulationCompareWinner =
    left.totalPrice < right.totalPrice ? 'left' : 'right'

  return {
    winner,
    difference,
    message: `${SIMULATION_COMPARE_SIDE_LABELS[winner]}가 ${formatLargeWon(difference)} 더 적게 들어요.`,
  }
}

export type MirrorCostRow = {
  key: 'rentPrice' | 'deposit' | 'interior' | 'levy'
  label: string
  /** 만원. 해당 없음(비프랜차이즈의 `levy`)이면 null. */
  leftAmount: number | null
  rightAmount: number | null
  /** 0~1. 해당 없음이면 0 — 막대를 그리지 않는다. */
  leftRatio: number
  rightRatio: number
}

/**
 * 좌우 미러 막대 행.
 *
 * ## 비율의 기준은 "두 값 중 큰 값"이다
 *
 * 합(`left + right`) 기준으로 정규화하면 **항목마다 축이 달라진다** — 임대료 300/600 은
 * 33%/67% 가 되고 인테리어 5000/5000 은 50%/50% 가 되어, 막대 길이가 절대 크기를 잃는다.
 * 큰 값 기준이면 각 행에서 더 큰 쪽이 항상 100% 이므로 "어느 쪽이 몇 배인가"가 눈에 남는다.
 *
 * ## `levy` 는 양쪽 다 없을 때만 행을 뺀다
 *
 * 한쪽만 프랜차이즈인 비교가 이 화면의 주된 쓸모다. 그때 가맹 부담금 행을 빼면 비교에서
 * 가장 중요한 차이가 사라진다 — 없는 쪽을 `해당 없음`(null)으로 두고 행은 남긴다.
 */
export const toMirrorCostRows = (
  left: SimulationReport,
  right: SimulationReport,
): MirrorCostRow[] => {
  const leftRows = toCostBreakdown(left)
  const rightRows = toCostBreakdown(right)

  const amountOf = (
    rows: readonly { key: MirrorCostRow['key']; amount: number }[],
    key: MirrorCostRow['key'],
  ): number | null => rows.find(row => row.key === key)?.amount ?? null

  // 항목 순서는 `toCostBreakdown` 이 정한다. 한쪽에만 있는 항목(levy)도 놓치지 않도록
  // 두 쪽을 합치되 중복은 없앤다 — 순서는 먼저 나온 쪽을 따른다.
  const keys: MirrorCostRow['key'][] = []
  const labels = new Map<MirrorCostRow['key'], string>()
  for (const row of [...leftRows, ...rightRows]) {
    if (!labels.has(row.key)) {
      labels.set(row.key, row.label)
      keys.push(row.key)
    }
  }

  return keys.flatMap(key => {
    const leftAmount = amountOf(leftRows, key)
    const rightAmount = amountOf(rightRows, key)

    // 양쪽 다 없으면 그릴 것이 없다. (비프랜차이즈 vs 비프랜차이즈의 `levy`)
    if (leftAmount === null && rightAmount === null) return []

    const peak = Math.max(leftAmount ?? 0, rightAmount ?? 0)
    const ratio = (amount: number | null): number => {
      if (amount === null || peak <= 0) return 0
      return amount / peak
    }

    return [
      {
        key,
        label: labels.get(key) as string,
        leftAmount,
        rightAmount,
        leftRatio: ratio(leftAmount),
        rightRatio: ratio(rightAmount),
      },
    ]
  })
}

/** 미러 막대의 값 표기. `null` 은 **0원이 아니라 해당 없음**이다. */
export const formatMirrorAmount = (amount: number | null): string =>
  amount === null ? '해당 없음' : formatLargeWon(amount)

/**
 * 행별 차액 한 줄(C7) — 「B가 1,129만원 적어요」.
 *
 * 한쪽이 `해당 없음`(비프랜차이즈의 가맹 부담금)이면 **차액을 말하지 않는다** — 0 과 뺄 수 있는
 * 값이 아니다(없는 비용과 0원 비용은 다른 사실이다). 같으면 같다고 한다.
 */
export const describeMirrorRowGap = (row: MirrorCostRow): string | null => {
  if (row.leftAmount === null || row.rightAmount === null) return null
  if (row.leftAmount === row.rightAmount) return '같아요'

  const lower: 'left' | 'right' =
    row.leftAmount < row.rightAmount ? 'left' : 'right'
  const difference = Math.abs(row.leftAmount - row.rightAmount)
  return `${SIMULATION_COMPARE_SIDE_MARKS[lower]}가 ${formatLargeWon(difference)} 적어요`
}

/** 비교 편집기의 칸. 층과 면적은 한 섹션(매장 조건)이지만 편집기에서는 칸이 따로라 나눠 본다. */
export type SimulationCompareField =
  'franchisee' | 'district' | 'service' | 'brand' | 'storeSize' | 'floorType'

/**
 * B 가 A 와 **다르게 고른 칸**(#567). 편집기 칸 옆 「A와 다름」 배지가 이것을 쓴다.
 *
 * B 는 A 의 복사본으로 시작하므로(D-3) 처음에는 빈 집합이다. 사용자가 바꾼 칸만 드러나야 「무엇을 바꿔
 * 비교하는가」가 한눈에 보인다. **B 칸이 비어 있으면 다르다고 하지 않는다** — 「조건 B 비우기」 뒤에 모든
 * 칸에 배지가 붙으면 배지가 아무것도 가리키지 않는다. 브랜드는 아이디로 견준다(이름은 표시용이다).
 */
export const listSimulationCompareDifferences = (
  base: SimulationConditionState,
  target: SimulationConditionState,
): ReadonlySet<SimulationCompareField> => {
  const changed = new Set<SimulationCompareField>()
  const differs = <T>(left: T | null, right: T | null): boolean =>
    right !== null && left !== right

  if (differs(base.franchisee, target.franchisee)) changed.add('franchisee')
  if (differs(base.districtCode, target.districtCode)) changed.add('district')
  if (differs(base.serviceCode, target.serviceCode)) changed.add('service')
  if (differs(base.franchiseeId, target.franchiseeId)) changed.add('brand')
  if (differs(base.storeSize, target.storeSize)) changed.add('storeSize')
  if (differs(base.floorType, target.floorType)) changed.add('floorType')

  return changed
}

/** 「A와 다름」 배지 문구. 화면과 테스트가 같은 문장을 쓰게 한 곳에 둔다. */
export const SIMULATION_COMPARE_CHANGED_BADGE = `${SIMULATION_COMPARE_SIDE_MARKS.left}와 다름`

/**
 * `비교하기` 가 꺼져 있을 때 그 아래 한 줄. 양쪽이 같은 계산이면 무엇이 모자란지가 다르다 — B 는 A 복사본으로
 * 시작하므로(#567) 처음 화면이 바로 이 상태다.
 */
export const describeCompareSubmitHint = (sameConditions: boolean): string =>
  sameConditions
    ? `${SIMULATION_COMPARE_SIDE_LABELS.right}에서 하나 이상 바꾸면 비교할 수 있어요.`
    : '양쪽 조건을 모두 고르면 비교할 수 있어요.'
