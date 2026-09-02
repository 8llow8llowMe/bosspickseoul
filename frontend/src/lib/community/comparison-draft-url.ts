import type { ReadableSearchParams } from '@/lib/recommend/recommend-url'

/**
 * 상권 비교 결과를 커뮤니티 글쓰기로 넘기는 URL 상태.
 *
 * 초안 본문은 **URL 에 싣지 않는다.** 글쓰기 화면이 이 네 코드로 백엔드에
 * 초안(`POST /community/posts/drafts/commercial-comparisons`)을 다시 받아 온다.
 * 제목·본문을 실어 보내면 링크가 낡은 문장을 들고 되살아나고, 길이 제한에도 걸린다 —
 * `compare-url.ts` 가 점수를 싣지 않는 것과 같은 이유다.
 *
 * 이 방향이라야 **로그인 왕복을 통과한다.** 글쓰기는 로그인이 필요하고, 미로그인 진입은
 * 현재 URL 을 그대로 이어붙여 로그인 화면으로 보낸다(`getCommunityLoginHref`).
 * 초안이 URL 에 있으면 돌아왔을 때 그대로 살아 있다.
 *
 * `periodCode` 는 **싣지 않는다.** 비교 화면과 같은 상수(`RECOMMENDATION_PERIOD_CODE`)를
 * 양쪽이 함께 쓴다 — URL 에 담으면 링크가 낡은 분기를 고정한 채 되살아난다.
 */

/** 초안 종류를 밝히는 파라미터. 뒤에 다른 초안이 생겨도 이 값으로 갈린다. */
const DRAFT_SOURCE_PARAM = 'draftSource'
const COMPARISON_DRAFT_SOURCE = 'comparison'

const REGISTER_PATH = '/community/register'

export type ComparisonDraftParams = {
  leftCommercialCode: string
  rightCommercialCode: string
  serviceCode: string
  /** 게시글이 붙을 대상. 비교는 두 상권에 관한 글이라 **행정동**에 붙인다. */
  administrationCode: string
}

/**
 * `invalid` 를 `none` 과 구분하는 이유: 초안을 요청했는데 값이 깨진 경우를 조용히
 * 빈 폼으로 넘기면, 사용자는 자기가 누른 것이 왜 아무 일도 안 했는지 알 수 없다.
 */
export type ComparisonDraftRequest =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'ready'; params: ComparisonDraftParams }

const PARAM_NAMES = [
  'leftCommercialCode',
  'rightCommercialCode',
  'serviceCode',
  'administrationCode',
] as const satisfies readonly (keyof ComparisonDraftParams)[]

const readCode = (
  params: ReadableSearchParams,
  name: string,
): string | null => {
  const value = params.get(name)?.trim()

  return value ? value : null
}

export const readComparisonDraftRequest = (
  params: ReadableSearchParams,
): ComparisonDraftRequest => {
  if (params.get(DRAFT_SOURCE_PARAM)?.trim() !== COMPARISON_DRAFT_SOURCE) {
    return { kind: 'none' }
  }

  const values = PARAM_NAMES.map(name => readCode(params, name))
  if (values.some(value => value === null)) {
    return { kind: 'invalid' }
  }

  const [
    leftCommercialCode,
    rightCommercialCode,
    serviceCode,
    administrationCode,
  ] = values as string[]

  // 같은 상권끼리는 비교가 성립하지 않는다. 백엔드도 막지만, 여기서 걸러야
  // 무의미한 호출과 그 실패 안내를 사용자에게 보이지 않는다.
  if (leftCommercialCode === rightCommercialCode) {
    return { kind: 'invalid' }
  }

  return {
    kind: 'ready',
    params: {
      leftCommercialCode,
      rightCommercialCode,
      serviceCode,
      administrationCode,
    },
  }
}

export const createComparisonDraftHref = ({
  leftCommercialCode,
  rightCommercialCode,
  serviceCode,
  administrationCode,
}: ComparisonDraftParams): string => {
  const params = new URLSearchParams({
    [DRAFT_SOURCE_PARAM]: COMPARISON_DRAFT_SOURCE,
    leftCommercialCode,
    rightCommercialCode,
    serviceCode,
    administrationCode,
  })

  return `${REGISTER_PATH}?${params}`
}
