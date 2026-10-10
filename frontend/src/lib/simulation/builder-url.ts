/**
 * 입력 화면의 **조건 → 주소창 거울**(#568).
 *
 * 조건 복원은 원래 쿼리를 읽을 때뿐이었다. 4개를 고른 뒤 새로고침하거나 헤더의 「저장한 결과」를 보고
 * 돌아오면 처음부터 다시 골라야 했다. 그래서 조건이 바뀔 때마다 주소창을 조건 코덱
 * (`toSimulationConditionSearchParams`) 형식으로 맞춘다. 읽는 쪽은 그대로 `parseSimulationConditionState`
 * 다 — 리포트의 「조건 다시 고르기」 링크와 같은 키라 쓰는 쪽·읽는 쪽 규칙이 한 벌이다.
 *
 * - **조건 키만 바꾼다.** 분석 컨텍스트의 `gugun`·`commercialCode` 처럼 이 코덱이 모르는 키와 해시
 *   (`#simulation-section-…`)는 그대로 둔다. 지우면 분석에서 넘어온 컨텍스트 카드가 새로고침에 사라진다.
 * - **히스토리를 쌓지 않는다**(`replaceState`). 조건 하나마다 항목이 생기면 뒤로가기가 이 화면 안에서
 *   조건을 하나씩 되감는다.
 */

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
 * 분석 경유 화면(`/analysis/simulation`)에서 **거울이 건드리지 않는 키** — 분석 컨텍스트 카드의 정본이다.
 *
 * 분석 화면은 `?districtCode=…&administrationCode=…&commercialCode=…&serviceCode=…` 로 넘어오고, 컨텍스트
 * 카드(`parseSimulationAnalysisContext`)가 이 키를 읽어 「분석 조건을 그대로 채워 뒀어요」를 말한다. 그런데
 * `districtCode`·`serviceCode` 는 조건 코덱과 키가 같다. 거울이 덮어쓰면 자치구·업종을 바꾼 뒤 새로고침했을 때
 * 바뀐 값이 「분석 조건」으로 읽혀 카드가 사실과 다른 말을 한다. 그래서 이 변형에서는 이 키들을 진입 값
 * 그대로 두고 나머지 조건 키(창업 형태·브랜드·면적·층)만 거울에 싣는다. 대가로 새로고침하면 자치구·업종은
 * 분석에서 가져온 값으로 돌아오고, 카드의 「분석 조건으로 되돌리기」와 같은 상태가 된다.
 */
export const SIMULATION_ANALYSIS_CONTEXT_PARAM_NAMES = [
  'districtCode',
  'serviceCode',
  'administrationCode',
  'commercialCode',
] as const

const isMirrored = (name: string, variant: SimulationReportVariant): boolean =>
  variant !== 'analysis' ||
  !(SIMULATION_ANALYSIS_CONTEXT_PARAM_NAMES as readonly string[]).includes(name)

export type SimulationBuilderLocation = {
  pathname: string
  /** `?` 를 포함하거나 비어 있는 `location.search`. */
  search: string
  /** `#` 를 포함하거나 비어 있는 `location.hash`. */
  hash: string
}

/**
 * 지금 주소에서 조건 키만 지금 조건으로 바꾼 경로(`pathname?query#hash`). 조건 밖의 키와 해시는 남긴다.
 * `analysis` 변형은 분석 컨텍스트 키(`SIMULATION_ANALYSIS_CONTEXT_PARAM_NAMES`)도 남긴다.
 * 쓸 쿼리가 하나도 없으면 `?` 없이 경로만 돌려준다.
 */
export const buildSimulationBuilderMirrorHref = (
  location: SimulationBuilderLocation,
  state: SimulationConditionState,
  variant: SimulationReportVariant = 'standalone',
): string => {
  const params = new URLSearchParams(location.search)
  for (const name of SIMULATION_CONDITION_PARAM_NAMES) {
    if (isMirrored(name, variant)) params.delete(name)
  }
  toSimulationConditionSearchParams(state).forEach((value, name) => {
    if (isMirrored(name, variant)) params.set(name, value)
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
): void => {
  if (typeof window === 'undefined') return

  const { pathname, search, hash } = window.location
  const href = buildSimulationBuilderMirrorHref(
    { pathname, search, hash },
    state,
    variant,
  )
  if (href === `${pathname}${search}${hash}`) return

  window.history.replaceState(window.history.state, '', href)
}
