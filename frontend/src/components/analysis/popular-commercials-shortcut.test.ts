import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import PopularCommercialsShortcut from '@/components/analysis/popular-commercials-shortcut'
import type {
  AnalysisRankingItem,
  AnalysisRankingResponse,
} from '@/types/status'

const QUERY_KEY = ['analysis', 'popularCommercials', 3]

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
    areaType: { code: 'COMMERCIAL', name: '상권', description: '' },
    windowHours,
    rankings,
  },
})

const render = (seed?: AnalysisRankingResponse) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  if (seed) client.setQueryData(QUERY_KEY, seed)

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(PopularCommercialsShortcut, { onJump: () => undefined }),
    ),
  )
}

const rankings: AnalysisRankingItem[] = [
  { rank: 1, areaCode: '3110008', areaName: '역삼역', viewCount: 2104 },
  { rank: 2, areaCode: '3110009', areaName: '강남역', viewCount: 1880 },
]

describe('PopularCommercialsShortcut', () => {
  it('데이터가 오기 전에는 자리를 잡아 두고 누를 것을 내지 않는다', () => {
    const html = render()

    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('역삼역')
  })

  it('순위와 조회 수를 그리고 집계 창을 함께 적는다', () => {
    const html = render(createResponse(rankings))

    expect(html).toContain('역삼역')
    expect(html).toContain('2,104회')
    expect(html).toContain('최근 24시간')
  })

  /*
   * 이 API 만 따로 죽는다(RANKING_001, 503) — 그 실패가 자치구 선택 패널 전체로
   * 번지면 안 된다. 오류 카드를 두지 않고 블록을 통째로 뺀다.
   */
  it('순위 API 가 실패하면 블록을 통째로 뺀다', () => {
    expect(render(createResponse([], { success: false }))).toBe('')
  })

  it('집계가 비어 있으면 빈 목록을 그리지 않는다', () => {
    expect(render(createResponse([]))).toBe('')
  })

  /* 코드가 없으면 역조회를 할 수 없어 눌러도 갈 데가 없다. */
  it('코드 없는 항목만 오면 블록을 내지 않는다', () => {
    const html = render(
      createResponse([
        { rank: 1, areaCode: '', areaName: '이름만 있는 행', viewCount: 10 },
      ]),
    )

    expect(html).toBe('')
  })

  it('각 항목이 무엇을 하는 버튼인지 읽히게 한다', () => {
    const html = render(createResponse(rankings))

    expect(html).toContain('1위 역삼역, 조회 2,104회. 이 상권으로 조건 채우기')
  })
})
