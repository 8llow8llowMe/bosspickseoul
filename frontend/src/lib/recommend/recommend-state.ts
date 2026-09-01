export type RecommendationOption = {
  readonly code: string
  readonly name: string
}

/**
 * `picker` 는 조건 하나를 고르는 화면이다. 별도 오버레이가 아니라 **같은 패널의
 * 세 번째 뷰**다 — 모바일에서 이 패널이 곧 바텀시트라, 시트 위에 시트를 겹치지
 * 않으려면 뷰 전환이어야 한다(condition-selector 명세 D4-2).
 */
export type RecommendationView = 'criteria' | 'picker' | 'results'

/** 조건 바의 조각. 선택 뷰가 어느 조건을 다루는지 가리킨다. */
export type RecommendConditionStep = 'district' | 'administration' | 'service'
export type RecommendationSheetSnap = 'expanded' | 'collapsed'

/**
 * URL 이 넘겨 주는 씨앗. 조건만 담는다 — 화면 단계(`view=results`)와 고른 상권은
 * 후보 목록·결과가 도착한 뒤에야 의미가 생겨서 화면이 따로 다룬다.
 */
export type RecommendationSeed = {
  district: RecommendationOption | null
  administration: RecommendationOption | null
  service: RecommendationOption | null
}

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
  /** `view === 'picker'` 일 때만 의미가 있다. 그 외에는 항상 `null`. */
  pickerStep: RecommendConditionStep | null
  selectedCommercialCode: string | null
  /**
   * `selectedCommercialCode` 를 **누가 정했는가**.
   *
   * 결과가 도착하면 1위가 자동으로 선택된다(목록·상세가 빈 채로 뜨지 않게). 그런데
   * 카메라까지 1위로 당겨 버리면 나머지 추천이 화면 밖으로 밀려난다. 그래서 자동 선택
   * (`'auto'`)은 카메라를 결과 전체에 맞추고, 사용자가 직접 고른 경우(`'user'`)에만
   * 그 상권으로 좁힌다.
   */
  resultSelectionSource: 'auto' | 'user' | null
  sheetSnap: RecommendationSheetSnap
}

type RecommendationAction =
  | { type: 'districtSelected'; district: RecommendationOption }
  | {
      type: 'administrationSelected'
      administration: RecommendationOption
    }
  | { type: 'serviceSelected'; service: RecommendationOption }
  | { type: 'pickerOpened'; step: RecommendConditionStep }
  | { type: 'pickerClosed' }
  | {
      type: 'submitted'
      commercialCodes: readonly (string | number)[]
    }
  | {
      type: 'resultsLoaded'
      requestKey: string
      commercialCode: string | null
      /**
       * 이 선택을 **누가 정했는가**. 링크(`?commercialCode=`)가 지목한 상권이면
       * `'user'` 다 — 자동 선택된 1위와 구분해야 URL 이 그 선택을 도로 지우지 않는다.
       */
      source?: 'auto' | 'user'
    }
  | { type: 'resultSelected'; commercialCode: string }
  /**
   * URL 로 복원한 행정동의 **이름만** 채운다.
   *
   * `administrationSelected` 와 다르다 — 그건 사용자가 지역을 바꾼 것이라
   * 제출·결과·선택을 모두 버린다. 이건 같은 행정동의 이름을 뒤늦게 알게 된 것뿐이라
   * **아무것도 버리지 않는다.** 둘을 합치면 링크로 들어온 결과 화면이 이름이 도착하는
   * 순간 조건 화면으로 되돌아간다.
   */
  | { type: 'administrationNameResolved'; administration: RecommendationOption }
  | { type: 'administrationRejected'; code: string }
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

/**
 * 초기 상태. **URL 로 씨앗을 뿌릴 수 있다**(`/recommend?districtCode=…`).
 *
 * 씨앗은 **마운트 때 한 번만** 쓰인다. 그 뒤로는 리듀서가 정본이고 URL 은 거울이라,
 * 양방향 동기화가 서로를 덮어쓰는 루프가 구조적으로 생기지 않는다.
 *
 * `submitted` 는 씨앗으로 채우지 않는다 — 후보 상권 코드 목록이 있어야 만들 수 있고
 * 그건 API 응답이다. 화면이 목록을 받으면 그때 제출한다.
 */
