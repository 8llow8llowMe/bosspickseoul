import { districts } from '@/data/districts'
import { findSimulationCategoryByCode } from '@/data/simulation-catalog'
import { resolveDistrictCodeFromAdministration } from '@/lib/map/geometry'

import type {
  RecommendationOption,
  RecommendationState,
} from './recommend-state'

/**
 * `/recommend` 의 URL 상태.
 *
 * **파라미터 이름은 `/analysis` 와 같다** — 같은 값에 다른 이름을 쓰면 분석↔추천
 * 딥링크에서 매번 변환해야 한다.
 *
 * 이름(`name`)은 URL 에 싣지 않는다. 카탈로그가 바뀌면 링크가 옛 이름을 들고
 * 되살아나기 때문이다. 코드만 나르고 이름은 복원할 때 다시 찾는다.
 */

export const RECOMMEND_URL_PARAMS = {
  district: 'districtCode',
  administration: 'administrationCode',
  service: 'serviceCode',
  commercial: 'commercialCode',
  view: 'view',
} as const

/** `view` 가 가질 수 있는 유일한 값. `picker` 는 일시 UI 라 URL 에 넣지 않는다. */
const RESULTS_VIEW = 'results'

export type RecommendUrlState = {
  district: RecommendationOption | null
  administration: RecommendationOption | null
  service: RecommendationOption | null
  /** 「상권 추천받기」를 눌러 결과 단계에 있었는가. */
  isResultsView: boolean
  /** 사용자가 **직접** 고른 상권. 자동 선택된 1위는 여기 오지 않는다. */
  commercialCode: string | null
}

export const EMPTY_RECOMMEND_URL_STATE: RecommendUrlState = {
  district: null,
  administration: null,
  service: null,
  isResultsView: false,
  commercialCode: null,
}

/** 검색 파라미터를 읽는 최소 인터페이스. `URLSearchParams` 와 Next 의 것 모두 만족한다. */
export type ReadableSearchParams = {
  get(name: string): string | null
}

const readCode = (
  params: ReadableSearchParams,
  name: string,
): string | null => {
  const value = params.get(name)?.trim()

  return value ? value : null
}

const findDistrict = (code: string | null): RecommendationOption | null => {
  if (!code) return null

  const record = districts.find(district => String(district.gooCode) === code)

  return record ? { code: String(record.gooCode), name: record.gooName } : null
}

const findService = (code: string | null): RecommendationOption | null => {
  if (!code) return null

  // `{ category, item }` 을 돌려준다 — 항목 자체가 아니다.
  const matched = findSimulationCategoryByCode(code)

  return matched ? { code, name: matched.item.name } : null
}

/**
 * URL 을 화면이 복원할 수 있는 상태로 옮긴다.
 *
 * **부분 복원하지 않는다.** 자치구가 유효하지 않으면 그 아래(행정동·업종·결과)를 모두
 * 버린다 — 반쯤 복원된 화면은 사용자가 저장한 화면이 아니고, 어디가 어긋났는지도
 * 말해 주지 않는다.
 *
 * 행정동 이름만은 여기서 알 수 없다(정적 목록이 없고 API 로만 온다). 이름을 빈 문자열로
 * 두고 목록이 도착하면 채운다 — 그동안 조건 바는 자리표시자를 보여 준다.
 */
export const parseRecommendUrlState = (
  params: ReadableSearchParams,
): RecommendUrlState => {
  const administrationCode = readCode(
    params,
    RECOMMEND_URL_PARAMS.administration,
  )
  // 딥링크가 행정동만 넘길 수 있다. 앞 5자리가 자치구 코드라 유도해서 살린다.
  const districtCode =
    readCode(params, RECOMMEND_URL_PARAMS.district) ??
    (administrationCode
      ? resolveDistrictCodeFromAdministration(administrationCode)
      : null)
  const district = findDistrict(districtCode)

  if (!district) return EMPTY_RECOMMEND_URL_STATE

  // 다른 자치구의 행정동은 그 자치구 목록에 없다. 자치구는 살리고 행정동만 버린다.
  const administration =
    administrationCode &&
    resolveDistrictCodeFromAdministration(administrationCode) === district.code
      ? { code: administrationCode, name: '' }
      : null
  const service = findService(readCode(params, RECOMMEND_URL_PARAMS.service))
  // 조건이 덜 차 있으면 결과를 낼 수 없다. `view` 를 버리고 조건 화면으로 둔다.
  const isResultsView =
    params.get(RECOMMEND_URL_PARAMS.view) === RESULTS_VIEW &&
    administration !== null &&
    service !== null

  return {
    district,
    administration,
    service,
    isResultsView,
    // 결과 화면이 아니면 고른 상권도 의미가 없다.
    commercialCode: isResultsView
      ? readCode(params, RECOMMEND_URL_PARAMS.commercial)
      : null,
  }
}

/**
 * 상태를 URL 검색 파라미터로 옮긴다. 조건 코드가 먼저 오고 화면 상태가 뒤에 온다 —
 * 사람이 주소창을 읽을 때 「무엇을 추천받는지」가 먼저 보이게 한다.
 *
 * **자동 선택된 1위는 쓰지 않는다.** 그것까지 실으면 「3위를 보던 화면」을 공유해도
 * 받는 사람은 1위를 보게 되어 링크가 조용히 거짓말한다.
 */
export const createRecommendSearchParams = (
  state: Pick<
    RecommendationState,
    'draft' | 'view' | 'selectedCommercialCode' | 'resultSelectionSource'
  >,
): URLSearchParams => {
  const params = new URLSearchParams()
  const { district, administration, service } = state.draft

  if (district) params.set(RECOMMEND_URL_PARAMS.district, district.code)
  if (administration) {
    params.set(RECOMMEND_URL_PARAMS.administration, administration.code)
  }
  if (service) params.set(RECOMMEND_URL_PARAMS.service, service.code)

  if (state.view !== 'results') return params

  params.set(RECOMMEND_URL_PARAMS.view, RESULTS_VIEW)

  if (state.resultSelectionSource === 'user' && state.selectedCommercialCode) {
    params.set(RECOMMEND_URL_PARAMS.commercial, state.selectedCommercialCode)
  }

  return params
}

/** 검색 파라미터가 없으면 `/recommend` 그대로 — 빈 `?` 를 남기지 않는다. */
export const createRecommendHref = (
  state: Parameters<typeof createRecommendSearchParams>[0],
): string => {
  const query = createRecommendSearchParams(state).toString()

  return query ? `/recommend?${query}` : '/recommend'
}

/**
 * 분석 화면에서 넘어오는 딥링크. **코드만 나른다.**
 *
 * `/analysis` 는 상권·업종까지 고르게 하지만 추천은 상권을 *찾아 주는* 쪽이라
 * 상권 코드는 싣지 않는다. 업종은 `findSimulationCategoryByCode` 가 모르는 코드면
 * `parseRecommendUrlState` 가 조용히 버리고 자치구·행정동만 살린다.
 */
export const createRecommendHrefFromCodes = ({
  districtCode,
  administrationCode,
  serviceCode,
}: {
  districtCode?: string | null
  administrationCode?: string | null
  serviceCode?: string | null
}): string => {
  const params = new URLSearchParams()

  if (districtCode) params.set(RECOMMEND_URL_PARAMS.district, districtCode)
  if (administrationCode) {
    params.set(RECOMMEND_URL_PARAMS.administration, administrationCode)
  }
  if (serviceCode) params.set(RECOMMEND_URL_PARAMS.service, serviceCode)

  const query = params.toString()

  return query ? `/recommend?${query}` : '/recommend'
}
