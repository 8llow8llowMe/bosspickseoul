/**
 * A/B 비교 화면의 **조건 쌍 ↔ 쿼리스트링** 변환.
 *
 * 코덱을 새로 쓰지 않는다 — B1 의 `toSimulationReportSearchParams` / `parseSimulationConditionState`
 * 에 접두사 `a.` / `b.` 를 넘겨 그대로 재사용한다. 좌우가 같은 코덱을 쓰게 하는 것이 요점이다:
 * 한쪽만 규칙이 어긋나면 "왼쪽은 복원되는데 오른쪽은 비어 있는" 버그가 되고, 그건 사용자가
 * URL 을 의심하지 않는 종류의 버그다.
 *
 * ## 한쪽만 있어도 오류가 아니다
 *
 * 리포트 화면의 `비교에 추가` 는 왼쪽만 채운 링크(`a.*` 만 있는 URL)를 만든다. 그래서 파서는
 * 없는 쪽을 빈 조건 상태로 돌려주고, 화면은 그 자리에 **빈 편집기**를 연다. 여기서 "쌍이
 * 완전하지 않으면 오류"로 판정하면 그 흐름이 성립하지 않는다.
 */

import {
  parseSimulationConditionState,
  toSimulationReportSearchParams,
  type SimulationReportVariant,
} from '@/lib/simulation/report-route'
import type { SimulationConditionState } from '@/lib/simulation/conditions'
import type { SimulationReportRequest } from '@/types/simulation'

type SearchParamsReader = { get(name: string): string | null }

/** 좌우 짝. 완성되지 않은 쪽은 `null` 이다. */
export type SimulationCompareRequestPair = {
  left: SimulationReportRequest | null
  right: SimulationReportRequest | null
}

/** 조건 상태 쌍. **양쪽 모두 항상 존재한다** — 비어 있을 수는 있어도 없지는 않다. */
export type SimulationCompareConditionPair = {
  left: SimulationConditionState
  right: SimulationConditionState
}

export const SIMULATION_COMPARE_PREFIX = { left: 'a.', right: 'b.' } as const

const COMPARE_PATH: Record<SimulationReportVariant, string> = {
  standalone: '/simulation/compare',
  analysis: '/analysis/simulation/compare',
}

/**
 * 요청 쌍 → 비교 경로. **완성된 요청만 싣는다**(요청 코덱과 같은 규칙).
 *
 * 한쪽이 `null` 이면 그쪽 키를 통째로 뺀다 — 빈 값을 실어 보내면 파서가 "손상된 조건"과
 * "아직 안 고른 조건"을 구분할 수 없다.
 */
export const buildSimulationCompareHref = (
  pair: SimulationCompareRequestPair,
  variant: SimulationReportVariant = 'standalone',
): string => {
  const params = new URLSearchParams()

  const append = (
    request: SimulationReportRequest | null,
    prefix: string,
  ): void => {
    if (!request) return
    toSimulationReportSearchParams(request, prefix).forEach((value, key) => {
      params.set(key, value)
    })
  }

  append(pair.left, SIMULATION_COMPARE_PREFIX.left)
  append(pair.right, SIMULATION_COMPARE_PREFIX.right)

  const query = params.toString()
  return query ? `${COMPARE_PATH[variant]}?${query}` : COMPARE_PATH[variant]
}

/**
 * 쿼리스트링 → 조건 상태 쌍. **읽을 수 있는 만큼만 읽는다.**
 *
 * 편집기의 초기값이 이 결과다. 한쪽이 비어 있으면 빈 상태 그대로 편집기가 열린다.
 */
export const parseSimulationCompareConditionPair = (
  params: SearchParamsReader,
): SimulationCompareConditionPair => ({
  left: parseSimulationConditionState(params, SIMULATION_COMPARE_PREFIX.left),
  right: parseSimulationConditionState(params, SIMULATION_COMPARE_PREFIX.right),
})
