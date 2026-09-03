import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import PopularDistricts from '@/components/home/popular-districts'
import type {
  AnalysisRankingItem,
  AnalysisRankingResponse,
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
 * 쿼리 캐시를 미리 채워 SSR 한 번으로 성공 분기를 그리게 한다.
 * (캐시를 비우면 `isPending` 이라 스켈레톤이 나온다 — 아래 첫 테스트가 그 경우다.)
 */
const render = (seed?: AnalysisRankingResponse) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  if (seed) {
    client.setQueryData(QUERY_KEY, seed)
  }

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

    expect(html).not.toContain('%')
  })

  /*
   * 이 API 만 따로 죽는다(RANKING_001, 503). 홈은 랜딩 내러티브라 오류 카드가 서 있으면
   * 첫인상이 고장난 서비스가 된다 — 섹션을 통째로 뺀다.
   */
  it('집계 실패 응답이면 섹션을 통째로 뺀다', () => {
    const html = render(createResponse([], { success: false }))

    expect(html).toBe('')
  })

  it('집계가 비어 있으면 섹션을 통째로 뺀다', () => {
    const html = render(createResponse([]))

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
