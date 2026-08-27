/**
 * 창업 시뮬레이션 조건 입력의 **순수 상태 로직**.
 *
 * 컴포넌트가 아니라 이 모듈이 정본이다 — 다음 슬라이스에서 리포트 화면이 같은 상태를
 * 그대로 들어올려 재계산·비교에 쓰기 때문에, React에 의존하는 코드를 여기에 두지 않는다.
 * (React 훅 래퍼는 `use-simulation-conditions.ts`.)
 *
 * ## 왜 "단계"가 아니라 "섹션"인가
 *
 * 초판은 4단계 마법사였다. 그런데 조건 사이의 **의존성은 업종 → 브랜드 하나뿐**이다.
 * 나머지 셋(창업 형태·자치구·매장 조건)은 순서가 무관해서 단계로 쪼갤 값이 없었고,
 * 대신 "3단계에서 1단계로 되돌아가기"라는 비용만 남았다. 그래서 단일 화면 4섹션으로 바꿨고
 * 이 모듈에서도 단계 전이(`getActiveStep`/`canOpenStep`/`getAdjacentStep`)를 걷어냈다.
 *
 * 계약상 강제되는 순서 하나는 화면에서 지킨다: **업종을 고르기 전에는 브랜드 검색을 비활성화**한다.
 * `GET /simulations/franchisees`가 `serviceCode`를 필수로 받기 때문에 업종 없이 검색하면 400이다.
 * 업종을 바꾸면 선택된 브랜드도 초기화된다.
 */

import { districts } from '@/data/districts'
import {
  SIMULATION_FLOOR_TYPES,
  findSimulationServiceType,
  isSimulationServiceCode,
} from '@/data/simulation-service-types'
import { buildSimulationReportRequest } from '@/lib/api/simulation'
import type {
  SimulationFloorType,
  SimulationReportRequest,
} from '@/types/simulation'

/* ------------------------------------------------------------------ *
 * 섹션
 * ------------------------------------------------------------------ */

/**
 * 조건 4섹션. 브랜드 검색은 독립 섹션이 아니라 **업종 섹션 안**에 있다.
 *
 * 순서는 화면에 놓이는 순서일 뿐 잠금 순서가 아니다 — 어느 섹션이든 언제든 고칠 수 있다.
 * 순서 배열이 여전히 필요한 이유는 두 가지다: (1) 남은 조건을 화면 순서대로 안내하려면,
 * (2) 완료 판정을 한 곳에서 순회하려면.
 */
export const SIMULATION_CONDITION_SECTIONS = [
  'franchise',
  'district',
  'service',
  'store',
] as const

export type SimulationConditionSection =
  (typeof SIMULATION_CONDITION_SECTIONS)[number]

export const SIMULATION_CONDITION_SECTION_LABELS: Record<
  SimulationConditionSection,
  string
> = {
  franchise: '창업 형태',
  district: '자치구',
  service: '업종',
  store: '매장 조건',
}

/**
 * 섹션의 DOM id. 오류 배너의 "다시 선택" CTA와 하단 요약 바가 같은 앵커로 스크롤한다.
 * 문자열을 두 군데서 각각 조립하면 한쪽만 바뀌어도 조용히 스크롤이 죽으므로 여기서 만든다.
 */
export const simulationSectionDomId = (
  section: SimulationConditionSection,
): string => `simulation-section-${section}`

/* ------------------------------------------------------------------ *
 * 상태
 * ------------------------------------------------------------------ */

