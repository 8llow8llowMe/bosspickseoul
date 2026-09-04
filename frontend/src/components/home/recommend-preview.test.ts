import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import RecommendPreview from '@/components/home/recommend-preview'
import { DEFAULT_SELECTION, type DemoSelection } from '@/data/home-demo'
import type {
  AdministrationAreasResponse,
  CandidateCommercialsResponse,
  CommercialAreasResponse,
} from '@/types/recommend'

/*
 * D8-3: 고정 시드(HOME_RECOMMEND_SEED, 강남구 역삼1동 · 커피-음료)를 없애고
 * 02단계에서 고른 선택(자치구→첫 행정동→상권→추천)으로 3단 연쇄를 탄다.
 * 이 파일의 쿼리 키는 구현(`useRecommendPreview`)의 것과 문자 그대로 같아야 한다.
 */
const administrationsKey = (districtCode: string) => [
  'home',
  'recommendAdministrations',
  districtCode,
]
const commercialsKey = (districtCode: string, administrationCode: string) => [
  'home',
  'recommendCommercials',
  districtCode,
  administrationCode,
]
const previewKey = (
  districtCode: string,
  administrationCode: string,
  serviceCode: string,
  commercialCodes: string[],
) => [
  'home',
  'recommendPreview',
  districtCode,
  administrationCode,
  serviceCode,
  commercialCodes,
]

const GANGNAM_DISTRICT_CODE = '11680'
const GANGNAM_ADMINISTRATION_CODE = '11680660'
// 실측: 강남구의 첫 행정동은 역삼1동이 아니라 논현2동이다.
const GANGNAM_ADMINISTRATION_NAME = '논현2동'
const CAFE_SERVICE_CODE = 'CS100010'

const createAdministrations = (): AdministrationAreasResponse => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: [
    {
      administrationCode: GANGNAM_ADMINISTRATION_CODE,
      administrationName: GANGNAM_ADMINISTRATION_NAME,
      centerLat: 37.51,
      centerLng: 127.03,
    },
  ],
})

const createFailedAdministrations = (): AdministrationAreasResponse => ({
  dataHeader: {
    success: false,
    resultCode: 'COMMERCIAL_001',
    resultMessage: '행정동 목록을 사용할 수 없습니다.',
  },
  dataBody: [],
})

const createCommercials = (): CommercialAreasResponse => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: [
    {
      commercialCode: '3120197',
      commercialName: '역삼역',
      commercialClassificationCode: 'A',
      commercialClassificationName: '골목상권',
      centerLat: 37.5,
      centerLng: 127.03,
    },
  ],
})

const createRecommendations = (): CandidateCommercialsResponse => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: {
    serviceCode: CAFE_SERVICE_CODE,
    periodCode: '20233',
    preset: { code: 'AGGRESSIVE_OPPORTUNITY', name: '공격형', description: '' },
    priorityMetric: {
      code: 'OPPORTUNITY_SCORE',
      name: '기회도',
      description: '',
      scoreDescription: '',
    },
    topN: 5,
    summary: '',
    items: [
      {
        rank: 1,
        commercialCode: '3120197',
        commercialName: '역삼역',
        compositeScore: 83.99,
        grade: 'HIGH',
        summaryLabel: '공격형 추천',
        selectionReason: '공격형 기준으로 기회도 높음을 우선 반영했습니다.',
        opportunityLabel: '기회도 높음',
        riskLabel: '위험도 보통',
        metricBreakdown: [],
        reasonTags: [],
      },
    ],
  },
})

const render = (
  selection: DemoSelection = DEFAULT_SELECTION,
  seed?: {
    administrations?: AdministrationAreasResponse
    commercials?: CommercialAreasResponse
    recommendations?: CandidateCommercialsResponse
  },
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  if (seed?.administrations) {
    client.setQueryData(
      administrationsKey(GANGNAM_DISTRICT_CODE),
      seed.administrations,
    )
  }
  if (seed?.commercials) {
    client.setQueryData(
      commercialsKey(GANGNAM_DISTRICT_CODE, GANGNAM_ADMINISTRATION_CODE),
      seed.commercials,
    )
  }
  if (seed?.recommendations) {
    client.setQueryData(
      previewKey(
        GANGNAM_DISTRICT_CODE,
        GANGNAM_ADMINISTRATION_CODE,
        CAFE_SERVICE_CODE,
        ['3120197'],
      ),
      seed.recommendations,
    )
  }

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(RecommendPreview, { selection }),
    ),
  )
}

describe('RecommendPreview', () => {
  it('실제로 쓴 첫 행정동 이름을 화면에 적는다', () => {
    // 강남구의 첫 행정동은 역삼1동이 아니라 논현2동이다(실측). 하드코딩이 아니라
    // 응답에서 온 이름이라는 게 핵심이므로, 문서 D8-3에 없는 이름이면 실패해야 한다.
    const html = render(DEFAULT_SELECTION, {
      administrations: createAdministrations(),
    })

    expect(html).toContain('강남구 논현2동 · 카페')
  })

  it('행정동을 아직 못 정했으면(로딩) 지역·업종만 적고 이름을 지어내지 않는다', () => {
    const html = render()

    expect(html).toContain('강남구 · 카페')
    expect(html).not.toContain('논현2동')
  })

  it('행정동 쿼리가 아직 결론나지 않았으면 예시 행은 보여도 라벨은 숨긴다', () => {
    const html = render()

    expect(html).toContain('역삼역')
    expect(html).not.toContain('대표 예시 데이터')
  })

  it('행정동을 찾지 못해 더 기다릴 게 없으면 예시 라벨을 바로 낸다', () => {
    const html = render(DEFAULT_SELECTION, {
      administrations: createFailedAdministrations(),
    })

    expect(html).toContain('역삼역')
    expect(html).toContain('대표 예시 데이터')
  })

  it('실 응답이 오면 추천 이유 문장을 그리고 예시 라벨을 뺀다', () => {
    const html = render(DEFAULT_SELECTION, {
      administrations: createAdministrations(),
      commercials: createCommercials(),
      recommendations: createRecommendations(),
    })

    expect(html).toContain('기회도 높음을 우선 반영했습니다')
    expect(html).not.toContain('대표 예시 데이터')
  })

  it('선택(자치구)이 바뀌면 다른 캐시를 본다 — 강남구 캐시가 다른 지역에 새지 않는다', () => {
    // 강남구 캐시만 채운 QueryClient로 마포구 선택을 렌더하면, 마포구의 행정동
    // 쿼리 키(districtCode가 다르다)는 여전히 미결이라 강남구 데이터를 보지 않는다.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    client.setQueryData(
      administrationsKey(GANGNAM_DISTRICT_CODE),
      createAdministrations(),
    )

    const html = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client },
        createElement(RecommendPreview, {
          selection: { districtId: 'mapo', industryId: 'restaurant' },
        }),
      ),
    )

    expect(html).not.toContain('논현2동')
    expect(html).toContain('마포구 · 음식점')
  })
})
