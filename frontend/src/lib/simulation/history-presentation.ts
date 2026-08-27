/**
 * 저장 이력 항목의 표시·재조회 변환.
 *
 * **계약의 구멍 하나를 여기서 흡수한다**: 저장 응답(`SimulationHistoryItem`)에는
 * `brandName` 은 있어도 `franchiseeId` 가 없다. 그래서 프랜차이즈 이력을 그대로 재계산하면
 * 브랜드 없는 프랜차이즈 요청이 되어 400 `SIMULATION_004` 다.
 *
 * → 프랜차이즈 이력은 **리포트가 아니라 입력 화면으로** 보낸다. 업종까지 복원된 상태에서
 *   브랜드만 다시 고르면 되므로 사용자가 밟는 걸음이 가장 짧다. 링크 목적지를 카드가 아니라
 *   이 모듈이 정하는 이유가 그것이다 — 카드가 정하면 프랜차이즈 항목을 리포트로 보내
 *   "계산할 조건이 없어요" 빈 화면에 떨어뜨리는 사고가 언제든 다시 생긴다.
 */

import {
  buildSimulationReportHref,
  simulationBuilderHref,
} from '@/lib/simulation/report-route'
import { createSimulationConditionState } from '@/lib/simulation/conditions'
import type {
  SimulationHistoryItem,
  SimulationReportRequest,
} from '@/types/simulation'

export const describeSimulationHistoryCondition = (
  item: SimulationHistoryItem,
): string => {
  const parts = [item.districtName, item.serviceName]
  if (item.brandName) parts.push(item.brandName)
  parts.push(`${item.storeSize.toLocaleString()}㎡`, item.floorType.name)
  return parts.join(' · ')
}

/**
 * 이력 → 리포트 요청.
 *
 * 응답 `floorType` 은 `{code,name,description}` 객체다. 요청에는 **code 만** 들어간다.
 * `franchiseeId` 는 저장 응답에 없으므로 프랜차이즈여도 실을 수 없다 —
 * 이 요청은 그대로 보내면 안 되고, `isSimulationHistoryReplayable` 이 먼저 걸러야 한다.
 */
export const toSimulationReportRequestFromHistory = (
  item: SimulationHistoryItem,
): SimulationReportRequest => ({
  franchisee: item.franchisee,
  districtCode: item.districtCode,
  serviceCode: item.serviceCode,
  storeSize: item.storeSize,
  floorType: item.floorType.code,
})

/** 이 이력만으로 리포트를 다시 계산할 수 있는가. 프랜차이즈는 브랜드가 없어 불가능하다. */
export const isSimulationHistoryReplayable = (
  item: SimulationHistoryItem,
): boolean => !item.franchisee

/**
 * 이력 카드의 이동 링크.
 *
 * - 개인 창업 → 리포트. 조건이 완성돼 있어 바로 계산된다.
 * - 프랜차이즈 → 입력 화면. 업종·자치구·매장 조건까지 복원하고 브랜드만 비운다.
 */
export const buildSimulationHistoryReportHref = (
  item: SimulationHistoryItem,
): string => {
  const request = toSimulationReportRequestFromHistory(item)
  if (isSimulationHistoryReplayable(item)) {
    return buildSimulationReportHref(request)
  }

  // 브랜드는 검색 결과로만 정해지므로 여기서 채울 수 없다. 나머지 조건만 싣는다.
  return simulationBuilderHref(
    'standalone',
    createSimulationConditionState({
      franchisee: item.franchisee,
      districtCode: item.districtCode,
      serviceCode: item.serviceCode,
      storeSize: item.storeSize,
      floorType: item.floorType.code,
    }),
  )
}
