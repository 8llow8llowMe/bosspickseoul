'use client'

import { useCallback, useMemo, useState } from 'react'

import {
  createSimulationConditionState,
  describeSimulationConditionGap,
  isSimulationConditionsComplete,
  isSimulationSectionComplete,
  selectBrand,
  selectDistrict,
  selectFloorType,
  selectFranchisee,
  selectService,
  selectStoreSize,
  toSimulationReportRequest,
  type SimulationConditionSection,
  type SimulationConditionState,
} from '@/lib/simulation/conditions'
import type {
  SimulationFloorType,
  SimulationReportRequest,
} from '@/types/simulation'

export type SimulationConditionsController = {
  state: SimulationConditionState
  isComplete: boolean
  /** 완료되지 않았을 때 "무엇이 남았는지" 한 줄. 완료면 null. */
  gap: string | null
  /** 완성된 요청 본문. 미완성이면 null — 계산 버튼의 활성 조건과 같은 판정을 쓴다. */
  reportRequest: SimulationReportRequest | null
  isSectionComplete: (section: SimulationConditionSection) => boolean
  setFranchisee: (franchisee: boolean) => void
  setDistrict: (districtCode: string) => void
  setService: (serviceCode: string) => void
  setBrand: (brand: { franchiseeId: number; brandName: string } | null) => void
  setStoreSize: (storeSize: number | null) => void
  setFloorType: (floorType: SimulationFloorType) => void
  /** 자치구·업종을 한 번에 되돌린다. 분석에서 가져온 조건 복원용. */
  restoreDistrictAndService: (next: {
    districtCode?: string | null
    serviceCode?: string | null
  }) => void
}

/**
 * 조건 상태 훅. **네트워크를 모른다** — 조회·계산은 호출부(컴포넌트)의 React Query가 맡는다.
 *
 * 다음 슬라이스(리포트 화면)가 이 컨트롤러를 그대로 들어올려 재계산·A/B 비교의 좌우 조건으로
 * 쓸 수 있게, 화면에 종속된 값(로딩 여부·에러·쿼리 키)을 여기에 섞지 않았다.
 */
export const useSimulationConditions = (
  initial: Partial<SimulationConditionState> = {},
): SimulationConditionsController => {
  // 초기값은 마운트 시 한 번만 반영한다. 분석 컨텍스트(쿼리스트링)가 바뀌면 라우트가 새로
  // 마운트되므로 재동기화가 필요 없고, 매 렌더 동기화하면 사용자가 고친 값을 되돌린다.
  const [state, setState] = useState<SimulationConditionState>(() =>
    createSimulationConditionState(initial),
  )

  const update = useCallback(
    (
      next: (previous: SimulationConditionState) => SimulationConditionState,
    ) => {
      setState(previous => next(previous))
    },
    [],
  )

  const setFranchisee = useCallback(
    (franchisee: boolean) => {
      update(previous => selectFranchisee(previous, franchisee))
    },
    [update],
  )

  const setDistrict = useCallback(
    (districtCode: string) => {
      update(previous => selectDistrict(previous, districtCode))
    },
    [update],
  )

  const setService = useCallback(
    (serviceCode: string) => {
      update(previous => selectService(previous, serviceCode))
    },
    [update],
  )

  const setBrand = useCallback(
    (brand: { franchiseeId: number; brandName: string } | null) => {
      update(previous => selectBrand(previous, brand))
    },
    [update],
  )

  const setStoreSize = useCallback(
    (storeSize: number | null) => {
      update(previous => selectStoreSize(previous, storeSize))
    },
    [update],
  )

  const setFloorType = useCallback(
    (floorType: SimulationFloorType) => {
      update(previous => selectFloorType(previous, floorType))
    },
    [update],
  )

  const restoreDistrictAndService = useCallback(
    (next: { districtCode?: string | null; serviceCode?: string | null }) => {
      update(previous => {
        let draft = previous
        if (next.districtCode) draft = selectDistrict(draft, next.districtCode)
        if (next.serviceCode) draft = selectService(draft, next.serviceCode)
        return draft
      })
    },
    [update],
  )

  const isSectionComplete = useCallback(
    (section: SimulationConditionSection) =>
      isSimulationSectionComplete(state, section),
    [state],
  )

  const reportRequest = useMemo(() => toSimulationReportRequest(state), [state])

  return {
    state,
    isComplete: isSimulationConditionsComplete(state),
    gap: describeSimulationConditionGap(state),
    reportRequest,
    isSectionComplete,
    setFranchisee,
    setDistrict,
    setService,
    setBrand,
    setStoreSize,
    setFloorType,
    restoreDistrictAndService,
  }
}
