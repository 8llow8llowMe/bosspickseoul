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

/**
 * 최소 표본(3곳)을 채운 조회 순위 — 좌측 열이 성립하는 가장 작은 입력
 * (ranking-minimum-sample.md). 1~2곳이면 좌측 열이 빠진다.
 */
const THREE_VIEWS = [
  { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1234 },
  { rank: 2, areaCode: '11440', areaName: '마포구', viewCount: 1102 },
  { rank: 3, areaCode: '11110', areaName: '종로구', viewCount: 950 },
]

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
    // 스켈레톤은 「지표만」 문구다 — 어느 최종 상태에서도 거짓이 되지 않는다.
    expect(html).toContain('자치구 지표 순위')
    // 스켈레톤 단계에서 누를 수 있는 것이 있으면 안 된다.
    expect(html).not.toContain('href="/analysis?districtCode=')
  })

  it('순위를 그리고 각 항목을 그 자치구의 상권분석으로 보낸다', () => {
    const html = render(
      createResponse([
        { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 1234 },
        { rank: 2, areaCode: '11740', areaName: '강동구', viewCount: 987 },
        { rank: 3, areaCode: '11110', areaName: '종로구', viewCount: 500 },
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
        { rank: 2, areaCode: '11440', areaName: '마포구', viewCount: 9 },
        { rank: 3, areaCode: '11110', areaName: '종로구', viewCount: 8 },
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
        { rank: 2, areaCode: '11440', areaName: '마포구', viewCount: 9 },
        { rank: 3, areaCode: '11110', areaName: '종로구', viewCount: 8 },
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
        [
          { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 10 },
          { rank: 2, areaCode: '11440', areaName: '마포구', viewCount: 9 },
          { rank: 3, areaCode: '11110', areaName: '종로구', viewCount: 8 },
        ],
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
    { rank: 3, areaCode: '11110', areaName: '종로구', viewCount: 950 },
  ])

  it('두 순위가 다 있으면 좌우를 모두 그리고 인사이트를 낸다', () => {
    const html = render(rankings, createTopTen())

    expect(html).toContain('강남구')
    expect(html).toContain('유동인구')
    // 중구는 지표 1위인데 조회수 목록에 없다 → 규칙 A
    expect(html).toContain('중구')
    expect(html).toContain('들지 않았어요')
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
    expect(html).not.toContain('들지 않았어요')
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
    { rank: 3, areaCode: '11110', areaName: '종로구', viewCount: 950 },
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
    expect(html).toContain('이 지표는 아직 집계가 없어요')
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

describe('PopularDistricts — 넓은 화면 배치', () => {
  const dualElement = () =>
    buildElement(createResponse(THREE_VIEWS), createTopTen())

  /*
   * 셸(상한 없음)이면 1920 에서 한 열이 920px, 막대가 850px 까지 늘어났다.
   * 홈 본문 공용 컬럼(--w-wide)으로 잡아 스토리와 왼쪽 기준선도 맞춘다.
   */
  it('홈 공용 컬럼(--w-wide)을 쓴다', () => {
    expect(renderStyles(dualElement()).replace(/\s+/g, '')).toContain(
      'width:min(var(--w-wide),var(--w-shell))',
    )
  })

  /* 인사이트는 이 섹션의 결론이다 — 두 열 아래가 아니라 위에서 먼저 읽힌다. */
  it('인사이트 문장이 두 순위 목록보다 먼저 온다', () => {
    const html = renderToStaticMarkup(dualElement())

    expect(html.indexOf('들지 않았어요')).toBeGreaterThan(-1)
    expect(html.indexOf('들지 않았어요')).toBeLessThan(
      html.indexOf('aria-label="지금 많이 본 자치구 조회수 순위"'),
    )
  })

  /* 점선 상자는 「무언가 들어갈 자리」로 읽혔다. 글 폭만큼만 칠한다. */
  it('인사이트는 점선 없이 글 폭만큼만 칠한다', () => {
    const styles = renderStyles(dualElement())

    expect(styles).not.toContain('dashed')
    expect(styles).toContain('width:fit-content')
  })
})

describe('PopularDistricts — 인사이트 자리 예약(R2)', () => {
  /*
   * 문장이 없을 때 슬롯을 언마운트하면 그 아래 두 열이 예약 높이만큼 올라온다. 지표를
   * 토글할 때마다 레이아웃이 튀는 원인이라, 색만 투명으로 두고 자리는 남긴다.
   */
  it('문장이 없어도 슬롯은 마운트돼 자리를 예약한다', () => {
    const html = render(createOverlappingRankings(), createOverlappingTopTen())

    expect(html).toContain('aria-live="polite"')
    expect(html).not.toContain('들지 않았어요')
    expect(html).not.toContain('밖이에요')
  })

  /*
   * 슬롯 규칙 블록에 묶어서 본다. min-height 만 찾으면 다른 규칙에 걸려 공허하게
   * 통과할 수 있다. 데스크톱 한 줄(52px), 640 이하 두 줄(74px)이다.
   */
  it('문장이 없을 때도 예약 높이는 같다', () => {
    const styles = renderStyles(
      buildElement(createOverlappingRankings(), createOverlappingTopTen()),
    ).replace(/\s+/g, '')

    expect(styles).toContain('width:fit-content;max-width:100%;min-height:52px')
    expect(styles).toMatch(
      /@media\(max-width:640px\)\{\.\w+\{min-height:74px;\}\}/,
    )
  })

  it('문장이 있으면 같은 슬롯에 문장과 강조 배경이 함께 온다', () => {
    const element = buildElement(createResponse(THREE_VIEWS), createTopTen())

    expect(renderToStaticMarkup(element)).toContain('들지 않았어요')

    /*
     * 배경은 슬롯 규칙 안에서 본다. primary-100 은 토글 활성 버튼·강조 행도 내보내
     * 문자열만 찾으면 슬롯 배경이 사라져도 통과한다.
     */
    const styles = renderStyles(element).replace(/\s+/g, '')
    expect(styles).toContain('width:fit-content;max-width:100%;min-height:52px')
    expect(styles).toContain(
      'border:1pxsolidtransparent;border-radius:var(--radius-card);background:var(--color-primary-100)',
    )
  })

  /*
   * 인사이트는 두 순위의 차이를 말하는 문장이다 — 한쪽 열만 있으면 만들어질 수
   * 없으므로 그 분기에서 74px 를 비워 두면 D5-4 가 없앤 죽은 여백이 되살아난다.
   */
  it('한쪽 열만 있는 분기에서는 슬롯 자체를 두지 않는다', () => {
    const html = render(createResponse(THREE_VIEWS), createTopTen(false))

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
    const html = render(createResponse(THREE_VIEWS), createWideTopTen())

    const metricSection = html.slice(html.indexOf('상위 자치구'))
    expect((metricSection.match(/<li/g) ?? []).length).toBe(5)
  })
})

describe('PopularDistricts — 트랙 없음 (TC-HR-009)', () => {
  it('두 열이어도 스크롤 트랙을 만들지 않는다', () => {
    const styles = renderStyles(
      buildElement(createResponse(THREE_VIEWS), createTopTen()),
    ).replace(/\s+/g, '')

    // 섹션 최소 높이(한 화면, D4-1)는 트랙이 아니다 — 그것만 빼고 dvh 가 없어야 한다.
    expect(styles).toContain('min-height:calc(100dvh-65px)')
    expect(styles.replaceAll('min-height:calc(100dvh-65px)', '')).not.toContain(
      'dvh',
    )
    expect(styles).not.toContain('position:sticky')
  })

  it('지표 토글은 링크가 아닌 버튼이다 — 그 자리에서 목록만 바꾼다', () => {
    const html = render(createResponse(THREE_VIEWS), createTopTen())

    expect(html).toContain('aria-label="지표 선택"')
    expect(html).toMatch(/<button[^>]*>유동인구<\/button>/)
  })
})

describe('PopularDistricts — 최소 표본 (TC-HR-010 · ranking-minimum-sample D7)', () => {
  const two = createResponse(THREE_VIEWS.slice(0, 2))

  it('조회 2곳이면 좌측 열 없이 지표만 그린다', () => {
    const html = render(two, createTopTen())

    expect(html).not.toContain('href="/analysis?districtCode=11680"')
    expect(html).toContain('유동인구')
    expect(html).not.toContain('aria-live="polite"')
  })

  it('지표만 상태의 아이브로·제목', () => {
    const html = render(two, createTopTen())

    expect(html).toContain('자치구 지표 순위')
    expect(html).toContain('유동인구·매출·개업 수로 자치구를 비교해요.')
    expect(html).not.toContain('숫자가 좋은 곳은')
  })

  it('3곳이면 dual 문구와 인사이트 슬롯', () => {
    const html = render(createResponse(THREE_VIEWS), createTopTen())

    expect(html).toContain('다른 사람들이 보는 곳과, 숫자가 좋은 곳은 달라요.')
    expect(html).toContain('aria-live="polite"')
  })

  it('조회만(지표 결손) 상태의 제목', () => {
    const html = render(createResponse(THREE_VIEWS), createTopTen(false))

    expect(html).toContain('지금은 이 자치구들을 많이 보고 있어요.')
  })

  it('조회 2곳 + 지표 결손이면 섹션을 뺀다', () => {
    expect(render(two, createTopTen(false))).toBe('')
  })

  it('스켈레톤은 지표만 문구를 쓴다 — 어느 최종 상태에서도 거짓이 되지 않는다', () => {
    const html = render()

    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('자치구 지표 순위')
    expect(html).toContain('유동인구·매출·개업 수로 자치구를 비교해요.')
  })

  it('제목은 2줄 높이를 예약한다', () => {
    const styles = renderStyles(buildElement(two, createTopTen())).replace(
      /\s+/g,
      '',
    )

    expect(styles).toContain('min-height:72px')
  })
})

/*
 * ranking-minimum-sample D5-1 pending 표. 한쪽이 먼저 와도 나중에 뒤집힐 상태를 먼저
 * 그리지 않는다 — 뒤집히는 순간 인사이트 슬롯·2단 배치가 끼어들어 아래 섹션을 민다.
 */
describe('PopularDistricts — pending 을 결론으로 단정하지 않는다', () => {
  it('조회가 아직 안 왔으면 지표가 먼저 와도 스켈레톤이다', () => {
    const html = render(undefined, createTopTen())

    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('aria-label="지표 선택"')
  })

  it('조회 1곳(결론) + 지표 pending 이면 스켈레톤이다 (TC-RMS-014)', () => {
    const html = render(createResponse(THREE_VIEWS.slice(0, 1)))

    expect(html).toContain('aria-busy="true"')
  })
})

describe('PopularDistricts — 참인 문장만 (TC-RMS-018)', () => {
  it('랜드마크 이름이 상태 문구를 따른다', () => {
    expect(
      render(createResponse(THREE_VIEWS.slice(0, 2)), createTopTen()),
    ).toContain('aria-label="자치구 지표 순위"')
    expect(render(createResponse(THREE_VIEWS), createTopTen())).toContain(
      'aria-label="지금 많이 본 지역"',
    )
    expect(render()).toContain('aria-label="자치구 지표 순위"')
  })

  it('어느 상태에도 합니다체가 없다', () => {
    const states = [
      render(),
      render(createResponse(THREE_VIEWS), createTopTen()),
      render(createResponse(THREE_VIEWS.slice(0, 2)), createTopTen()),
      render(createResponse(THREE_VIEWS), createTopTen(false)),
      render(createResponse(THREE_VIEWS), createPartialTopTen()),
    ]

    for (const html of states) {
      expect(html.replace(/<[^>]+>/g, ' ')).not.toMatch(/습니다|입니다/)
    }
  })
})

/*
 * 겹침 미니 지도(ranking-mini-map.md D5-3). 섹션에 실제로 있는 레이어만 지도에 그린다.
 * 지도 마크업 자체는 `ranking-mini-map.test.ts` 가 본다 — 여기서는 분기 배선만.
 */
describe('PopularDistricts — 겹침 미니 지도', () => {
  const countOf = (html: string, pattern: RegExp) =>
    (html.match(pattern) ?? []).length

  it('듀얼이면 칠과 배지를 함께 그리고 겹치는 구를 요약 문장으로 말한다', () => {
    const html = render(createResponse(THREE_VIEWS), createTopTen())

    expect(html).toContain('role="img"')
    expect(html).toContain(
      '서울 지도에 많이 본 3곳과 유동인구 Top 2 를 표시했어요. 둘 다 든 곳은 강남구예요.',
    )
    expect(countOf(html, /data-rank="\d"/g)).toBe(2)
    expect(countOf(html, /data-badge-rank="/g)).toBe(3)
  })

  it('지도는 두 목록 사이에 있다 — 넓은 폭의 읽는 순서와 같다', () => {
    const html = render(createResponse(THREE_VIEWS), createTopTen())
    const viewAt = html.indexOf('data-rank-column="view"')
    const mapAt = html.indexOf('data-ranking-mini-map')
    const metricAt = html.indexOf('data-rank-column="metric"')

    expect(viewAt).toBeGreaterThan(-1)
    expect(viewAt).toBeLessThan(mapAt)
    expect(mapAt).toBeLessThan(metricAt)
  })

  it('지표만이면 배지 없이 칠만 그린다', () => {
    const html = render(createResponse(THREE_VIEWS.slice(0, 2)), createTopTen())

    expect(countOf(html, /data-rank="\d"/g)).toBe(2)
    expect(countOf(html, /data-badge-rank="/g)).toBe(0)
  })

  it('조회만이면 칠 없이 배지만 그린다', () => {
    const html = render(createResponse(THREE_VIEWS), createTopTen(false))

    expect(countOf(html, /data-rank="\d"/g)).toBe(0)
    expect(countOf(html, /data-badge-rank="/g)).toBe(3)
  })

  it('선택 지표만 비었으면 칠 없이 배지만 남는다', () => {
    const html = render(createResponse(THREE_VIEWS), createPartialTopTen())

    expect(countOf(html, /data-rank="\d"/g)).toBe(0)
    expect(countOf(html, /data-badge-rank="/g)).toBe(3)
    expect(html).not.toContain('data-legend-item="fill"')
  })

  it('스켈레톤에도 같은 크기의 지도 실루엣을 둔다', () => {
    const html = render()

    expect(html).toContain('data-ranking-mini-map')
    expect(countOf(html, /data-district-code="/g)).toBe(25)
    expect(countOf(html, /data-badge-rank="/g)).toBe(0)
  })

  it('섹션이 빠지면 지도도 함께 빠진다', () => {
    expect(render(createResponse([]), createTopTen(false))).toBe('')
  })
})
