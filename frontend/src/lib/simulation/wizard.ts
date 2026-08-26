/**
 * 창업 시뮬레이션 입력 마법사의 **순수 상태 로직**.
 *
 * 컴포넌트가 아니라 이 모듈이 정본이다 — 다음 슬라이스에서 리포트 화면이 같은 상태를
 * 그대로 들어올려 재계산·비교에 쓰기 때문에, React에 의존하는 코드를 여기에 두지 않는다.
 * (React 훅 래퍼는 `use-simulation-wizard.ts`.)
 *
 * 계약상 강제되는 순서는 하나뿐이다: **업종 선택이 브랜드 검색보다 먼저**다.
 * `GET /simulations/franchisees`가 `serviceCode`를 필수로 받기 때문에, 업종 없이 검색하면 400이다.
 * 그래서 브랜드 선택은 업종 단계 안에서만 열리고, 업종을 바꾸면 선택된 브랜드가 초기화된다.
 */

import { districts } from '@/data/districts'
import {
  findSimulationServiceType,
  isSimulationServiceCode,
} from '@/data/simulation-service-types'
import { buildSimulationReportRequest } from '@/lib/api/simulation'
import type {
  SimulationFloorType,
  SimulationReportRequest,
} from '@/types/simulation'

/* ------------------------------------------------------------------ *
 * 단계
 * ------------------------------------------------------------------ */

/**
 * 4단계. 브랜드 검색은 별도 단계가 아니라 **업종 단계 안**에 있다.
 *
 * 명세 D5의 흐름도는 브랜드 검색을 업종과 매장 크기 사이의 노드로 그리지만,
 * 계약이 강제하는 것은 "업종 → 브랜드" 순서일 뿐 별도 단계가 아니다. 375px 기준에서
 * 인디케이터를 5칸으로 늘리면 라벨이 잘리므로, 순서를 지키면서 칸 수는 4로 고정했다.
 */
export const SIMULATION_WIZARD_STEPS = [
  'franchise',
  'district',
  'service',
  'store',
] as const

export type SimulationWizardStep = (typeof SIMULATION_WIZARD_STEPS)[number]

export const SIMULATION_WIZARD_STEP_LABELS: Record<
  SimulationWizardStep,
  string
> = {
  franchise: '창업 형태',
  district: '자치구',
  service: '업종',
  store: '매장 조건',
}

/* ------------------------------------------------------------------ *
 * 상태
 * ------------------------------------------------------------------ */

export type SimulationWizardState = {
  /** 아직 고르지 않았으면 null. `false`(비프랜차이즈)와 구분해야 하므로 boolean|null이다. */
  franchisee: boolean | null
  franchiseeId: number | null
  /** 선택한 브랜드명. 화면 표기용이며 요청 본문에는 들어가지 않는다. */
  brandName: string | null
  districtCode: string | null
  serviceCode: string | null
  /** ㎡. 프리셋은 힌트일 뿐이고 임의 양수를 허용한다. */
  storeSize: number | null
  floorType: SimulationFloorType | null
}

export const createEmptySimulationWizardState = (): SimulationWizardState => ({
  franchisee: null,
  franchiseeId: null,
  brandName: null,
  districtCode: null,
  serviceCode: null,
  storeSize: null,
  floorType: null,
})

/** 분석 화면에서 넘어온 조건 등으로 초기값을 채운다. 지원하지 않는 값은 조용히 버린다. */
export const createSimulationWizardState = (
  initial: Partial<SimulationWizardState> = {},
): SimulationWizardState => {
  const state = createEmptySimulationWizardState()

  if (initial.franchisee === true || initial.franchisee === false) {
    state.franchisee = initial.franchisee
  }
  if (initial.districtCode && findDistrictByCode(initial.districtCode)) {
    state.districtCode = initial.districtCode
  }
  if (isSimulationServiceCode(initial.serviceCode)) {
    state.serviceCode = initial.serviceCode ?? null
  }
  if (isPositiveStoreSize(initial.storeSize)) {
    state.storeSize = initial.storeSize ?? null
  }
  if (initial.floorType === 'FIRST_FLOOR' || initial.floorType === 'OTHER') {
    state.floorType = initial.floorType
  }

  return state
}

/* ------------------------------------------------------------------ *
 * 조회 헬퍼
 * ------------------------------------------------------------------ */

export type SimulationDistrictOption = { code: string; name: string }

/** 자치구 25개를 `{code,name}`으로. `districts.ts`의 `gooCode`는 number라 문자열로 맞춘다. */
export const SIMULATION_DISTRICT_OPTIONS: readonly SimulationDistrictOption[] =
  districts.map(item => ({ code: String(item.gooCode), name: item.gooName }))

export const findDistrictByCode = (
  code: string | null | undefined,
): SimulationDistrictOption | null =>
  SIMULATION_DISTRICT_OPTIONS.find(item => item.code === code) ?? null

