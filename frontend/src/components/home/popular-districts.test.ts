import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServerStyleSheet } from 'styled-components'
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
 * 200 이지만 **선택된(기본) 지표만** 비고 나머지 지표는 정상인 경우.
 * top-ten 이 배열 하나만 못 채운 배포 직후 상태를 흉내낸다 — A 리뷰 지적사항.
 */
const createPartialTopTen = (): DistrictTopTenResponse => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: {
    footTrafficTopTenItems: [],
    salesTopTenItems: [
      {
        districtCode: '11680',
        districtName: '강남구',
        totalSalesAmount: 3_345_727_318_759,
        salesChangeRate: -1.0,
      },
    ],
    openedStoreTopTenItems: [
      {
        districtCode: '11680',
        districtName: '강남구',
        openedStoreCount: 1299,
        openingChangeRate: -12.2,
      },
    ],
    closedStoreTopTenItems: [],
  },
})

/**
 * 쿼리 캐시를 미리 채워 SSR 한 번으로 성공 분기를 그리게 한다.
 * (캐시를 비우면 `isPending` 이라 스켈레톤이 나온다 — 아래 첫 테스트가 그 경우다.)
 */
const buildElement = (
  rankingSeed?: AnalysisRankingResponse,
  topTenSeed?: DistrictTopTenResponse,
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  if (rankingSeed) client.setQueryData(QUERY_KEY, rankingSeed)
  if (topTenSeed) client.setQueryData(HOME_TOP_TEN_QUERY_KEY, topTenSeed)

  return createElement(
    QueryClientProvider,
    { client },
    createElement(PopularDistricts),
  )
}

const render = (
  rankingSeed?: AnalysisRankingResponse,
  topTenSeed?: DistrictTopTenResponse,
) => renderToStaticMarkup(buildElement(rankingSeed, topTenSeed))

/** styled-components 가 실제로 낸 CSS 규칙을 문자열로 뽑는다(조건부 스타일 검증용). */
const renderStyles = (element: ReturnType<typeof buildElement>): string => {
  const styleSheet = new ServerStyleSheet()

  try {
    renderToStaticMarkup(styleSheet.collectStyles(element))
    return styleSheet.getStyleTags()
  } finally {
    styleSheet.seal()
  }
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

describe('PopularDistricts — 리뷰 수정', () => {
  const rankings = createResponse([
    { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1284 },
    { rank: 2, areaCode: '11440', areaName: '마포구', viewCount: 1102 },
  ])

  /*
   * A. top-ten 이 200 을 주고도 선택된 지표(기본값 유동인구)만 빈 배열일 수
   * 있다. 매출·개업은 정상이므로 토글까지 함께 빼면 멀쩡한 지표로 넘어갈
   * 방법이 없어진다 — 토글은 남기고 그 자리에 안내만 낸다.
   */
  it('선택된 지표만 비어도 토글은 남고 그 자리에 안내를 낸다', () => {
    const html = render(rankings, createPartialTopTen())

    expect(html).toContain('aria-label="지표 선택"')
    expect(html).toContain('유동인구')
    expect(html).toContain('매출')
    expect(html).toContain('개업')
    expect(html).toContain('이 지표는 집계가 없습니다')
  })

  /*
   * B. D5-4 는 한쪽 열만 살아 있으면 100dvh 를 해제하라고 못 박는다 — 그렇지
   * 않으면 170px 남짓한 내용이 900px 한가운데 떠서 위아래가 텅 빈다.
   */
  it('두 열이 모두 있을 때만 100dvh 를 준다', () => {
    const dualStyles = renderStyles(buildElement(rankings, createTopTen()))
    expect(dualStyles).toContain('min-height:100dvh')

    const singleStyles = renderStyles(
      buildElement(rankings, createTopTen(false)),
    )
    expect(singleStyles).not.toContain('min-height:100dvh')
  })

  /*
   * B(재리뷰 추가). 두 쿼리는 서로 다른 네트워크 호출이라 응답 시각이 다르다.
   * 한쪽만 먼저 도착했을 때 "지금 렌더된 열" 기준으로 100dvh 를 계산하면,
   * 아직 안 온 나머지 쪽을 "없다"로 오판해 100dvh → auto 로 수축했다가
   * 나머지가 도착하면 다시 100dvh 로 팽창한다(스켈레톤 → 수축 → 재팽창).
   * 이건 열화 경로가 아니라 **정상 로드마다** 일어난다. 아직 pending 인
   * 쪽은 "최종적으로 있을 것"으로 가정해 100dvh 를 유지해야 한다.
   */
  it('혼합 pending — 한쪽만 먼저 응답해도 100dvh 를 유지한다', () => {
    // 조회수만 먼저 도착, 지표(top-ten)는 아직 pending.
    const viewOnlyStyles = renderStyles(buildElement(rankings, undefined))
    expect(viewOnlyStyles).toContain('min-height:100dvh')

    // 지표만 먼저 도착, 조회수(analysis-rankings)는 아직 pending.
    const metricOnlyStyles = renderStyles(
      buildElement(undefined, createTopTen()),
    )
    expect(metricOnlyStyles).toContain('min-height:100dvh')
  })

  /*
   * F. `formatStatusChange(NaN)` 은 "데이터 없음"을 반환하고 `NaN >= 0` 은
   * false 라 빨간 「데이터 없음」 배지가 찍힌다 — 없는 하락을 있다고 말하는
   * 셈이다. changeRate 가 유한수가 아니면 배지 자체를 붙이지 않는다.
   */
  it('비유한 변화율에는 배지를 붙이지 않는다', () => {
    const topTen = createTopTen()
    topTen.dataBody.footTrafficTopTenItems[0].footTrafficChangeRate = NaN

    const html = render(rankings, topTen)

    expect(html).not.toContain('데이터 없음')
  })
})

/*
 * 규칙 A·B 가 모두 미해당인 dual 시드 — 조회수 상위 3곳과 지표 상위 3곳의 자치구
 * 집합이 같다. 규칙 A 는 "지표 상위인데 아무도 안 보는 곳"을, 규칙 B 는 "많이 보는데
 * 지표 밖인 곳"을 찾으므로 두 집합이 겹치면 둘 다 걸리지 않고 문장이 null 이 된다.
 */
const createOverlappingRankings = (): AnalysisRankingResponse =>
  createResponse([
    { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1234 },
    { rank: 2, areaCode: '11710', areaName: '송파구', viewCount: 987 },
    { rank: 3, areaCode: '11440', areaName: '마포구', viewCount: 654 },
  ])

const createOverlappingTopTen = (): DistrictTopTenResponse => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: {
    footTrafficTopTenItems: [
      {
        districtCode: '11680',
        districtName: '강남구',
        totalFootTraffic: 145_280_452,
        footTrafficChangeRate: 0.7,
      },
      {
        districtCode: '11710',
        districtName: '송파구',
        totalFootTraffic: 120_476_997,
        footTrafficChangeRate: -0.2,
      },
      {
        districtCode: '11440',
        districtName: '마포구',
        totalFootTraffic: 114_208_917,
        footTrafficChangeRate: -1.3,
      },
    ],
    salesTopTenItems: [],
    openedStoreTopTenItems: [],
    closedStoreTopTenItems: [],
  },
})

