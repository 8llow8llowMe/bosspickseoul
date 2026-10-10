import type { BrowserContext, Route } from '@playwright/test'
import { districts } from '../../src/data/districts'
import type { AnalysisPeriodCatalogResponse } from '../../src/types/analysis-period'
import type { DistrictAreasResponse } from '../../src/types/commercial-analysis'
import type {
  AdministrationAreasResponse,
  MapAreasResponse,
} from '../../src/types/recommend'
import type { AnalysisRankingResponse } from '../../src/types/status'

/**
 * 상권분석 선택 화면(`/analysis`) 첫 페인트 BFF 고정 응답 — 백엔드 없이 모바일 시트 자리를 잰다(#648).
 *
 * - 자치구 25개(`src/data/districts.ts`), 분기 카탈로그, 「지금 많이 본 상권」 순위, 강남구 행정동만 받는다.
 *   지도 경계(`/map/districts`)는 시트 측정과 무관하고 카카오 지도 키도 없으니 빈 목록으로 답한다.
 * - 필드는 `src/types/*` 에 있는 것만 쓴다(계약 창작 금지). 상권 순위 값은 지어낸 것이다.
 * - 가로채지 않은 `/api/bff/*` 호출은 501 로 막고 `unhandled` 에 남긴다.
 */
export type AnalysisApi = {
  unhandled: string[]
}

const success = <T>(dataBody: T) => ({
  dataHeader: { success: true, resultCode: '0000', resultMessage: null },
  dataBody,
})

export const analysisDistrictsFixture: DistrictAreasResponse = success(
  districts.map(district => ({
    districtCode: String(district.gooCode),
    districtName: district.gooName,
  })),
)

export const analysisPeriodCatalogFixture: AnalysisPeriodCatalogResponse =
  success({
    defaultPeriodCode: '20252',
    availablePeriodCodes: ['20252', '20251'],
    firstPeriodCode: '20211',
    spatialVersion: null,
    resolvedAt: null,
    datasets: [],
  })

/** 상권 순위 2건 — 사용자 제보(2026-10-10) 화면과 같은 칩 2개. */
export const popularCommercialsFixture: AnalysisRankingResponse = success({
  areaType: { code: 'COMMERCIAL', name: '상권', description: '' },
  windowHours: 24,
  rankings: [
    {
      rank: 1,
      areaCode: '3110008',
      areaName: '홍대 걷고싶은 거리',
      viewCount: 128,
    },
    { rank: 2, areaCode: '3110009', areaName: '선정릉역 4번', viewCount: 96 },
  ],
})

/**
 * 강남구(11680) 행정동 20건. 이름·좌표는 측정용으로 지어낸 값이다 — 2단계 시트(목록 필터 고정 자리)를 잰다.
 * 20건이라 목록 필터 임계값(12)을 넘는다.
 */
export const gangnamAdministrationsFixture: AdministrationAreasResponse =
  success(
    Array.from({ length: 20 }, (_, index) => ({
      administrationCode: String(11680500 + index * 10),
      administrationName: `행정${index + 1}동`,
      centerLat: 37.5 + index * 0.001,
      centerLng: 127.04 + index * 0.001,
    })),
  )

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json;charset=utf-8',
    body: JSON.stringify(body),
  })

export const routeAnalysisApi = async (
  context: BrowserContext,
): Promise<AnalysisApi> => {
  const api: AnalysisApi = { unhandled: [] }

  await context.route('**/api/bff/**', async route => {
    const request = route.request()
    const { pathname, search } = new URL(request.url())
    const method = request.method()

    if (method === 'GET' && pathname === '/api/bff/districts') {
      await json(route, 200, analysisDistrictsFixture)
      return
    }
    if (method === 'GET' && pathname === '/api/bff/commercials/periods') {
      await json(route, 200, analysisPeriodCatalogFixture)
      return
    }
    if (method === 'GET' && pathname === '/api/bff/analysis-rankings') {
      await json(route, 200, popularCommercialsFixture)
      return
    }
    if (method === 'GET' && pathname === '/api/bff/map/districts') {
      const body: MapAreasResponse = success({ areas: [] })
      await json(route, 200, body)
      return
    }
    if (
      method === 'GET' &&
      pathname === '/api/bff/regions/districts/11680/administrations'
    ) {
      await json(route, 200, gangnamAdministrationsFixture)
      return
    }

    api.unhandled.push(`${method} ${pathname}${search}`)
    await json(route, 501, {
      dataHeader: { success: false, resultMessage: 'e2e 고정 응답 없음' },
      dataBody: null,
    })
  })

  return api
}