/** 자치구 **이름**으로 코드를 찾는다. 분석 화면의 레거시 `gugun`(구 이름) 파라미터 복원용. */
export const findDistrictByName = (
  name: string | null | undefined,
): SimulationDistrictOption | null => {
  const trimmed = name?.trim()
  if (!trimmed) return null
  return SIMULATION_DISTRICT_OPTIONS.find(item => item.name === trimmed) ?? null
}

/* ------------------------------------------------------------------ *
 * 매장 크기 입력
 * ------------------------------------------------------------------ */

/** ㎡ → 평. 1평 = 3.3058㎡. 표기용이라 소수 첫째 자리에서 반올림한다. */
export const squareMeterToPyeong = (squareMeter: number): number =>
  Math.round((squareMeter / 3.3058) * 10) / 10

export const isPositiveStoreSize = (
  value: number | null | undefined,
): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

/**
 * 직접 입력값을 ㎡ 정수로 정규화한다. 빈 값·0 이하·숫자가 아니면 null.
 *
 * 소수점을 버리는 이유: 백엔드 `storeSize`는 정수 ㎡이고, `36.7`을 그대로 보내면
 * 검증(`SIMULATION_10x`)에 걸리는 대신 서버에서 잘려 화면 표기와 계산 근거가 어긋난다.
 */
export const parseStoreSizeInput = (raw: string): number | null => {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const value = Math.floor(Number(trimmed))
  return isPositiveStoreSize(value) ? value : null
}

/* ------------------------------------------------------------------ *
 * 단계 전이 — 뒤 단계를 무효화하는 것이 핵심이다
 * ------------------------------------------------------------------ */

/** 프랜차이즈 여부를 바꾸면 브랜드 선택이 의미를 잃는다. */
export const selectFranchisee = (
  state: SimulationWizardState,
  franchisee: boolean,
): SimulationWizardState =>
  state.franchisee === franchisee
    ? state
    : { ...state, franchisee, franchiseeId: null, brandName: null }

export const selectDistrict = (
  state: SimulationWizardState,
  districtCode: string,
): SimulationWizardState =>
  state.districtCode === districtCode ? state : { ...state, districtCode }

/**
 * 업종을 바꾸면 **브랜드와 매장 크기를 함께 비운다.**
 * 브랜드는 업종별 목록이라 다른 업종의 `franchiseeId`를 그대로 보내면 400/404가 되고,
 * 매장 크기 프리셋(소/중/대)도 업종별 값이라 앞 업종 기준 숫자가 남으면 근거 없는 입력이 된다.
 */
export const selectService = (
  state: SimulationWizardState,
  serviceCode: string,
): SimulationWizardState =>
  state.serviceCode === serviceCode
    ? state
    : {
        ...state,
        serviceCode,
        franchiseeId: null,
        brandName: null,
        storeSize: null,
      }

export const selectBrand = (
  state: SimulationWizardState,
  brand: { franchiseeId: number; brandName: string } | null,
): SimulationWizardState => ({
  ...state,
  franchiseeId: brand?.franchiseeId ?? null,
  brandName: brand?.brandName ?? null,
})

export const selectStoreSize = (
  state: SimulationWizardState,
  storeSize: number | null,
): SimulationWizardState => ({
  ...state,
  storeSize: isPositiveStoreSize(storeSize) ? storeSize : null,
})

export const selectFloorType = (
  state: SimulationWizardState,
  floorType: SimulationFloorType,
): SimulationWizardState => ({ ...state, floorType })

/* ------------------------------------------------------------------ *
 * 진행 판정
 * ------------------------------------------------------------------ */

export const isSimulationStepComplete = (
  state: SimulationWizardState,
  step: SimulationWizardStep,
): boolean => {
  if (step === 'franchise') return state.franchisee !== null
  if (step === 'district') return state.districtCode !== null
  if (step === 'service') {
    // 프랜차이즈 창업이면 브랜드까지 골라야 업종 단계가 끝난다 (요청에 franchiseeId 필수).
    if (!isSimulationServiceCode(state.serviceCode)) return false
    return state.franchisee === true ? state.franchiseeId !== null : true
  }
  return isPositiveStoreSize(state.storeSize) && state.floorType !== null
}

/** 앞 단계가 모두 끝나야 열린다. 되돌아가기는 항상 허용된다(앞 단계는 이미 완료 상태이므로). */
export const canOpenSimulationStep = (
  state: SimulationWizardState,
  step: SimulationWizardStep,
): boolean => {
  const index = SIMULATION_WIZARD_STEPS.indexOf(step)
  return SIMULATION_WIZARD_STEPS.slice(0, index).every(previous =>
    isSimulationStepComplete(state, previous),
  )
}

/** 아직 끝나지 않은 첫 단계. 모두 끝났으면 마지막 단계에 머문다. */
export const getActiveSimulationStep = (
  state: SimulationWizardState,
): SimulationWizardStep =>
  SIMULATION_WIZARD_STEPS.find(
    step => !isSimulationStepComplete(state, step),
  ) ?? 'store'