describe('PopularDistricts — 인사이트 자리 예약(R2)', () => {
  /*
   * 문장이 없을 때 슬롯을 언마운트하면 그 아래 콘텐츠가 74px 올라온다. 지표를
   * 토글할 때마다 레이아웃이 튀는 원인이라, 색만 투명으로 두고 자리는 남긴다.
   */
  it('문장이 없어도 슬롯은 마운트돼 자리를 예약한다', () => {
    const html = render(createOverlappingRankings(), createOverlappingTopTen())

    expect(html).toContain('aria-live="polite"')
    expect(html).not.toContain('들지 않았습니다')
    expect(html).not.toContain('밖입니다')
  })

  it('문장이 없을 때도 예약 높이는 같다', () => {
    const styles = renderStyles(
      buildElement(createOverlappingRankings(), createOverlappingTopTen()),
    )

    expect(styles).toContain('min-height:74px')
  })

  it('문장이 있으면 같은 슬롯에 문장과 강조 테두리가 함께 온다', () => {
    const element = buildElement(
      createResponse([
        { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1234 },
      ]),
      createTopTen(),
    )

    expect(renderToStaticMarkup(element)).toContain('들지 않았습니다')

    const styles = renderStyles(element)
    expect(styles).toContain('min-height:74px')
    expect(styles).toContain('var(--color-primary-100)')
  })

  /*
   * 인사이트는 두 순위의 차이를 말하는 문장이다 — 한쪽 열만 있으면 만들어질 수
   * 없으므로 그 분기에서 74px 를 비워 두면 D5-4 가 없앤 죽은 여백이 되살아난다.
   */
  it('한쪽 열만 있는 분기에서는 슬롯 자체를 두지 않는다', () => {
    const html = render(
      createResponse([
        { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1234 },
      ]),
      createTopTen(false),
    )

    expect(html).toContain('강남구')
    expect(html).not.toContain('aria-live="polite"')
  })
})

/** 지표 12개 — 랭킹 우측이 5로 자르는지 보려면 topN 보다 많아야 한다. */
const createWideTopTen = (): DistrictTopTenResponse => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: {
    footTrafficTopTenItems: Array.from({ length: 12 }, (_, index) => ({
      districtCode: String(11000 + index),
      districtName: `${index + 1}번구`,
      totalFootTraffic: 100_000 - index,
      footTrafficChangeRate: 0,
    })),
    salesTopTenItems: [],
    openedStoreTopTenItems: [],
    closedStoreTopTenItems: [],
  },
})

describe('PopularDistricts — 랭킹 우측은 Top5 를 유지한다(R4)', () => {
  /*
   * 같은 응답을 받아도 01단계는 10행, 여기는 5행이다. 좌측 조회수 8행과의 높이,
   * 그리고 규칙 B 의 「Top 5 밖」 문장을 지키기 위한 분리다.
   */
  it('같은 응답에서도 5행만 그린다', () => {
    const html = render(
      createResponse([
        { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1234 },
      ]),
      createWideTopTen(),
    )

    const metricSection = html.slice(html.indexOf('상위 자치구'))
    expect((metricSection.match(/<li/g) ?? []).length).toBe(5)
  })
})
