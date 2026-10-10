/**
 * 입력 화면의 **조건 → 주소창 거울**(#568).
 *
 * 조건 복원은 원래 쿼리를 읽을 때뿐이었다. 4개를 고른 뒤 새로고침하거나 헤더의 「저장한 결과」를 보고
 * 돌아오면 처음부터 다시 골라야 했다. 그래서 조건이 바뀔 때마다 주소창을 조건 코덱
 * (`toSimulationConditionSearchParams`) 형식으로 맞춘다. 읽는 쪽은 그대로 `parseSimulationConditionState`
 * 다 — 리포트의 「조건 다시 고르기」 링크와 같은 키라 쓰는 쪽·읽는 쪽 규칙이 한 벌이다.
 *
 * - **조건 키만 바꾼다.** 이 코덱이 모르는 키와 해시(`#simulation-section-…`)는 그대로 둔다.
 * - **분석 경유 화면은 컨텍스트도 쓴다(#635).** 마운트 때 고정한 컨텍스트를 새 형식(표식 `ctx=1` + `ctx` 키)으로
 *   적고, 옛 형식의 컨텍스트 키는 지운다. 지금 주소에서 컨텍스트를 다시 읽지 않는다 — 거울이 쓴 조건 키를
 *   컨텍스트로 오독하지 않게.
 * - **히스토리를 쌓지 않는다**(`replaceState`). 조건 하나마다 항목이 생기면 뒤로가기가 이 화면 안에서
 *   조건을 하나씩 되감는다.
 */

import {
  LEGACY_SIMULATION_ANALYSIS_ONLY_PARAM_NAMES,
  SIMULATION_ANALYSIS_CONTEXT_MARKER,
  SIMULATION_ANALYSIS_CONTEXT_PARAMS,
  toSimulationAnalysisContextSearchParams,
  type SimulationAnalysisContext,
} from '@/lib/simulation/analysis-context'
import type { SimulationConditionState } from '@/lib/simulation/conditions'
import {
  toSimulationConditionSearchParams,
  type SimulationReportVariant,
} from '@/lib/simulation/report-route'

/**
 * 조건 코덱이 쓰는 키 전부. 거울은 이 키를 지우고 지금 조건으로 다시 쓴다 — 비워진 칸(업종을 바꿔
 * 비워진 면적 등)이 주소창에 옛 값으로 남지 않게. 코덱에 키가 늘면 테스트가 이 목록과 어긋남을 잡는다.
 */
export const SIMULATION_CONDITION_PARAM_NAMES = [
  'franchisee',
  'franchiseeId',
  'brandName',
  'districtCode',
  'serviceCode',
  'storeSize',
  'floorType',
] as const

/**
 * 분석 경유 화면(`/analysis/simulation`)의 컨텍스트를 **새 형식으로 다시 쓴다**(#635).
 *
 * 컨텍스트는 이제 `ctx` 키(`SIMULATION_ANALYSIS_CONTEXT_PARAMS`)에 있어 조건 키와 겹치지 않는다. 그래서 거울은
 * 이 화면에서도 자치구·업종을 포함한 조건 키를 모두 싣는다.
 *
 * 무엇을 쓸지는 **화면이 마운트 때 읽어 고정한 컨텍스트**가 정한다. 지금 주소에서 다시 읽으면, 컨텍스트 없이 연
 * 화면에서 거울이 앞서 쓴 `districtCode` 가 옛 형식의 컨텍스트로 읽혀 `ctxDistrictCode` 로 굳는다. 옛 형식 링크
 * (`?districtCode=…&administrationCode=…&commercialCode=…&serviceCode=…`, 더 옛날의 `gugun`)도 마운트 때 읽은
 * 컨텍스트가 그대로 `ctx` 키로 옮겨지고, 조건이 아닌 옛 키(`gugun`·`administrationCode`·`commercialCode`)는 지운다.
 * 컨텍스트가 없어도 표식(`ctx=1`)은 쓴다. 새로고침 뒤 옛 형식으로 읽히지 않게 하는 것이 표식의 일이다.
 */
const writeAnalysisContext = (
  params: URLSearchParams,
  context: SimulationAnalysisContext | null,
): void => {
  for (const name of LEGACY_SIMULATION_ANALYSIS_ONLY_PARAM_NAMES) {
    params.delete(name)
  }
  params.delete(SIMULATION_ANALYSIS_CONTEXT_MARKER.name)
  for (const name of Object.values(SIMULATION_ANALYSIS_CONTEXT_PARAMS)) {
    params.delete(name)
  }
  toSimulationAnalysisContextSearchParams(context).forEach((value, name) => {
    params.set(name, value)
  })
}

export type SimulationBuilderLocation = {
  pathname: string
  /** `?` 를 포함하거나 비어 있는 `location.search`. */
  search: string
  /** `#` 를 포함하거나 비어 있는 `location.hash`. */
  hash: string
}

/**
 * 지금 주소에서 조건 키만 지금 조건으로 바꾼 경로(`pathname?query#hash`). 조건 밖의 키와 해시는 남긴다.
 * `analysis` 변형은 `analysisContext`(마운트 때 고정한 값)를 새 형식으로 함께 쓴다.
 * 쓸 쿼리가 하나도 없으면 `?` 없이 경로만 돌려준다.
 */
export const buildSimulationBuilderMirrorHref = (
  location: SimulationBuilderLocation,
  state: SimulationConditionState,
  variant: SimulationReportVariant = 'standalone',
  analysisContext: SimulationAnalysisContext | null = null,
): string => {
  const params = new URLSearchParams(location.search)
  if (variant === 'analysis') writeAnalysisContext(params, analysisContext)
  for (const name of SIMULATION_CONDITION_PARAM_NAMES) {
    params.delete(name)
  }
  toSimulationConditionSearchParams(state).forEach((value, name) => {
    params.set(name, value)
  })

  const query = params.toString()
  return `${location.pathname}${query ? `?${query}` : ''}${location.hash}`
}

/**
 * 주소창을 지금 조건에 맞춘다. 이미 같으면 아무것도 하지 않는다.
 *
 * 첫 인자로 `window.history.state` 를 넘기는 것은 추천 화면(`recommend-page.tsx` 의 `writeUrlMirror`)과
 * 같은 이유다. Next 가 덮어쓴 `replaceState` 는 `__NA` 표식이 있는 상태를 「내부 호출」로 보고 라우터를
 * 건드리지 않는다. `null` 을 넘기면 조건을 하나 고를 때마다 RSC 왕복(네비게이션 한 번)이 붙는다.
 * 대가로 `useSearchParams` 는 진입 시점 값에 머문다 — 이 화면은 그 값을 초기값으로만 읽어 문제가 없다.
 */
export const mirrorSimulationConditionsToUrl = (
  state: SimulationConditionState,
  variant: SimulationReportVariant = 'standalone',
  analysisContext: SimulationAnalysisContext | null = null,
): void => {
  if (typeof window === 'undefined') return

  const { pathname, search, hash } = window.location
  const href = buildSimulationBuilderMirrorHref(
    { pathname, search, hash },
    state,
    variant,
    analysisContext,
  )
  if (href === `${pathname}${search}${hash}`) return

  window.history.replaceState(window.history.state, '', href)
}
