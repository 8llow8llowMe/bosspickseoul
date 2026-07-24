export type RecommendationOption = {
  readonly code: string
  readonly name: string
}

export type RecommendationView = 'criteria' | 'results'
export type RecommendationSheetSnap = 'expanded' | 'collapsed'

export type RecommendationCriteria = {
  district: RecommendationOption | null
  administration: RecommendationOption | null
  service: RecommendationOption | null
}

export type SubmittedRecommendation = {
  readonly district: RecommendationOption
  readonly administration: RecommendationOption
  readonly service: RecommendationOption
  readonly commercialCodes: readonly string[]
  readonly commercialCodesKey: string
  readonly requestKey: string
}

export type RecommendationState = {
  draft: RecommendationCriteria
  submitted: SubmittedRecommendation | null
  view: RecommendationView
  selectedCommercialCode: string | null
  sheetSnap: RecommendationSheetSnap
}

type RecommendationAction =
  | { type: 'districtSelected'; district: RecommendationOption }
  | {
      type: 'administrationSelected'
      administration: RecommendationOption
    }
  | { type: 'serviceSelected'; service: RecommendationOption }
  | {
      type: 'submitted'
      commercialCodes: readonly (string | number)[]
    }
  | {
      type: 'resultsLoaded'
      requestKey: string
      commercialCode: string | null
    }
  | { type: 'resultSelected'; commercialCode: string }
  | { type: 'editRequested' }
  | { type: 'sheetSnapChanged'; snap: RecommendationSheetSnap }

export const createStableCommercialCodes = (
  codes: readonly (string | number)[],
): string[] => [...new Set(codes.map(String).filter(Boolean))].sort()

const createRecommendationRequestKey = (
  districtCode: string,
  administrationCode: string,
  serviceCode: string,
  commercialCodesKey: string,
): string =>
  JSON.stringify([
    districtCode,
    administrationCode,
    serviceCode,
    commercialCodesKey,
  ])

export const formatRecommendationPeriod = (periodCode: string): string => {
  const match = /^(\d{4})([1-4])$/.exec(periodCode)

  return match ? `${match[1]}년 ${match[2]}분기 기준` : `${periodCode} 기준`
}

export const createInitialRecommendationState = (): RecommendationState => ({
  draft: {
    district: null,
    administration: null,
    service: null,
  },
  submitted: null,
  view: 'criteria',
  selectedCommercialCode: null,
  sheetSnap: 'expanded',
})

export function recommendationReducer(
  state: RecommendationState,
  action: RecommendationAction,
): RecommendationState {
  switch (action.type) {
    case 'districtSelected':
      return {
        ...state,
        draft: {
          district: action.district,
          administration: null,
          service: state.draft.service,
        },
        submitted: null,
        view: 'criteria',
        selectedCommercialCode: null,
        sheetSnap: 'expanded',
      }
    case 'administrationSelected':
      return {
        ...state,
        draft: {
          ...state.draft,
          administration: action.administration,
        },
        submitted: null,
        view: 'criteria',
        selectedCommercialCode: null,
        sheetSnap: 'expanded',
      }
    case 'serviceSelected':
      return {
        ...state,
        draft: {
          ...state.draft,
          service: action.service,
        },
        submitted: null,
        view: 'criteria',
        selectedCommercialCode: null,
        sheetSnap: 'expanded',
      }
    case 'submitted': {
      const { district, administration, service } = state.draft

      if (!district || !administration || !service) return state

      const commercialCodes = createStableCommercialCodes(
        action.commercialCodes,
      )

      if (commercialCodes.length === 0) return state

      const commercialCodesKey = commercialCodes.join(',')

      return {
        ...state,
        submitted: {
          district: { ...district },
          administration: { ...administration },
          service: { ...service },
          commercialCodes,
          commercialCodesKey,
          requestKey: createRecommendationRequestKey(
            district.code,
            administration.code,
            service.code,
            commercialCodesKey,
          ),
        },
        view: 'results',
        selectedCommercialCode: null,
        sheetSnap: 'expanded',
      }
    }
    case 'resultsLoaded': {
      const { submitted } = state

      if (
        state.view !== 'results' ||
        !submitted ||
        action.requestKey !== submitted.requestKey ||
        (action.commercialCode !== null &&
          !submitted.commercialCodes.includes(action.commercialCode))
      ) {
        return state
      }

      return {
        ...state,
        selectedCommercialCode: action.commercialCode,
        sheetSnap: 'expanded',
      }
    }
    case 'resultSelected':
      if (
        state.view !== 'results' ||
        !state.submitted ||
        !state.submitted.commercialCodes.includes(action.commercialCode)
      ) {
        return state
      }

      return {
        ...state,
        selectedCommercialCode: action.commercialCode,
        sheetSnap: 'collapsed',
      }
    case 'editRequested':
      return {
        ...state,
        submitted: null,
        view: 'criteria',
        selectedCommercialCode: null,
        sheetSnap: 'expanded',
      }
    case 'sheetSnapChanged':
      return {
        ...state,
        sheetSnap: action.snap,
      }
  }
}
