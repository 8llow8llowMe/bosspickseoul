/**
 * `/analysis/simulation` 진입 시 상단 sticky 카드에 띄울 **분석 컨텍스트** 파싱.
 *
 * ## 컨텍스트 키는 조건 키와 따로 둔다 (#635)
 *
 * 분석 화면은 `ctx` 접두 키(`SIMULATION_ANALYSIS_CONTEXT_PARAMS`)로 컨텍스트를 싣는다. 시뮬레이션 조건은
 * 접두 없는 `districtCode`·`serviceCode` 를 쓴다(조건 코덱 `toSimulationConditionSearchParams`). 둘이 같은 키를
 * 쓰던 때(#568)에는 입력 화면의 URL 거울이 자치구·업종을 주소에 쓸 수 없었다. 쓰면 새로고침 뒤 사용자가 바꾼
 * 값이 「분석 조건」으로 읽히고, 안 쓰면 새로고침 뒤 바꾼 값이 분석 값으로 돌아갔다.
 *
 * ## 옛 링크 호환
 *
 * 새 형식 표식(`ctx=1`)도 `ctx` 키도 없으면 옛 형식(`districtCode`·`serviceCode`·`commercialCode`·
 * `administrationCode`, 더 옛날의 `gugun` = 자치구 **이름**)을 컨텍스트로 읽는다. 저장·공유된 옛 링크도 카드와
 * 함께 열린다. 입력 화면은 마운트 때 읽은 컨텍스트를 고정하고, 거울이 그 컨텍스트를 표식과 `ctx` 키로 적는다
 * (`builder-url.ts`). 그 뒤로는 키가 충돌하지 않는다.
 *
 * ## 리포트·비교 왕복
 *
 * 입력 화면 → 리포트·비교 → 「조건 다시 고르기」로 돌아와도 카드가 원래 분석 조건을 말하도록, 분석 경유 화면의
 * 링크는 표식과 `ctx` 키를 덧붙인다(`withSimulationAnalysisContext`). 리포트·비교는 그 키를 읽지 않고 옮기기만 한다.
 *
 * 파싱 결과는 **표시와 초기값 채우기에만** 쓴다. 컨텍스트가 없으면 null을 돌려주고,
 * 화면은 카드 없이 `/simulation`과 동일하게 동작해야 한다.
 */

import {
  findDistrictByCode,
  findDistrictByName,
  describeSimulationServiceName,
} from '@/lib/simulation/conditions'
import { isSimulationServiceCode } from '@/data/simulation-service-types'

type SearchParamsReader = {
  get(name: string): string | null
}

export type SimulationAnalysisContext = {
  districtCode: string | null
  districtName: string | null
  serviceCode: string | null
  serviceName: string | null
  /** 분석 화면에서 보고 있던 행정동 코드. 카드에는 쓰지 않고, 주소에 컨텍스트를 다시 실을 때만 쓴다. */
  administrationCode: string | null
  /** 분석 화면에서 보고 있던 상권 코드. 이름은 쿼리로 오지 않아 코드만 보관한다. */
  commercialCode: string | null
}

/** 분석 컨텍스트의 쿼리 키(#635). 조건 코덱의 키와 겹치지 않게 `ctx` 를 붙인다. */
export const SIMULATION_ANALYSIS_CONTEXT_PARAMS = {
  districtCode: 'ctxDistrictCode',
  administrationCode: 'ctxAdministrationCode',
  commercialCode: 'ctxCommercialCode',
  serviceCode: 'ctxServiceCode',
} as const

type SimulationAnalysisContextField =
  keyof typeof SIMULATION_ANALYSIS_CONTEXT_PARAMS

const CONTEXT_FIELDS = Object.keys(
  SIMULATION_ANALYSIS_CONTEXT_PARAMS,
) as SimulationAnalysisContextField[]

/**
 * 옛 형식(#635 이전)에서 컨텍스트를 실었던 키 가운데 **조건 키가 아닌 것**. `districtCode`·`serviceCode` 도
 * 컨텍스트를 실었지만 조건 키이기도 해서 거울이 지금 조건으로 다시 쓴다. 이 셋은 거울이 컨텍스트를 `ctx` 키로
 * 옮긴 뒤 지운다.
 */
