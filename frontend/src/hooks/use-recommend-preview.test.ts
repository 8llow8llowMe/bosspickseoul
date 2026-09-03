import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import type { DemoSelection } from '@/data/home-demo'
import { useRecommendPreview } from '@/hooks/use-recommend-preview'
import type {
  AdministrationAreasResponse,
  CandidateCommercialsResponse,
  CommercialAreasResponse,
} from '@/types/recommend'

/*
 * D8-3: 03단계가 강남구 역삼1동 · 커피-음료 고정 시드 대신 02단계의 선택을 그대로
 * 이어받는다. 이 파일은 그 3단 연쇄(자치구→행정동→상권→추천)의 배선 자체를
 * 검증한다 — 화면 문구는 `recommend-preview.test.ts`가 본다.
 */

/*
 * 훅은 JSX를 반환하지 않으므로, 반환값을 렌더된 문자열에 JSON으로 실어 꺼낸다
 * (외부 변수에 재할당하면 렌더 중 side effect라 react-hooks 규칙에 걸린다).
 */
function Probe({ selection }: { selection: DemoSelection }) {
  const state = useRecommendPreview(selection)
  return createElement('script', {
    type: 'application/json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(state) },
  })
}

const renderProbe = (client: QueryClient, selection: DemoSelection) => {
  const html = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(Probe, { selection }),
    ),
  )
  const match = html.match(/<script[^>]*>(.*)<\/script>/)
  if (!match) throw new Error('훅 결과를 렌더 결과에서 찾지 못했다')
  return JSON.parse(match[1]) as ReturnType<typeof useRecommendPreview>
}

const GANGNAM: DemoSelection = { districtId: 'gangnam', industryId: 'cafe' }
const MAPO: DemoSelection = { districtId: 'mapo', industryId: 'restaurant' }

describe('useRecommendPreview — 쿼리 키', () => {
  it('선택(자치구·업종)이 다르면 03 체인의 쿼리 키도 달라진다', () => {
    const gangnamClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    renderProbe(gangnamClient, GANGNAM)
    const gangnamKeys = gangnamClient
      .getQueryCache()
      .getAll()
      .map(query => query.queryKey)

    const mapoClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    renderProbe(mapoClient, MAPO)
    const mapoKeys = mapoClient
      .getQueryCache()
      .getAll()
      .map(query => query.queryKey)

    const gangnamPreviewKey = gangnamKeys.find(
      key => key[1] === 'recommendPreview',
    )
    const mapoPreviewKey = mapoKeys.find(key => key[1] === 'recommendPreview')

    expect(gangnamPreviewKey).toBeDefined()
    expect(mapoPreviewKey).toBeDefined()
    expect(gangnamPreviewKey).not.toEqual(mapoPreviewKey)
    // 예전(HOME_RECOMMEND_SEED)엔 상권 코드 배열만 키라 지역이 바뀌면 이전 지역의
    // 캐시를 그대로 받는 결함이 있었다 — 이제 자치구·업종 코드가 키에 직접 있다.
    expect(gangnamPreviewKey).toContain('11680')
    expect(gangnamPreviewKey).toContain('CS100010')
    expect(mapoPreviewKey).toContain('11440')
    expect(mapoPreviewKey).toContain('CS100001')
  })
})

describe('useRecommendPreview — 3단 연쇄', () => {
  const districtCode = '11680'
  const administrationCode = '11680660'
  const serviceCode = 'CS100010'

  const administrations: AdministrationAreasResponse = {
    dataHeader: { success: true, resultCode: null, resultMessage: null },
    dataBody: [
      {
        administrationCode,
        administrationName: '논현2동',
        centerLat: 37.51,
        centerLng: 127.03,
      },
    ],
  }

  const commercials: CommercialAreasResponse = {
    dataHeader: { success: true, resultCode: null, resultMessage: null },
    dataBody: [
      {
        commercialCode: 'c1',
        commercialName: '상권1',
        commercialClassificationCode: 'A',
        commercialClassificationName: '골목상권',
        centerLat: 37.5,
        centerLng: 127.03,
      },
      {
        commercialCode: 'c2',
        commercialName: '상권2',
        commercialClassificationCode: 'A',
        commercialClassificationName: '골목상권',
        centerLat: 37.5,
        centerLng: 127.03,
      },
    ],
  }

  // 실측: topN=5를 요청해도 스포츠 강습(CS200005)처럼 후보가 topN보다 적게 오는
  // 시드가 있다 — M을 topN으로 굳히지 않고 응답 길이를 그대로 옮기는지 본다.
  const recommendations = (count: number): CandidateCommercialsResponse => ({
    dataHeader: { success: true, resultCode: null, resultMessage: null },
    dataBody: {
      serviceCode,
      periodCode: '20233',
      preset: { code: 'P', name: '프리셋', description: '' },
      priorityMetric: {
        code: 'M',
        name: '지표',
        description: '',
        scoreDescription: '',
      },
      topN: 5,
      summary: '',
      items: Array.from({ length: count }, (_, i) => ({
        rank: i + 1,
        commercialCode: `c${i + 1}`,
        commercialName: `상권${i + 1}`,
        compositeScore: 90 - i,
        grade: 'HIGH',
        summaryLabel: null,
        selectionReason: i === 0 ? '이유' : null,
        opportunityLabel: null,
        riskLabel: null,
        metricBreakdown: [],
        reasonTags: [],
      })),
    },
  })

  it('아무것도 응답하지 않았으면 로딩 상태다', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const result = renderProbe(client, GANGNAM)

    expect(result.isLoading).toBe(true)
    expect(result.administrationName).toBeNull()
  })

  it('행정동까지만 응답했으면 그 이름을 노출하고 여전히 로딩이다', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    client.setQueryData(
      ['home', 'recommendAdministrations', districtCode],
      administrations,
    )
    const result = renderProbe(client, GANGNAM)

    expect(result.administrationName).toBe('논현2동')
    expect(result.isLoading).toBe(true)
  })

  it('3단이 모두 응답하면 로딩이 끝나고 실제 개수를 그대로 옮긴다(5로 반올림하지 않음)', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    client.setQueryData(
      ['home', 'recommendAdministrations', districtCode],
      administrations,
    )
    client.setQueryData(
      ['home', 'recommendCommercials', districtCode, administrationCode],
      commercials,
    )
    client.setQueryData(
      [
        'home',
        'recommendPreview',
        districtCode,
        administrationCode,
        serviceCode,
        ['c1', 'c2'],
      ],
      recommendations(3),
    )

    const result = renderProbe(client, GANGNAM)

    expect(result.isLoading).toBe(false)
    expect(result.commercialsCount).toBe(2)
    expect(result.view.rows).toHaveLength(3)
    expect(result.view.isSample).toBe(false)
  })

  it('행정동 응답이 실패로 끝나면(더 기다릴 게 없음) 로딩이 아니라 폴백이다', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    client.setQueryData(['home', 'recommendAdministrations', districtCode], {
      dataHeader: {
        success: false,
        resultCode: 'X',
        resultMessage: '실패',
      },
      dataBody: [],
    } satisfies AdministrationAreasResponse)

    const result = renderProbe(client, GANGNAM)

    expect(result.isLoading).toBe(false)
    expect(result.view.isSample).toBe(true)
  })
})