/** 다음/이전 단계. 경계에서는 null. */
export const getAdjacentSimulationStep = (
  step: SimulationWizardStep,
  direction: 1 | -1,
): SimulationWizardStep | null =>
  SIMULATION_WIZARD_STEPS[SIMULATION_WIZARD_STEPS.indexOf(step) + direction] ??
  null

export const isSimulationWizardComplete = (
  state: SimulationWizardState,
): boolean =>
  SIMULATION_WIZARD_STEPS.every(step => isSimulationStepComplete(state, step))

/** 완료되지 않은 첫 단계를 안내 문구로 바꾼다. 완료면 null. */
export const describeSimulationWizardGap = (
  state: SimulationWizardState,
): string | null => {
  if (isSimulationWizardComplete(state)) return null
  const step = getActiveSimulationStep(state)
  if (step === 'franchise') return '프랜차이즈 창업인지 먼저 선택해 주세요'
  if (step === 'district') return '창업할 자치구를 선택해 주세요'
  if (step === 'service') {
    return state.franchisee === true &&
      isSimulationServiceCode(state.serviceCode)
      ? '창업할 브랜드를 선택해 주세요'
      : '창업할 업종을 선택해 주세요'
  }
  return '매장 크기와 층 구분을 선택해 주세요'
}

/* ------------------------------------------------------------------ *
 * 요청 정규화
 * ------------------------------------------------------------------ */

/**
 * 마법사 상태 → `POST /simulations/reports` 본문. 미완성이면 null.
 *
 * `periodCode`는 **넘기지 않는다.** 입력 단계에 노출하지 않기로 확정했고(D8-1 #2),
 * 빈 문자열을 실어 보내면 400 `SIMULATION_106`이라 키째 빼서 서버 기본값(20233)을 쓴다.
 * 비프랜차이즈일 때 `franchiseeId` 키가 빠지는 것은 `buildSimulationReportRequest`가 처리한다.
 */
export const toSimulationReportRequest = (
  state: SimulationWizardState,
): SimulationReportRequest | null => {
  if (!isSimulationWizardComplete(state)) return null

  return buildSimulationReportRequest({
    franchisee: state.franchisee === true,
    franchiseeId: state.franchiseeId,
    districtCode: state.districtCode as string,
    serviceCode: state.serviceCode as string,
    storeSize: state.storeSize as number,
    floorType: state.floorType as SimulationFloorType,
  })
}

/**
 * 두 요청이 같은 조건인가.
 *
 * 계산 결과를 화면에 남겨둘지 판정하는 데 쓴다. 사용자가 조건을 고친 뒤에도 앞 결과가
 * 그대로 남아 있으면 바뀐 조건의 결과로 오독된다 — 창업 비용 화면에서는 치명적이다.
 * `franchisee === false`면 `franchiseeId` 키가 아예 없으므로 `undefined`끼리 비교된다.
 */
export const isSameSimulationReportRequest = (
  left: SimulationReportRequest | null,
  right: SimulationReportRequest | null,
): boolean => {
  if (!left || !right) return false
  return (
    left.franchisee === right.franchisee &&
    left.franchiseeId === right.franchiseeId &&
    left.districtCode === right.districtCode &&
    left.serviceCode === right.serviceCode &&
    left.storeSize === right.storeSize &&
    left.floorType === right.floorType &&
    left.periodCode === right.periodCode
  )
}

/* ------------------------------------------------------------------ *
 * 오류 → 되돌릴 단계
 * ------------------------------------------------------------------ */

/**
 * 서버 오류코드를 "어느 단계로 되돌릴지"로 옮긴다.
 *
 * **재시도 여부·심각도 판정에는 절대 쓰지 않는다** — 그건 `api-error`의 `kind`가 정한다.
 * 여기서 `resultCode`를 보는 이유는 단 하나, 404가 왔을 때 사용자를 어느 선택지로
 * 돌려보낼지 정하기 위해서다(임대료 없는 자치구인지, 사라진 브랜드인지).
 * 모르는 코드는 null → 화면은 단계 이동 버튼 없이 서버 메시지만 보여준다.
 */
export const resolveSimulationRecoveryStep = (
  code: string | null | undefined,
): SimulationWizardStep | null => {
  if (code === 'SIMULATION_001') return 'service'
  if (code === 'SIMULATION_002') return 'district'
  if (code === 'SIMULATION_003' || code === 'SIMULATION_004') return 'service'
  return null
}

/** 요청 검증 실패(`fieldErrors[].field`)를 단계로 옮긴다. 모르는 필드는 null. */
export const resolveSimulationFieldStep = (
  field: string | null | undefined,
): SimulationWizardStep | null => {
  if (field === 'franchisee') return 'franchise'
  if (field === 'districtCode') return 'district'
  if (field === 'serviceCode' || field === 'franchiseeId') return 'service'
  if (field === 'storeSize' || field === 'floorType') return 'store'
  return null
}

/** 조건 요약 한 줄. 결과 카드와 분석 컨텍스트 카드가 같은 문구를 쓰게 한다. */
export const describeSimulationServiceName = (
  serviceCode: string | null | undefined,
): string | null => findSimulationServiceType(serviceCode)?.name ?? null
