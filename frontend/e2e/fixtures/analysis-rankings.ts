import type { Page } from '@playwright/test'
import type { AnalysisRankingResponse } from '../../src/types/status'

/**
 * 「지금 많이 본 지역」 고정 응답.
 *
 * 이 섹션은 백엔드 집계 상태에 따라 dual(조회 순위 + 지표 순위) / 솔로 / 섹션 제거로
 * 갈리고, 그 분기가 **문서 높이와 sticky 트랙 비중을 통째로 바꾼다**. 지표를 재는
 * 테스트가 백엔드 집계 상태에 흔들리면 래칫이 의미를 잃으므로 여기만 고정한다.
 *
 * 필드는 `src/types/status.ts` 의 `AnalysisRankingBody` 에 있는 것만 쓴다(계약 창작 금지).
 * 항목은 3건 — 감사 §3-E 가 제안한 「dual 최소 표본 n≥3」의 하한과 같다.
 */
export const analysisRankingsFixture: AnalysisRankingResponse = {
  dataHeader: { success: true, resultCode: '0000', resultMessage: null },
  dataBody: {
    areaType: {
      code: 'DISTRICT',
      name: '자치구',
      description: '자치구 단위 조회 순위',
    },
    windowHours: 24,
    rankings: [
      { rank: 1, areaCode: '11680', areaName: '강남구', viewCount: 128 },
      { rank: 2, areaCode: '11440', areaName: '마포구', viewCount: 96 },
      { rank: 3, areaCode: '11560', areaName: '영등포구', viewCount: 74 },
    ],
  },
}

/** BFF 프록시 경유 호출(`/api/bff/analysis-rankings?...`)만 가로챈다. */
export const routeAnalysisRankings = async (page: Page) => {
  await page.route('**/api/bff/analysis-rankings**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json;charset=utf-8',
      body: JSON.stringify(analysisRankingsFixture),
    })
  })
}
