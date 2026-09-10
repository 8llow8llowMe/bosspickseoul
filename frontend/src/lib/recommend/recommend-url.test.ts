import { describe, expect, it } from 'vitest'

import { serializeMapCamera, type MapCamera } from '@/lib/analysis/map-camera'

import {
  createRecommendHref,
  createRecommendHrefFromCodes,
  createRecommendSearchParams,
  EMPTY_RECOMMEND_URL_STATE,
  parseRecommendUrlState,
} from './recommend-url'
import {
  createInitialRecommendationState,
  type RecommendationState,
} from './recommend-state'

const GANGNAM = { code: '11680', name: '강남구' }
const YEOKSAM1 = '11680640'
const HANSIK = { code: 'CS100001', name: '한식음식점' }
const CAMERA: MapCamera = { lat: 37.50123, lng: 127.03456, level: 5 }

const parse = (query: string) =>
  parseRecommendUrlState(new URLSearchParams(query))

const serializeState = (
  overrides: Partial<
    Pick<
      RecommendationState,
      'draft' | 'view' | 'selectedCommercialCode' | 'resultSelectionSource'
    >
  > = {},
  camera?: MapCamera | null,
) =>
  createRecommendSearchParams(
    {
      draft: { district: null, administration: null, service: null },
      view: 'criteria',
      selectedCommercialCode: null,
      resultSelectionSource: null,
      ...overrides,
    },
    camera,
  ).toString()

describe('parseRecommendUrlState', () => {
  // T-1
  it('조건 3개를 코드로 복원한다', () => {
    const state = parse(
      `districtCode=11680&administrationCode=${YEOKSAM1}&serviceCode=CS100001`,
    )

    expect(state.district).toEqual(GANGNAM)
    expect(state.administration?.code).toBe(YEOKSAM1)
    expect(state.service).toEqual(HANSIK)
  })

  // 행정동 이름만 정적 목록이 없어 여기서 알 수 없다. 목록이 오면 채운다.
  it('행정동 이름은 비워 둔다', () => {
    expect(parse(`administrationCode=${YEOKSAM1}`).administration?.name).toBe(
      '',
    )
  })

  // T-2 — 반쯤 복원된 화면은 사용자가 저장한 화면이 아니다.
  it('자치구가 목록에 없으면 조건 전체를 버린다', () => {
    expect(
      parse(
        `districtCode=99999&administrationCode=${YEOKSAM1}&serviceCode=CS100001&view=results`,
      ),
    ).toEqual(EMPTY_RECOMMEND_URL_STATE)
  })

  // T-3
  it('다른 자치구의 행정동은 행정동만 버린다', () => {
    const state = parse('districtCode=11680&administrationCode=11110560')

    expect(state.district).toEqual(GANGNAM)
    expect(state.administration).toBeNull()
  })

  // T-4 — 딥링크가 행정동만 넘길 수 있다.
  it('행정동만 있으면 앞 5자리로 자치구를 유도한다', () => {
    const state = parse(`administrationCode=${YEOKSAM1}`)

    expect(state.district).toEqual(GANGNAM)
    expect(state.administration?.code).toBe(YEOKSAM1)
  })

  // T-5
  it('카탈로그 밖 업종은 업종만 버린다', () => {
    const state = parse('districtCode=11680&serviceCode=CS999999')

    expect(state.district).toEqual(GANGNAM)
    expect(state.service).toBeNull()
  })

  // T-6 — 조건이 덜 차 있으면 결과를 낼 수 없다.
  it('조건이 덜 차 있으면 view 를 버린다', () => {
    expect(parse('districtCode=11680&view=results').isResultsView).toBe(false)
    expect(
      parse(`districtCode=11680&administrationCode=${YEOKSAM1}&view=results`)
        .isResultsView,
    ).toBe(false)
  })

  // T-7
  it('view 가 임의 값이면 없는 것으로 본다', () => {
    expect(
      parse(
        `districtCode=11680&administrationCode=${YEOKSAM1}&serviceCode=CS100001&view=picker`,
      ).isResultsView,
    ).toBe(false)
  })

  it('결과 화면이 아니면 고른 상권도 버린다', () => {
    expect(
      parse('districtCode=11680&commercialCode=3110008').commercialCode,
    ).toBeNull()
  })

  it('결과 화면이면 고른 상권을 살린다', () => {
    expect(
      parse(
        `districtCode=11680&administrationCode=${YEOKSAM1}&serviceCode=CS100001&view=results&commercialCode=3110008`,
      ).commercialCode,
    ).toBe('3110008')
  })

  it('빈 문자열·공백만 있는 값은 없는 것으로 본다', () => {
    expect(parse('districtCode=&serviceCode=%20')).toEqual(
      EMPTY_RECOMMEND_URL_STATE,
    )
  })
})