export const createInitialRecommendationState = (
  seed?: RecommendationSeed | null,
): RecommendationState => ({
  draft: {
    district: seed?.district ?? null,
    administration: seed?.administration ?? null,
    service: seed?.service ?? null,
  },
  submitted: null,
  view: 'criteria',
  pickerStep: null,
  selectedCommercialCode: null,
  resultSelectionSource: null,
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
        pickerStep: null,
        selectedCommercialCode: null,
        resultSelectionSource: null,
        sheetSnap: 'expanded',
      }
    case 'administrationSelected': {
      // 자치구·행정동은 지도에서 고를 수 있지만 **업종은 지도에 없다.** 지역이
      // 다 차면 남은 하나를 바로 열어 준다 — 상권분석이 지도 선택마다 다음
      // 단계로 넘기는 것과 같은 원리다. 이미 고른 업종이 있으면 건드리지 않는다.
      const needsService = state.draft.service === null

      return {
        ...state,
        draft: {
          ...state.draft,
          administration: action.administration,
        },
        submitted: null,
        view: needsService ? 'picker' : 'criteria',
        pickerStep: needsService ? 'service' : null,
        selectedCommercialCode: null,
        resultSelectionSource: null,
        sheetSnap: 'expanded',
      }
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
        pickerStep: null,
        selectedCommercialCode: null,
        resultSelectionSource: null,
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
        pickerStep: null,
        selectedCommercialCode: null,
        resultSelectionSource: null,
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
        resultSelectionSource: action.source ?? 'auto',
        sheetSnap: 'expanded',
      }
    }
    case 'administrationNameResolved': {
      const current = state.draft.administration

      // 그 사이 사용자가 다른 행정동을 골랐으면 낡은 이름이다. 버린다.
      if (!current || current.code !== action.administration.code) return state

      /*
       * 이름이 이미 같으면 **새 객체를 만들지 않는다.** 만들면 이 값을 deps 로 쓰는
       * 이펙트가 매번 다시 돌아 dispatch 를 되풀이한다(렌더 루프).
       */
      if (current.name === action.administration.name) return state

      const { submitted } = state

      return {
        ...state,
        draft: { ...state.draft, administration: action.administration },
        /*
         * `submitted` 도 함께 채운다. 결과 헤더는 draft 가 아니라 submitted 를 읽는데
         * (`recommend-panel.tsx`), URL 로 들어오면 이름을 모르는 채 제출되므로
         * draft 만 채우면 **결과 헤더의 행정동 칩이 빈 채로 남는다.** 실제로 그랬다.
         */
        submitted:
          submitted && submitted.administration.code === current.code
            ? { ...submitted, administration: action.administration }
            : submitted,
      }
    }
    /*
     * URL 이 들고 온 행정동이 그 자치구 목록에 **없을 때** 버린다.
     * `parseRecommendUrlState` 는 앞 5자리만 맞춰 보므로 `11680999` 같은 없는 동이
     * 통과한다. 그대로 두면 조건 바에는 자리표시자가 뜨는데 내부 상태에는 값이 있어,
     * 「현재 행정동에는 추천할 상권이 없어요」로 **없는 동을 있는 것처럼** 안내하는
     * 막다른 화면이 된다.
     *
     * 자치구·업종은 남긴다 — `parseRecommendUrlState` 가 「행정동부터 버린다」로
     * 처리하는 것과 같은 규칙이다(명세 §4). 버린 것은 URL 거울이 주소창에서도 지운다.
     */
    case 'administrationRejected': {
      const current = state.draft.administration

      /*
       * 목록이 늦게 오는 동안 사용자가 다른 동을 골랐을 수 있다. 그때 이 판정은
       * 낡은 것이라 **사용자가 방금 고른 것을 버리게 된다.** 코드가 같을 때만 쓴다.
       */
      if (!current || current.code !== action.code) return state

      return {
        ...state,
        draft: { ...state.draft, administration: null },
        // 없는 동으로 만든 제출을 살려 두면 결과 화면의 막다른 상태가 그대로 남는다.
        submitted: null,
        view: 'criteria',
        pickerStep: null,
        selectedCommercialCode: null,
        resultSelectionSource: null,
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
        resultSelectionSource: 'user',
        sheetSnap: 'collapsed',
      }
    case 'editRequested':
      return {
        ...state,
        submitted: null,
        view: 'criteria',
        pickerStep: null,
        selectedCommercialCode: null,
        resultSelectionSource: null,
        sheetSnap: 'expanded',
      }
    case 'pickerOpened':
      return {
        ...state,
        view: 'picker',
        pickerStep: action.step,
        // 선택 뷰는 목록이 길다 — 접힌 시트에서 열면 아무것도 안 보인다.
        sheetSnap: 'expanded',
      }
    case 'pickerClosed':
      return {
        ...state,
        view: 'criteria',
        pickerStep: null,
        sheetSnap: 'expanded',
      }
    case 'sheetSnapChanged':
      return {
        ...state,
        sheetSnap: action.snap,
      }
  }
}

/**
 * 비어 있는 첫 조건을 안내 문구로 바꾼다. 모두 채웠으면 null.
 *
 * 「상권 추천받기」는 조건 셋이 다 차야 열린다. 그런데 자치구·업종만 고른 상태는
 * 로딩도 오류도 아니라서 기존 헬퍼가 전부 `null` 이었고, **비활성 버튼만 남아
 * 무엇이 빠졌는지 알 수 없었다.** 특히 행정동은 건너뛸 수 있어 보여서 여기서 막힌다.
 *
 * `/analysis`(「상권과 업종을 선택해 주세요」)와 `/simulation`
 * (`describeSimulationConditionGap`)은 이미 같은 안내를 한다 — 세 화면 중
 * `/recommend` 만 빠져 있었다.
 */
export const describeRecommendConditionGap = (
  draft: RecommendationCriteria,
): string | null => {
  if (!draft.district) return '창업할 자치구를 선택해 주세요'
  // 행정동이 선택이 아니라 필수임을 여기서 분명히 말한다.
  if (!draft.administration) return '살펴볼 행정동까지 선택해 주세요'
  if (!draft.service) return '창업할 업종을 선택해 주세요'

  return null
}
