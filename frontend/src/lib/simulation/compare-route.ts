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
import {
  isSameSimulationReportRequest,
  toSimulationReportRequest,
  type SimulationConditionState,
} from '@/lib/simulation/conditions'
import type { SimulationPairSide } from '@/lib/api/simulation'
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
  /**
   * 브랜드명 — **표시 전용으로만 덧실린다**(리포트 경로의 `brandName` 과 같은 규칙). 요청 파싱도
   * 캐시 키도 보지 않는다. 없으면 비교 편집기는 고른 브랜드를 `id` 로만 알아 접힌 줄에 이름을
   * 쓸 수 없다(C1).
   */
  brandNames: { left?: string | null; right?: string | null } = {},
): string => {
  const params = new URLSearchParams()

  const append = (
    request: SimulationReportRequest | null,
    prefix: string,
    brandName: string | null | undefined,
  ): void => {
    if (!request) return
    toSimulationReportSearchParams(request, prefix).forEach((value, key) => {
      params.set(key, value)
    })
    const trimmed = brandName?.trim()
    if (request.franchisee && trimmed) params.set(`${prefix}brandName`, trimmed)
  }

  append(pair.left, SIMULATION_COMPARE_PREFIX.left, brandNames.left)
  append(pair.right, SIMULATION_COMPARE_PREFIX.right, brandNames.right)

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

/**
 * 쿼리스트링 → **완성된 요청 쌍.** 비교 결과 조회의 정본이 이 함수다.
 *
 * 조건 코덱(`parseSimulationCompareConditionPair`)과 완성 판정(`toSimulationReportRequest`)을
 * 잇기만 한다. 완성 판정을 여기서 다시 쓰지 않는 것이 요점이다 — 판정이 두 벌이 되면
 * "버튼은 눌리는데 조회는 안 되는" 조합이 생긴다.
 *
 * 편집기 초기값이 필요하면 `parseSimulationCompareConditionPair` 를 쓴다. 그쪽은 미완성도
 * 읽어 주고, 이쪽은 완성된 것만 준다. 둘은 쓰임이 다르다.
 */
export const parseSimulationComparePair = (
  params: SearchParamsReader,
): SimulationCompareRequestPair => {
  const pair = parseSimulationCompareConditionPair(params)

  return {
    left: toSimulationReportRequest(pair.left),
    right: toSimulationReportRequest(pair.right),
  }
}

/**
 * 두 요청 쌍이 **같은 계산**인가. 좌우 모두 같아야 한다. 표시용 `brandName` 은 보지 않는다
 * (`isSameSimulationReportRequest` 가 요청 필드만 본다) — 이름만 달라도 결과는 같다.
 *
 * 비교 화면은 이것으로 ① 결과가 지금 편집기 조건의 결과인지(무효화, C2) ② `비교하기` 가 새 계산인지
 * 같은 계산의 재시도인지를 가른다. href 문자열로 견주면 brandName 만 달라도 「다른 조건」이 돼,
 * 캐시를 집어 아무 일도 일어나지 않는 버튼이 된다.
 */
export const isSameSimulationComparePair = (
  a: SimulationCompareRequestPair,
  b: SimulationCompareRequestPair,
): boolean =>
  isSameSimulationReportRequest(a.left, b.left) &&
  isSameSimulationReportRequest(a.right, b.right)

/** 좌우 실패 여부 → 실패한 쪽. 둘 다 아니면 null. */
export const resolveSimulationPairFailedSide = (
  leftFailed: boolean,
  rightFailed: boolean,
): SimulationPairSide | null => {
  if (leftFailed && rightFailed) return 'both'
  if (leftFailed) return 'left'
  if (rightFailed) return 'right'
  return null
}
