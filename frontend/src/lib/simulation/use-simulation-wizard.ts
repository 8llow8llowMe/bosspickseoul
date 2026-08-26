'use client'

import { useCallback, useMemo, useState } from 'react'

import {
  canOpenSimulationStep,
  createSimulationWizardState,
  describeSimulationWizardGap,
  getActiveSimulationStep,
  getAdjacentSimulationStep,
  isSimulationStepComplete,
  isSimulationWizardComplete,
  selectBrand,
  selectDistrict,
  selectFloorType,
  selectFranchisee,
  selectService,
  selectStoreSize,
  toSimulationReportRequest,
  type SimulationWizardState,
  type SimulationWizardStep,
} from '@/lib/simulation/wizard'
import type {
  SimulationFloorType,
  SimulationReportRequest,
} from '@/types/simulation'

export type SimulationWizardController = {
  state: SimulationWizardState
  step: SimulationWizardStep
  isComplete: boolean
  /** 완료되지 않았을 때 "무엇이 남았는지" 한 줄. 완료면 null. */
  gap: string | null
  /** 완성된 요청 본문. 미완성이면 null — 계산 버튼의 활성 조건과 같은 판정을 쓴다. */
  reportRequest: SimulationReportRequest | null
  isStepComplete: (step: SimulationWizardStep) => boolean
  canOpenStep: (step: SimulationWizardStep) => boolean
  goToStep: (step: SimulationWizardStep) => void
  goNext: () => void
  goPrevious: () => void
  setFranchisee: (franchisee: boolean) => void
  setDistrict: (districtCode: string) => void
  setService: (serviceCode: string) => void
  setBrand: (brand: { franchiseeId: number; brandName: string } | null) => void
  setStoreSize: (storeSize: number | null) => void
  setFloorType: (floorType: SimulationFloorType) => void
}

/**
 * 마법사 상태 훅. **네트워크를 모른다** — 조회·계산은 호출부(컴포넌트)의 React Query가 맡는다.
 *
 * 다음 슬라이스(리포트 화면)가 이 컨트롤러를 그대로 들어올려 재계산·A/B 비교의 좌우 조건으로
 * 쓸 수 있게, 화면에 종속된 값(로딩 여부·에러·쿼리 키)을 여기에 섞지 않았다.
 */
export const useSimulationWizard = (
  initial: Partial<SimulationWizardState> = {},
): SimulationWizardController => {
  // 초기값은 마운트 시 한 번만 반영한다. 분석 컨텍스트(쿼리스트링)가 바뀌면 라우트가 새로
  // 마운트되므로 재동기화가 필요 없고, 매 렌더 동기화하면 사용자가 고친 값을 되돌린다.
  const [state, setState] = useState<SimulationWizardState>(() =>
    createSimulationWizardState(initial),
  )
  const [visitedStep, setVisitedStep] = useState<SimulationWizardStep | null>(
    null,
  )

  const derivedStep = getActiveSimulationStep(state)
  // 사용자가 명시적으로 이동한 단계가 있으면 그것을 쓰되, 앞 단계가 비면 열 수 없으므로 되돌린다.
  const step =
    visitedStep && canOpenSimulationStep(state, visitedStep)
      ? visitedStep
      : derivedStep

  const update = useCallback(
    (next: (previous: SimulationWizardState) => SimulationWizardState) => {
      setState(previous => next(previous))
    },
    [],
  )

  const goToStep = useCallback((target: SimulationWizardStep) => {
    setVisitedStep(target)
  }, [])

  const goNext = useCallback(() => {
    const next = getAdjacentSimulationStep(step, 1)
    if (next) setVisitedStep(next)
  }, [step])

  const goPrevious = useCallback(() => {
    const previous = getAdjacentSimulationStep(step, -1)
    if (previous) setVisitedStep(previous)
  }, [step])

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

  const isStepComplete = useCallback(
    (target: SimulationWizardStep) => isSimulationStepComplete(state, target),
    [state],
  )

  const canOpenStep = useCallback(
    (target: SimulationWizardStep) => canOpenSimulationStep(state, target),
    [state],
  )

  const reportRequest = useMemo(() => toSimulationReportRequest(state), [state])

  return {
    state,
    step,
    isComplete: isSimulationWizardComplete(state),
    gap: describeSimulationWizardGap(state),
    reportRequest,
    isStepComplete,
    canOpenStep,
    goToStep,
    goNext,
    goPrevious,
    setFranchisee,
    setDistrict,
    setService,
    setBrand,
    setStoreSize,
    setFloorType,
  }
}