export type SimulationConditionState = {
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

export const createEmptySimulationConditionState =
  (): SimulationConditionState => ({
    franchisee: null,
    franchiseeId: null,
    brandName: null,
    districtCode: null,
    serviceCode: null,
    storeSize: null,
    floorType: null,
  })

/** 브랜드 아이디는 검색 응답에서만 오는 양의 정수다. 그 밖의 값은 조건으로 인정하지 않는다. */
const isFranchiseeId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0

/**
 * 분석 화면·복원 링크에서 넘어온 조건으로 초기값을 채운다. 지원하지 않는 값은 조용히 버린다.
 *
 * 브랜드(`franchiseeId`/`brandName`)는 **`franchisee === true` 일 때만** 살린다.
 * `selectFranchisee` 가 창업 형태를 바꿀 때 브랜드를 비우는 것과 같은 규칙이다 — 손상된 링크로
 * `franchisee=false&franchiseeId=101` 이 들어와도 화면에 모순된 상태가 만들어지지 않게 한다.
 */
export const createSimulationConditionState = (
  initial: Partial<SimulationConditionState> = {},
): SimulationConditionState => {
  const state = createEmptySimulationConditionState()

  if (initial.franchisee === true || initial.franchisee === false) {
    state.franchisee = initial.franchisee
  }
  if (state.franchisee === true) {
    if (isFranchiseeId(initial.franchiseeId)) {
      state.franchiseeId = initial.franchiseeId
    }
    const brandName = initial.brandName?.trim()
    if (brandName) state.brandName = brandName
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

/** 층 구분 enum → 표시명. 피커 밖에서 만들어진 값은 없으므로 미지의 코드는 null이다. */
export const describeSimulationFloorType = (
  floorType: SimulationFloorType | null | undefined,
): string | null =>
  SIMULATION_FLOOR_TYPES.find(item => item.code === floorType)?.name ?? null

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
 * 선택 전이 — 뒤 조건을 무효화하는 것이 핵심이다
 * ------------------------------------------------------------------ */

/** 프랜차이즈 여부를 바꾸면 브랜드 선택이 의미를 잃는다. */
export const selectFranchisee = (
  state: SimulationConditionState,
  franchisee: boolean,
): SimulationConditionState =>
  state.franchisee === franchisee
    ? state
    : { ...state, franchisee, franchiseeId: null, brandName: null }

export const selectDistrict = (
  state: SimulationConditionState,
  districtCode: string,
): SimulationConditionState =>
  state.districtCode === districtCode ? state : { ...state, districtCode }

/**
 * 업종을 바꾸면 **브랜드와 매장 크기를 함께 비운다.**
 * 브랜드는 업종별 목록이라 다른 업종의 `franchiseeId`를 그대로 보내면 400/404가 되고,
 * 매장 크기 프리셋(소/중/대)도 업종별 값이라 앞 업종 기준 숫자가 남으면 근거 없는 입력이 된다.
 */
export const selectService = (
  state: SimulationConditionState,
  serviceCode: string,
): SimulationConditionState =>
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
  state: SimulationConditionState,
  brand: { franchiseeId: number; brandName: string } | null,
): SimulationConditionState => ({
  ...state,
  franchiseeId: brand?.franchiseeId ?? null,
  brandName: brand?.brandName ?? null,
})

export const selectStoreSize = (
  state: SimulationConditionState,
  storeSize: number | null,
): SimulationConditionState => ({
  ...state,
  storeSize: isPositiveStoreSize(storeSize) ? storeSize : null,
})

export const selectFloorType = (
  state: SimulationConditionState,
  floorType: SimulationFloorType,
): SimulationConditionState => ({ ...state, floorType })

/* ------------------------------------------------------------------ *
 * 완료 판정
 * ------------------------------------------------------------------ */

export const isSimulationSectionComplete = (
  state: SimulationConditionState,
  section: SimulationConditionSection,
): boolean => {
  if (section === 'franchise') return state.franchisee !== null
  if (section === 'district') return state.districtCode !== null
  if (section === 'service') {
    // 프랜차이즈 창업이면 브랜드까지 골라야 업종 섹션이 끝난다 (요청에 franchiseeId 필수).
    if (!isSimulationServiceCode(state.serviceCode)) return false
    return state.franchisee === true ? state.franchiseeId !== null : true
  }
  return isPositiveStoreSize(state.storeSize) && state.floorType !== null
}

/** 아직 비어 있는 섹션들. 화면 순서대로 준다 — 결과 패널의 체크리스트가 이 순서를 쓴다. */
export const listMissingSimulationSections = (
  state: SimulationConditionState,
): readonly SimulationConditionSection[] =>
  SIMULATION_CONDITION_SECTIONS.filter(
    section => !isSimulationSectionComplete(state, section),
  )

export const isSimulationConditionsComplete = (
  state: SimulationConditionState,
): boolean => listMissingSimulationSections(state).length === 0

/**
 * 섹션에 지금 들어 있는 값 한 줄. 비어 있으면 null.
 *
 * 결과 패널의 조건 체크리스트가 "완료/남음"만 보여주면 무엇을 골랐는지 다시 위로 올라가
 * 확인해야 한다. 그래서 값 자체를 함께 보여주고, 그 문구를 여기서 만든다.
 * 매장 조건은 크기·층 중 하나만 골라도 그만큼 보여준다(부분 진행이 보이는 편이 낫다).
 */
export const describeSimulationSectionValue = (
  state: SimulationConditionState,
  section: SimulationConditionSection,
): string | null => {
  if (section === 'franchise') {
    if (state.franchisee === null) return null
    return state.franchisee ? '프랜차이즈' : '개인 창업'
  }

  if (section === 'district') {
    return findDistrictByCode(state.districtCode)?.name ?? null
  }

  if (section === 'service') {
    const serviceName = describeSimulationServiceName(state.serviceCode)
    if (!serviceName) return null
    return state.brandName ? `${serviceName} · ${state.brandName}` : serviceName
  }

  const parts: string[] = []
  if (isPositiveStoreSize(state.storeSize)) parts.push(`${state.storeSize}㎡`)
  const floorName = describeSimulationFloorType(state.floorType)
  if (floorName) parts.push(floorName)
  return parts.length > 0 ? parts.join(' · ') : null
}

/** 비어 있는 첫 섹션을 안내 문구로 바꾼다. 모두 채웠으면 null. */
export const describeSimulationConditionGap = (
  state: SimulationConditionState,
): string | null => {
  const [section] = listMissingSimulationSections(state)
  if (!section) return null
  if (section === 'franchise') return '프랜차이즈 창업인지 먼저 선택해 주세요'
  if (section === 'district') return '창업할 자치구를 선택해 주세요'
  if (section === 'service') {
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
 * 조건 상태 → `POST /simulations/reports` 본문. 미완성이면 null.
 *
 * `periodCode`는 **넘기지 않는다.** 입력 화면에 노출하지 않기로 확정했고(D8-1 #2),
 * 빈 문자열을 실어 보내면 400 `SIMULATION_106`이라 키째 빼서 서버 기본값(20233)을 쓴다.
 * 비프랜차이즈일 때 `franchiseeId` 키가 빠지는 것은 `buildSimulationReportRequest`가 처리한다.
 */
export const toSimulationReportRequest = (
  state: SimulationConditionState,
): SimulationReportRequest | null => {
  if (!isSimulationConditionsComplete(state)) return null

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
 * 오류 → 되돌릴 조건
 * ------------------------------------------------------------------ */

/**
 * 서버 오류코드를 "어느 조건으로 되돌릴지"로 옮긴다.
 *
 * **재시도 여부·심각도 판정에는 절대 쓰지 않는다** — 그건 `api-error`의 `kind`가 정한다.
 * 여기서 `resultCode`를 보는 이유는 단 하나, 404가 왔을 때 사용자를 어느 선택지로
 * 돌려보낼지 정하기 위해서다(임대료 없는 자치구인지, 사라진 브랜드인지).
 * 모르는 코드는 null → 화면은 이동 버튼 없이 서버 메시지만 보여준다.
 */
export const resolveSimulationRecoverySection = (
  code: string | null | undefined,
): SimulationConditionSection | null => {
  if (code === 'SIMULATION_001') return 'service'
  if (code === 'SIMULATION_002') return 'district'
  if (code === 'SIMULATION_003' || code === 'SIMULATION_004') return 'service'
  return null
}

/** 요청 검증 실패(`fieldErrors[].field`)를 섹션으로 옮긴다. 모르는 필드는 null. */
export const resolveSimulationFieldSection = (
  field: string | null | undefined,
): SimulationConditionSection | null => {
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