describe('createRecommendSearchParams', () => {
  const filled = {
    draft: {
      district: GANGNAM,
      administration: { code: YEOKSAM1, name: '역삼1동' },
      service: HANSIK,
    },
  }

  // T-8 — 조건 코드가 먼저, 화면 상태가 뒤에.
  it('조건·결과·사용자 선택을 순서대로 싣는다', () => {
    expect(
      serializeState({
        ...filled,
        view: 'results',
        selectedCommercialCode: '3110008',
        resultSelectionSource: 'user',
      }),
    ).toBe(
      `districtCode=11680&administrationCode=${YEOKSAM1}&serviceCode=CS100001&view=results&commercialCode=3110008`,
    )
  })

  // T-9 — 자동 선택을 실으면 「3위를 보던 화면」 링크가 1위로 열린다.
  it('자동 선택된 1위는 싣지 않는다', () => {
    expect(
      serializeState({
        ...filled,
        view: 'results',
        selectedCommercialCode: '3110008',
        resultSelectionSource: 'auto',
      }),
    ).not.toContain('commercialCode')
  })

  it('결과 단계가 아니면 view 도 상권도 싣지 않는다', () => {
    const query = serializeState({
      ...filled,
      view: 'picker',
      selectedCommercialCode: '3110008',
      resultSelectionSource: 'user',
    })

    expect(query).not.toContain('view')
    expect(query).not.toContain('commercialCode')
  })

  // T-10
  it('아무것도 안 고르면 빈 쿼리다', () => {
    expect(serializeState()).toBe('')
    expect(
      createRecommendHref({
        draft: { district: null, administration: null, service: null },
        view: 'criteria',
        selectedCommercialCode: null,
        resultSelectionSource: null,
      }),
    ).toBe('/recommend')
  })
})

// T-11
describe('왕복', () => {
  it('직렬화한 것을 다시 파싱하면 같은 상태다', () => {
    const query = serializeState({
      draft: {
        district: GANGNAM,
        administration: { code: YEOKSAM1, name: '역삼1동' },
        service: HANSIK,
      },
      view: 'results',
      selectedCommercialCode: '3110008',
      resultSelectionSource: 'user',
    })
    const restored = parse(query)

    expect(restored.district).toEqual(GANGNAM)
    expect(restored.administration?.code).toBe(YEOKSAM1)
    expect(restored.service).toEqual(HANSIK)
    expect(restored.isResultsView).toBe(true)
    expect(restored.commercialCode).toBe('3110008')
  })
})

// T-12 — URL 이 없으면 기존 초기 상태와 완전히 같아야 한다(무회귀).
describe('씨앗 무회귀', () => {
  it('URL 이 비면 기존 초기 상태 그대로다', () => {
    expect(createInitialRecommendationState(parse(''))).toEqual(
      createInitialRecommendationState(),
    )
    // `c` 가 없으면 자동 맞춤을 잠글 이유가 없다 — 기존 동작 그대로다.
    expect(createInitialRecommendationState(parse('')).cameraMode).toBe('auto')
  })

  it('씨앗은 조건만 채우고 화면 단계는 건드리지 않는다', () => {
    const seeded = createInitialRecommendationState(
      parse(
        `districtCode=11680&administrationCode=${YEOKSAM1}&serviceCode=CS100001&view=results`,
      ),
    )

    expect(seeded.draft.district).toEqual(GANGNAM)
    expect(seeded.draft.service).toEqual(HANSIK)
    // 제출은 후보 상권 목록이 있어야 한다 — 화면이 목록을 받은 뒤에 한다.
    expect(seeded.submitted).toBeNull()
    expect(seeded.view).toBe('criteria')
  })
})

