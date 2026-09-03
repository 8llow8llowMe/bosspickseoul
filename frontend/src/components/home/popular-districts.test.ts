import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import PopularDistricts from '@/components/home/popular-districts'
import { HOME_TOP_TEN_QUERY_KEY } from '@/hooks/use-district-top-ten'
import type {
  AnalysisRankingItem,
  AnalysisRankingResponse,
  DistrictTopTenResponse,
} from '@/types/status'

const QUERY_KEY = ['home', 'analysisRankings', 'DISTRICT', 8]

const createResponse = (
  rankings: AnalysisRankingItem[],
  { success = true, windowHours = 24 } = {},
): AnalysisRankingResponse => ({
  dataHeader: {
    success,
    resultCode: success ? null : 'RANKING_001',
    resultMessage: success ? null : '순위 집계를 사용할 수 없습니다.',
  },
  dataBody: {
    areaType: { code: 'DISTRICT', name: '자치구', description: '' },
    windowHours,
    rankings,
  },
})

const createTopTen = (success = true): DistrictTopTenResponse => ({
  dataHeader: {
    success,
    resultCode: success ? null : 'DISTRICT_001',
    resultMessage: success ? null : '자치구 통계를 사용할 수 없습니다.',
  },
  dataBody: {
    footTrafficTopTenItems: [
      {
        districtCode: '11140',
        districtName: '중구',
        totalFootTraffic: 1_900_000,
        footTrafficChangeRate: 3.2,
      },
      {
        districtCode: '11680',
        districtName: '강남구',
        totalFootTraffic: 1_800_000,
        footTrafficChangeRate: -1.1,
      },
    ],
    salesTopTenItems: [],
    openedStoreTopTenItems: [],
    closedStoreTopTenItems: [],
  },
})

/** 성공 응답이지만 네 지표 모두 빈 배열 — 집계가 아직 비어 있는 경우를 흉내낸다. */
const createEmptyTopTen = (): DistrictTopTenResponse => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: {
    footTrafficTopTenItems: [],
    salesTopTenItems: [],
    openedStoreTopTenItems: [],
    closedStoreTopTenItems: [],
  },
})

/**
 * 쿼리 캐시를 미리 채워 SSR 한 번으로 성공 분기를 그리게 한다.
 * (캐시를 비우면 `isPending` 이라 스켈레톤이 나온다 — 아래 첫 테스트가 그 경우다.)
 */
const render = (
  rankingSeed?: AnalysisRankingResponse,
  topTenSeed?: DistrictTopTenResponse,
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  if (rankingSeed) client.setQueryData(QUERY_KEY, rankingSeed)
  if (topTenSeed) client.setQueryData(HOME_TOP_TEN_QUERY_KEY, topTenSeed)

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(PopularDistricts),
    ),
  )
}

