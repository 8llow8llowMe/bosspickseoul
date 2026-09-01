import {
  RECOMMEND_URL_PARAMS,
  type ReadableSearchParams,
} from './recommend-url'

/**
 * `/recommend/compare` 의 URL 상태.
 *
 * **점수를 싣지 않는다.** `recommend-url.ts` 가 이름을 싣지 않는 것과 같은 이유다 —
 * 링크가 낡은 값을 들고 되살아난다. 점수는 화면이 매번 다시 얻는다.
 *
 * 조건(자치구·행정동·업종)은 전 열 공통이라 `a.`/`b.` 접두사가 필요 없다.
 * 접두사는 좌우가 서로 다른 조건을 갖는 `simulation/compare` 의 문제를 푸는 장치다.
 */

export const COMPARE_MIN_COMMERCIALS = 2
export const COMPARE_MAX_COMMERCIALS = 4

export const COMPARE_COMMERCIALS_PARAM = 'commercialCodes'

const COMPARE_PATH = '/recommend/compare'

export type CompareUrlState = {
  districtCode: string | null
  administrationCode: string | null
  serviceCode: string | null
  commercialCodes: string[]
  /**
   * 상한을 넘겨 잘라냈는가. **화면이 이 사실을 말해야 하므로** 파서가 알려 준다 —
   * 조용히 자르면 사용자는 자기가 고른 것이 다 보이는 줄 안다.
   */
  truncated: boolean
}

export const EMPTY_COMPARE_URL_STATE: CompareUrlState = {
  districtCode: null,
  administrationCode: null,
  serviceCode: null,
  commercialCodes: [],
  truncated: false,
}

const readCode = (
  params: ReadableSearchParams,
  name: string,
): string | null => {
  const value = params.get(name)?.trim()

  return value ? value : null
}

/**
 * 중복은 첫 등장만 남기고 **순서는 URL 순서를 지킨다.**
 * `createStableCommercialCodes` 는 정렬하므로 여기서 쓰지 않는다 — 그것은 요청
 * 캐시 키를 만드는 물건이고, 열 순서는 사용자가 고른 순서여야 한다.
 */
const readCommercialCodes = (
  params: ReadableSearchParams,
): { codes: string[]; truncated: boolean } => {
  const raw = params.get(COMPARE_COMMERCIALS_PARAM)
  if (!raw) return { codes: [], truncated: false }

  const unique: string[] = []
  raw
    .split(',')
    .map(code => code.trim())
    .filter(Boolean)
    .forEach(code => {
      if (!unique.includes(code)) unique.push(code)
    })

  return {
    codes: unique.slice(0, COMPARE_MAX_COMMERCIALS),
    truncated: unique.length > COMPARE_MAX_COMMERCIALS,
  }
}

export const parseCompareUrlState = (
  params: ReadableSearchParams,
): CompareUrlState => {
  const { codes, truncated } = readCommercialCodes(params)

  return {
    districtCode: readCode(params, RECOMMEND_URL_PARAMS.district),
    administrationCode: readCode(params, RECOMMEND_URL_PARAMS.administration),
    serviceCode: readCode(params, RECOMMEND_URL_PARAMS.service),
    commercialCodes: codes,
    truncated,
  }
}

/** 표를 그릴 수 있는 상태인가. 조건 셋이 다 있고 상권이 하한 이상. */
export const isCompleteCompareState = (state: CompareUrlState): boolean =>
  Boolean(
    state.districtCode &&
    state.administrationCode &&
    state.serviceCode &&
    state.commercialCodes.length >= COMPARE_MIN_COMMERCIALS,
  )

export const createCompareHref = ({
  districtCode,
  administrationCode,
  serviceCode,
  commercialCodes,
}: {
  districtCode: string
  administrationCode: string
  serviceCode: string
  commercialCodes: readonly string[]
}): string => {
  const params = new URLSearchParams()
  params.set(RECOMMEND_URL_PARAMS.district, districtCode)
  params.set(RECOMMEND_URL_PARAMS.administration, administrationCode)
  params.set(RECOMMEND_URL_PARAMS.service, serviceCode)
  params.set(
    COMPARE_COMMERCIALS_PARAM,
    commercialCodes.slice(0, COMPARE_MAX_COMMERCIALS).join(','),
  )

  return `${COMPARE_PATH}?${params}`
}