export const LEGACY_SIMULATION_ANALYSIS_ONLY_PARAM_NAMES = [
  'gugun',
  'administrationCode',
  'commercialCode',
] as const

const read = (params: SearchParamsReader, name: string): string | null => {
  const value = params.get(name)?.trim()
  return value ? value : null
}

/**
 * **새 형식 표식**(`ctx=1`). 분석 경유 화면이 쓰는 주소에는 컨텍스트가 없어도 늘 붙는다.
 *
 * 이게 없으면 컨텍스트 없이 연 화면(빈 주소, 빈 코드 링크)에서 거울이 쓴 `districtCode` 가 새로고침 뒤 옛 형식의
 * 컨텍스트로 읽혀, 카드가 사용자가 고른 자치구를 「분석 조건」이라고 말한다. 표식이 있으면 옛 키를 읽지 않는다.
 */
export const SIMULATION_ANALYSIS_CONTEXT_MARKER = {
  name: 'ctx',
  value: '1',
} as const

/** 주소가 새 형식인가 — 표식이나 `ctx` 키가 하나라도 있으면 그렇다. 새 형식이면 옛 키를 읽지 않는다. */
export const hasSimulationAnalysisContextParams = (
  params: SearchParamsReader,
): boolean =>
  read(params, SIMULATION_ANALYSIS_CONTEXT_MARKER.name) !== null ||
  CONTEXT_FIELDS.some(
    field => read(params, SIMULATION_ANALYSIS_CONTEXT_PARAMS[field]) !== null,
  )

/**
 * 쿼리스트링에서 분석 컨텍스트를 읽는다. 쓸 값이 하나도 없으면 **null**.
 *
 * 새 형식(표식이나 `ctx` 키가 있음)이면 `ctx` 키만 본다. 아니면 옛 형식의 키를 읽는다. 둘을 섞지 않는다 —
 * 새 형식 주소의 `districtCode` 는 사용자가 고른 조건이지 분석 조건이 아니다.
 *
 * 입력 화면만 쓴다. 리포트·비교 주소의 `districtCode` 는 계산 조건이라 옛 형식으로 읽으면 안 된다 — 그쪽은
 * `readSimulationAnalysisContextParams` 로 `ctx` 키만 옮긴다.
 *
 * 지원하지 않는 업종 코드는 버린다 — 그대로 채워 넣으면 사용자가 고르지도 않은 조건으로
 * `store-sizes`가 404 `SIMULATION_001`을 내고, 원인이 화면에 드러나지 않는다.
 */
export const parseSimulationAnalysisContext = (
  params: SearchParamsReader,
): SimulationAnalysisContext | null => {
  const isCurrentFormat = hasSimulationAnalysisContextParams(params)
  const key = (field: SimulationAnalysisContextField) =>
    isCurrentFormat ? SIMULATION_ANALYSIS_CONTEXT_PARAMS[field] : field

  const districtByCode = findDistrictByCode(read(params, key('districtCode')))
  const districtByName =
    districtByCode || isCurrentFormat
      ? null
      : findDistrictByName(read(params, 'gugun'))
  const district = districtByCode ?? districtByName

  const rawServiceCode = read(params, key('serviceCode'))
  const serviceCode = isSimulationServiceCode(rawServiceCode)
    ? rawServiceCode
    : null

  const administrationCode = read(params, key('administrationCode'))
  const commercialCode = read(params, key('commercialCode'))

  if (!district && !serviceCode && !commercialCode) return null

  return {
    districtCode: district?.code ?? null,
    districtName: district?.name ?? null,
    serviceCode,
    serviceName: describeSimulationServiceName(serviceCode),
    administrationCode,
    commercialCode,
  }
}

export type SimulationAnalysisContextCodes = {
  [Field in SimulationAnalysisContextField]?: string | null
}

/**
 * 컨텍스트 → 새 형식 쿼리(표식 `ctx=1` + `ctx` 키). 비어 있는 칸은 키째 뺀다. 컨텍스트가 없어도(null) 표식은
 * 싣는다 — 그 주소가 「컨텍스트 없음」이라는 사실까지 새로고침 뒤에 남아야 한다.
 */