/*
 * 카메라 `c` (#317, 명세 §2-2). 형식·가드는 `lib/analysis/map-camera.ts` 가 정본이라
 * 여기서는 **추천 URL 이 그것을 어떻게 얹는가**만 본다.
 */
describe('카메라 c', () => {
  const filled = {
    draft: {
      district: GANGNAM,
      administration: { code: YEOKSAM1, name: '역삼1동' },
      service: HANSIK,
    },
  }

  // T-17 — 소수 5자리로 양자화하고 level 은 정수다.
  it('c 가 유효하면 카메라를 복원한다', () => {
    expect(parse('districtCode=11680&c=37.501234,127.034567,5').camera).toEqual(
      { lat: 37.50123, lng: 127.03457, level: 5 },
    )
  })

  /*
   * T-17 — 카메라는 조건이 아니라 뷰 상태다. 조건을 전부 버리는 링크에서도
   * 「지금 보이는 화면」은 살아 있어야 한다.
   */
  it('자치구가 무효여도 카메라는 산다', () => {
    expect(parse('districtCode=99999&c=37.50123,127.03456,5')).toEqual({
      ...EMPTY_RECOMMEND_URL_STATE,
      camera: CAMERA,
    })
  })

  // T-18 — 위경도가 뒤바뀐 값은 한국 좌표 가드가 걸러낸다.
  it('c 가 무효면 카메라만 버린다', () => {
    const invalid = ['37.5,127.03', '127.03456,37.50123,5', '']

    invalid.forEach(raw => {
      const state = parse(`districtCode=11680&c=${encodeURIComponent(raw)}`)

      expect(state.camera).toBeNull()
      expect(state.district).toEqual(GANGNAM)
    })
  })

  // T-19 — 파라미터 순서는 조건 → 화면 상태 → 뷰 상태다.
  it('c 를 맨 뒤에 싣는다', () => {
    expect(
      serializeState(
        {
          ...filled,
          view: 'results',
          selectedCommercialCode: '3110008',
          resultSelectionSource: 'user',
        },
        CAMERA,
      ),
    ).toBe(
      `districtCode=11680&administrationCode=${YEOKSAM1}&serviceCode=CS100001&view=results&commercialCode=3110008&c=${encodeURIComponent(
        serializeMapCamera(CAMERA),
      )}`,
    )
  })

  // 뷰 상태라 결과 단계가 아니어도 붙는다 — 조건만 골라 둔 화면도 공유된다.
  it('결과 단계가 아니어도 c 는 싣는다', () => {
    const query = serializeState({ ...filled, view: 'criteria' }, CAMERA)

    expect(query).not.toContain('view=results')
    expect(
      query.endsWith(`&c=${encodeURIComponent(serializeMapCamera(CAMERA))}`),
    ).toBe(true)
  })

  // T-20 — `c` 없는 기존 링크와 출력이 완전히 같아야 한다(무회귀).
  it('카메라가 없으면 c 를 싣지 않는다', () => {
    expect(serializeState({ ...filled })).not.toContain('c=')
    expect(serializeState({ ...filled }, null)).not.toContain('c=')
    expect(
      createRecommendHrefFromCodes({
        districtCode: GANGNAM.code,
        administrationCode: YEOKSAM1,
        serviceCode: HANSIK.code,
      }),
    ).not.toContain('c=')
  })

  it('href 도 같은 시그니처로 카메라를 싣는다', () => {
    expect(
      createRecommendHref(
        {
          draft: { district: null, administration: null, service: null },
          view: 'criteria',
          selectedCommercialCode: null,
          resultSelectionSource: null,
        },
        CAMERA,
      ),
    ).toBe(`/recommend?c=${encodeURIComponent(serializeMapCamera(CAMERA))}`)
  })

  // T-21
  it('카메라를 실은 쿼리를 다시 파싱하면 같은 카메라다', () => {
    expect(
      parse(serializeState({ ...filled, view: 'results' }, CAMERA)).camera,
    ).toEqual(CAMERA)
  })
})
