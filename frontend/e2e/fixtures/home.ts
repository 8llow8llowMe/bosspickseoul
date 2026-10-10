import type { BrowserContext, Route } from '@playwright/test'
import { districts } from '../../src/data/districts'
import type {
  DistrictRankingSummary,
  DistrictRankingsResponse,
  DistrictTopTenResponse,
  DistrictTopTenSummary,
} from '../../src/types/status'
import { analysisRankingsFixture } from './analysis-rankings'

/**
 * 홈 첫 페인트 BFF 고정 응답 — **백엔드 없이** 홈 불변식을 잰다(#632).
 *
 * CI(`frontend-ci / e2e`)에는 백엔드가 없다. 홈이 첫 페인트에 부르는 세 BFF 호출
 * (`analysis-rankings`·`districts/top-ten`·`districts/rankings`)이 그대로 나가면 BFF 가 500 을 주고,
 * 화면은 폴백으로 그려지며 콘솔에 오류가 쌓인다. 그래서 세 호출을 여기서 받는다.
 *
 * - 값은 **지어낸 숫자**다. 25개 구(`src/data/districts.ts`) 순서대로 큰 값부터 매긴다. 이 fixture 로
 *   재는 것은 불변식(가로 넘침·h1·문체·링크·콘솔·BFF 호출 수)뿐이고, 값이 화면 높이를 바꾸는
 *   래칫(`home-metrics.spec.ts`)은 이 fixture 를 쓰지 않는다(dev 서버 + 실응답 기준선).
 * - 필드는 `src/types/status.ts` 에 있는 것만 쓴다(계약 창작 금지).
 * - 가로채지 않은 `/api/bff/*` 호출은 501 로 막고 `unhandled` 에 남긴다. 스크롤 0 측정에서는 나가지
 *   않아야 하는 호출이다 — 생기면 첫 페인트 호출이 늘었다는 뜻이다.
 *
 * 라우트는 **context** 에 건다. `openHome` 이 page 에 거는 `analysis-rankings` 라우트가 먼저 받고
 * (page 라우트가 우선이다) 값은 같다.
 */

export type HomeApi = {
  /** 이 파일이 답하지 못한 BFF 호출(메서드 + 경로 + 쿼리). */
  unhandled: string[]
}

/** 응답이 알려 주는 기준 분기. 홈은 분기를 생략해 보내고 서버가 해석한 분기를 받는다. */
const CURRENT_PERIOD_CODE = '20252'
const PREVIOUS_PERIOD_CODE = '20251'

const success = <T>(dataBody: T) => ({
  dataHeader: { success: true, resultCode: '0000', resultMessage: null },
  dataBody,
})

/** 지표마다 구 순서를 조금씩 돌려 네 순위가 같은 줄로 서지 않게 한다. */
const rotated = (offset: number) =>
  districts.map((_, index) => districts[(index + offset) % districts.length])

/** 큰 값부터. 변화율은 부호가 섞이게, 마지막 구는 직전 분기가 없는 경우(null)로 둔다. */
const ranked = (offset: number, top: number, step: number) =>
  rotated(offset).map((district, index) => ({
    rank: index + 1,
    districtCode: String(district.gooCode),
    districtName: district.gooName,
    value: top - step * index,
    changeRate: index === districts.length - 1 ? null : ((index % 7) - 3) * 1.5,
  }))

const footTraffic = ranked(0, 9_800_000, 310_000)
const sales = ranked(3, 1_900_000_000_000, 61_000_000_000)
const opened = ranked(7, 820, 25)
const closed = ranked(11, 760, 23)

export const districtRankingsFixture: DistrictRankingsResponse =
  success<DistrictRankingSummary>({
    currentPeriodCode: CURRENT_PERIOD_CODE,
    previousPeriodCode: PREVIOUS_PERIOD_CODE,
    footTrafficRankings: footTraffic.map(item => ({
      rank: item.rank,
      districtCode: item.districtCode,
      districtName: item.districtName,
      totalFootTraffic: item.value,
      footTrafficChangeRate: item.changeRate,
    })),
    salesRankings: sales.map(item => ({
      rank: item.rank,
      districtCode: item.districtCode,
      districtName: item.districtName,
      totalSalesAmount: item.value,
      salesChangeRate: item.changeRate,
    })),
    openedStoreRankings: opened.map(item => ({
      rank: item.rank,
      districtCode: item.districtCode,
      districtName: item.districtName,
      openedStoreCount: item.value,
      openingChangeRate: item.changeRate,
    })),
    closedStoreRankings: closed.map(item => ({
      rank: item.rank,
      districtCode: item.districtCode,
      districtName: item.districtName,
      closedStoreCount: item.value,
      closureChangeRate: item.changeRate,
    })),
  })

/** Top10 은 전체 순위의 앞 10개다. Top10 은 변화율이 null 이 아니다(타입). */
export const districtTopTenFixture: DistrictTopTenResponse =
  success<DistrictTopTenSummary>({
    currentPeriodCode: CURRENT_PERIOD_CODE,
    previousPeriodCode: PREVIOUS_PERIOD_CODE,
    footTrafficTopTenItems: footTraffic.slice(0, 10).map(item => ({
      districtCode: item.districtCode,
      districtName: item.districtName,
      totalFootTraffic: item.value,
      footTrafficChangeRate: item.changeRate ?? 0,
    })),
    salesTopTenItems: sales.slice(0, 10).map(item => ({
      districtCode: item.districtCode,
      districtName: item.districtName,
      totalSalesAmount: item.value,
      salesChangeRate: item.changeRate ?? 0,
    })),
    openedStoreTopTenItems: opened.slice(0, 10).map(item => ({
      districtCode: item.districtCode,
      districtName: item.districtName,
      openedStoreCount: item.value,
      openingChangeRate: item.changeRate ?? 0,
    })),
    closedStoreTopTenItems: closed.slice(0, 10).map(item => ({
      districtCode: item.districtCode,
      districtName: item.districtName,
      closedStoreCount: item.value,
      closureChangeRate: item.changeRate ?? 0,
    })),
  })

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json;charset=utf-8',
    body: JSON.stringify(body),
  })

export const routeHomeApi = async (
  context: BrowserContext,
): Promise<HomeApi> => {
  const api: HomeApi = { unhandled: [] }

  await context.route('**/api/bff/**', async route => {
    const request = route.request()
    const { pathname, search } = new URL(request.url())
    const method = request.method()

    if (method === 'GET' && pathname === '/api/bff/analysis-rankings') {
      await json(route, 200, analysisRankingsFixture)
      return
    }
    if (method === 'GET' && pathname === '/api/bff/districts/top-ten') {
      await json(route, 200, districtTopTenFixture)
      return
    }
    if (method === 'GET' && pathname === '/api/bff/districts/rankings') {
      await json(route, 200, districtRankingsFixture)
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