export const toSimulationAnalysisContextSearchParams = (
  codes: SimulationAnalysisContextCodes | null,
): URLSearchParams => {
  const params = new URLSearchParams()
  params.set(
    SIMULATION_ANALYSIS_CONTEXT_MARKER.name,
    SIMULATION_ANALYSIS_CONTEXT_MARKER.value,
  )
  for (const field of CONTEXT_FIELDS) {
    const value = codes?.[field]?.trim()
    if (value) params.set(SIMULATION_ANALYSIS_CONTEXT_PARAMS[field], value)
  }
  return params
}

/**
 * 리포트·비교 주소에서 **`ctx` 키만** 읽어 새 형식 쿼리로 돌려준다. 다음 화면으로 갈 때 덧붙여 컨텍스트를
 * 들고 다닌다. `parseSimulationAnalysisContext` 를 쓰지 않는다 — 그 주소의 `districtCode` 는 계산 조건이라
 * 옛 형식으로 읽으면 사용자가 고른 자치구가 분석 조건이 된다.
 *
 * `ctx` 키가 없는 주소(옛 리포트 링크)도 표식은 싣는다. 입력 화면에서 카드 없이 열리는 편이, 계산 조건을
 * 분석 조건이라고 말하는 카드보다 낫다.
 */
export const readSimulationAnalysisContextParams = (
  params: SearchParamsReader,
): URLSearchParams => {
  const codes: SimulationAnalysisContextCodes = {}
  for (const field of CONTEXT_FIELDS) {
    codes[field] = read(params, SIMULATION_ANALYSIS_CONTEXT_PARAMS[field])
  }
  return toSimulationAnalysisContextSearchParams(codes)
}

/**
 * 경로에 컨텍스트 쿼리를 덧붙인다(해시는 뒤에 남긴다). `contextParams` 가 없으면 그대로다 — 단독 화면
 * (`/simulation`)은 컨텍스트가 없다. 캐시 키는 요청에서 만들므로 이 키는 계산에 섞이지 않는다.
 */
export const withSimulationAnalysisContext = (
  href: string,
  contextParams: URLSearchParams | null | undefined,
): string => {
  const query = contextParams?.toString()
  if (!query) return href

  const hashIndex = href.indexOf('#')
  const base = hashIndex < 0 ? href : href.slice(0, hashIndex)
  const hash = hashIndex < 0 ? '' : href.slice(hashIndex)
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}${query}${hash}`
}

/**
 * 분석 결과 화면의 「이 상권 창업 비용 계산하기」가 여는 경로. 컨텍스트만 싣는다. 입력 화면이 비어 있는
 * 자치구·업종을 컨텍스트로 채우고, 첫 거울 쓰기에서 조건 키로도 적는다.
 */
export const buildSimulationAnalysisHref = (
  codes: SimulationAnalysisContextCodes,
): string =>
  `/analysis/simulation?${toSimulationAnalysisContextSearchParams(codes)}`

/**
 * 지금 화면의 선택이 **여전히 분석에서 가져온 조건 그대로인가.**
 *
 * 이게 필요한 이유: 컨텍스트 카드가 "조건을 그대로 채워 뒀어요"라고 말하는데 사용자가
 * 자치구·업종을 바꿔 버리면 카드가 거짓말을 하게 된다. 실제로 카드는 `서대문구`·`한식음식점`인데
 * 계산 결과는 `강동구`·`치킨전문점`인 화면이 나왔다. 어느 쪽이 진짜인지 알 수 없다.
 *
 * 판정은 **컨텍스트가 실제로 채운 값만** 본다. 자치구만 넘어온 링크에서 사용자가 업종을 고르는 건
 * "조건을 바꾼" 것이 아니라 원래 비어 있던 칸을 채운 것이므로 어긋남이 아니다.
 */
export const isSimulationContextApplied = (
  context: SimulationAnalysisContext,
  selection: {
    districtCode: string | null
    serviceCode: string | null
  },
): boolean => {
  if (context.districtCode && context.districtCode !== selection.districtCode) {
    return false
  }
  if (context.serviceCode && context.serviceCode !== selection.serviceCode) {
    return false
  }
  return true
}