describe('PopularDistricts', () => {
  it('데이터가 오기 전에는 자리를 잡아 두고 링크를 내지 않는다', () => {
    const html = render()

    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('지금 많이 본 지역')
    // 스켈레톤 단계에서 누를 수 있는 것이 있으면 안 된다.
    expect(html).not.toContain('href="/analysis?districtCode=')
  })

  it('순위를 그리고 각 항목을 그 자치구의 상권분석으로 보낸다', () => {
    const html = render(
      createResponse([
        { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1234 },
        { rank: 2, areaCode: '11740', areaName: '강동구', viewCount: 987 },
      ]),
    )

    expect(html).toContain('href="/analysis?districtCode=11680"')
    expect(html).toContain('href="/analysis?districtCode=11740"')
    expect(html).toContain('강남구')
    expect(html).toContain('1,234회')
    expect(html).toContain('최근 24시간')
  })

  /*
   * 스냅샷이 "수집되지 않았으면 null" 이라고 못 박은 필드다. 그대로 그리면 목록에
   * 「누를 수는 있는데 무엇인지 모르는 버튼」이 생긴다.
   */
  it('areaName 이 null 이어도 이름 자리를 비우지 않는다', () => {
    const html = render(
      createResponse([
        { rank: 1, areaCode: '11680', areaName: null, viewCount: 10 },
      ]),
    )

    expect(html).toContain('강남구')
  })

  /*
   * 조회 수 집계에는 「전기」가 없다. 변화율 배지를 두면 0%를 「변동 없음」으로
   * 읽히게 만드는 틀린 말이 된다.
   */
  it('변화율을 지어내지 않는다', () => {
    const html = render(
      createResponse([
        { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 10 },
      ]),
    )

    // RankBarList 의 막대 길이는 CSS width:NN% 로 그려진다 — 그건 레이아웃이지
    // 지어낸 변화율 텍스트가 아니다. style 속성을 뺀 나머지에 '%'가 없는지만 본다.
    expect(html.replace(/style="[^"]*"/g, '')).not.toContain('%')
  })

  /*
   * 이 API 만 따로 죽는다(RANKING_001, 503). 홈은 랜딩 내러티브라 오류 카드가 서 있으면
   * 첫인상이 고장난 서비스가 된다. top-ten 쪽도 함께 죽었을 때(둘 다 못 쓸 때)만
   * 섹션을 통째로 뺀다 — top-ten 만 살아 있으면 그쪽만 그린다(듀얼 랭킹 블록의
   * 「조회수가 죽으면 우측만 그린다」가 그 경우를 따로 검증한다).
   */
  it('집계 실패 응답이면 섹션을 통째로 뺀다', () => {
    const html = render(
      createResponse([], { success: false }),
      createTopTen(false),
    )

    expect(html).toBe('')
  })

  it('집계가 비어 있으면 섹션을 통째로 뺀다', () => {
    const html = render(createResponse([]), createEmptyTopTen())

    expect(html).toBe('')
  })

  it('windowHours 가 이상하면 기간 문구 없이 나머지를 그린다', () => {
    const html = render(
      createResponse(
        [{ rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 10 }],
        { windowHours: 0 },
      ),
    )

    expect(html).toContain('강남구')
    expect(html).not.toContain('최근')
  })
})

describe('PopularDistricts — 듀얼 랭킹', () => {
  const rankings = createResponse([
    { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1284 },
    { rank: 2, areaCode: '11440', areaName: '마포구', viewCount: 1102 },
  ])

  it('두 순위가 다 있으면 좌우를 모두 그리고 인사이트를 낸다', () => {
    const html = render(rankings, createTopTen())

    expect(html).toContain('강남구')
    expect(html).toContain('유동인구')
    // 중구는 지표 1위인데 조회수 목록에 없다 → 규칙 A
    expect(html).toContain('중구')
    expect(html).toContain('들지 않았습니다')
  })

  it('지표 쪽 변화율에는 부호를 붙인다', () => {
    const html = render(rankings, createTopTen())

    expect(html).toContain('+3.2%')
  })

  it('조회수 쪽에는 변화율을 붙이지 않는다', () => {
    // 조회수 집계에 전기가 없다. 0 으로 채우면 「변동 없음」이라는 틀린 말이 된다.
    const html = render(rankings, createTopTen())
    const viewSection = html.slice(0, html.indexOf('유동인구'))

    // RankBarList 막대 길이는 CSS width:NN% 로 그려진다 — 지어낸 변화율 텍스트가 아니다.
    expect(viewSection.replace(/style="[^"]*"/g, '')).not.toContain('%')
  })

  it('지표가 죽으면 좌측만 그리고 인사이트를 내지 않는다', () => {
    const html = render(rankings, createTopTen(false))

    expect(html).toContain('강남구')
    expect(html).not.toContain('유동인구')
    expect(html).not.toContain('들지 않았습니다')
  })

  it('조회수가 죽으면 우측만 그린다', () => {
    const html = render(createResponse([], { success: false }), createTopTen())

    expect(html).toContain('유동인구')
    expect(html).not.toContain('href="/analysis?districtCode=11680"')
  })

  it('둘 다 죽으면 섹션을 통째로 뺀다', () => {
    // 홈은 랜딩 내러티브라 오류 카드가 서 있으면 첫인상이 고장난 서비스가 된다.
    const html = render(
      createResponse([], { success: false }),
      createTopTen(false),
    )

    expect(html).toBe('')
  })

  it('아직 안 온 것과 죽은 것을 구별한다', () => {
    // 캐시가 비면 isPending 이다. 기존 스켈레톤이 그대로 나와야 하고,
    // 「죽었다」로 취급해 섹션을 빼면 로딩 중에 홈이 한 칸 꺼진다.
    const html = render()

    expect(html).toContain('aria-busy="true"')
    expect(html).not.toBe('')
  })
})
