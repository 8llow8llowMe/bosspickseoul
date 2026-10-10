import type { BrowserContext, Route } from '@playwright/test'
import type {
  AdministrationArea,
  CandidateCommercial,
  CandidateCommercials,
  CommercialArea,
  CommercialProfile,
  MapAreasBody,
} from '../../src/types/recommend'

/**
 * 상권 추천 BFF 고정 응답 — **백엔드 없이** 모바일 시트를 잰다(#647).
 *
 * - 조건 선택 뷰(자치구·업종)는 정적 카탈로그(`src/data/districts`·`simulationCatalog`)로 그려진다.
 *   첫 페인트 BFF 는 자치구 경계(`GET /map/districts`) 하나이고 빈 목록으로 답한다.
 * - 결과 뷰(`RECOMMEND_RESULTS_PATH`)는 강남구 역삼1동 · 커피-음료 조건으로 연다. 행정동 목록 → 그 행정동의
 *   상권 목록 → 업종별 추천 → 결과 상권마다 경계(profile) 순으로 부른다. 상권·점수는 **지어낸 값**이다 —
 *   재는 것은 시트의 스크롤·비교 바 자리지 값이 아니다. 경계·지도 영역은 빈 목록으로 답한다.
 * - 필드는 `src/types/recommend.ts` 에 있는 것만 쓴다(계약 창작 금지).
 * - 가로채지 않은 `/api/bff/*` 호출은 501 로 막고 `unhandled` 에 남긴다.
 */

export type RecommendApi = {
  /** 이 파일이 답하지 못한 BFF 호출(메서드 + 경로 + 쿼리). */
  unhandled: string[]
}

const DISTRICT_CODE = '11680'
const ADMINISTRATION_CODE = '11680640'
const SERVICE_CODE = 'CS100010'

/** 결과 뷰로 바로 여는 링크(url-state.md — `view=results`). */
export const RECOMMEND_RESULTS_PATH = `/recommend?districtCode=${DISTRICT_CODE}&administrationCode=${ADMINISTRATION_CODE}&serviceCode=${SERVICE_CODE}&view=results`

const CENTER = { lat: 37.5007, lng: 127.0365 }

const success = <T>(dataBody: T) => ({
  dataHeader: { success: true, resultCode: '0000', resultMessage: null },
  dataBody,
})

const administrations: AdministrationArea[] = [
  {
    administrationCode: ADMINISTRATION_CODE,
    administrationName: '역삼1동',
    centerLat: CENTER.lat,
    centerLng: CENTER.lng,
  },
]

const commercials: CommercialArea[] = Array.from({ length: 8 }, (_, index) => ({
  commercialCode: `E2E${String(index + 1).padStart(4, '0')}`,
  commercialName: `가상 상권 ${index + 1}`,
  commercialClassificationCode: 'A',
  commercialClassificationName: '골목상권',
  centerLat: CENTER.lat + index * 0.001,
  centerLng: CENTER.lng + index * 0.001,
}))

const candidate = (rank: number): CandidateCommercial => {
  const commercial = commercials[rank - 1]

  return {
    rank,
    commercialCode: commercial.commercialCode,
    commercialName: commercial.commercialName,
    compositeScore: 90 - rank * 6,
    grade: rank <= 2 ? 'HIGH' : 'MEDIUM',
    summaryLabel: '진입 여지가 있어요',
    selectionReason: '기회도 기준으로 고른 후보예요',
    opportunityLabel: '기회 높음',
    riskLabel: '위험 보통',
    metricBreakdown: [
      {
        metricType: {
          code: 'OPPORTUNITY_SCORE',
          name: '기회도',
          description: '상권 기회 지표',
          scoreDescription: '점수가 높을수록 진입 기회가 높습니다.',
        },
        score: 80 - rank * 5,
        grade: 'HIGH',
        summaryLabel: null,
      },
      {
        metricType: {
          code: 'RISK_SCORE',
          name: '위험도',
          description: '상권 위험 지표',
          scoreDescription: '점수가 높을수록 위험 요인이 큽니다.',
        },
        score: 30 + rank * 4,
        grade: 'MEDIUM',
        summaryLabel: null,
      },
    ],
    reasonTags: ['유동인구'],
    blueOceanCategories: [],
  }
}

const recommendations: CandidateCommercials = {
  serviceCode: SERVICE_CODE,
  periodCode: '20261',
  preset: {
    code: 'AGGRESSIVE_OPPORTUNITY',
    name: '공격형',
    description: '기회도에 가중치를 싣는 프리셋',
  },
  priorityMetric: {
    code: 'OPPORTUNITY_SCORE',
    name: '기회도',
    description: '상권 기회 지표',
    scoreDescription: '점수가 높을수록 진입 기회가 높습니다.',
  },
  topN: 5,
  summary:
    '공격형 프리셋과 기회도 우선 지표 기준으로 고른 후보 상권 5건입니다.',
  items: [1, 2, 3, 4, 5].map(candidate),
}

const profile = (commercialCode: string): CommercialProfile | null => {
  const commercial = commercials.find(
    item => item.commercialCode === commercialCode,
  )
  if (!commercial) return null

  return {
    commercialCode,
    commercialName: commercial.commercialName,
    districtCode: DISTRICT_CODE,
    districtName: '강남구',
    administrationCode: ADMINISTRATION_CODE,
    administrationName: '역삼1동',
    centerLng: commercial.centerLng,
    centerLat: commercial.centerLat,
    boundaryCoords: [],
    keyMetrics: null,
  }
}

const emptyAreas: MapAreasBody = { areas: [] }

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json;charset=utf-8',
    body: JSON.stringify(body),
  })

export const routeRecommendApi = async (
  context: BrowserContext,
): Promise<RecommendApi> => {
  const api: RecommendApi = { unhandled: [] }

  await context.route('**/api/bff/**', async route => {
    const request = route.request()
    const { pathname, search } = new URL(request.url())
    const method = request.method()
    const path = pathname.replace(/^\/api\/bff/, '')

    if (method === 'GET') {
      // 지도 영역(자치구·행정동·상권 경계) — 시트를 재는 데는 필요 없다.
      if (/^\/map\/(districts|administrations|commercials)$/.test(path)) {
        await json(route, 200, success(emptyAreas))
        return
      }
      if (path === `/regions/districts/${DISTRICT_CODE}/administrations`) {
        await json(route, 200, success(administrations))
        return
      }
      if (
        path ===
        `/regions/districts/${DISTRICT_CODE}/administrations/${ADMINISTRATION_CODE}/commercials`
      ) {
        await json(route, 200, success(commercials))
        return
      }
      if (path === '/commercials/recommendations/by-service') {
        await json(route, 200, success(recommendations))
        return
      }
      const profileMatch = path.match(/^\/map\/commercials\/([^/]+)\/profile$/)
      const profileBody = profileMatch ? profile(profileMatch[1]) : null
      if (profileBody) {
        await json(route, 200, success(profileBody))
        return
      }
    }

    api.unhandled.push(`${method} ${pathname}${search}`)
    await json(route, 501, {
      dataHeader: { success: false, resultMessage: 'e2e 고정 응답 없음' },
      dataBody: null,
    })
  })

  return api
}
