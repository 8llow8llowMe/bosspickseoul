/**
 * `/analysis` 1단계의 「지금 많이 본 상권」 표시 규칙.
 *
 * 홈의 자치구 순위(`lib/home/popular-districts.ts`)와 **같은 API·같은 단위**를 읽지만
 * 두 가지가 다르다.
 *
 * 1. **정적 이름표가 없다.** 자치구는 25개뿐이라 번들에 든 표로 이름을 메울 수 있었지만
 *    상권은 수천 개다. `areaName` 이 없으면 코드를 적는 것 외에 방법이 없다.
 * 2. **`href` 를 만들 수 없다.** 응답은 상권 코드 하나뿐이고 분석 화면은 자치구·행정동까지
 *    요구한다. 상위 코드는 눌린 뒤에 역조회로 얻으므로(`fetchCommercialRegion`),
 *    여기서는 링크가 아니라 **누를 코드**만 낸다.
 */

import { formatRankingWindow } from '@/lib/rankings/ranking-format'
import type { AnalysisRankingBody, AnalysisRankingItem } from '@/types/status'

export type PopularCommercial = {
  rank: number
  commercialCode: string
  /** 표시용 이름. 비지 않는다 — 이름이 없으면 코드를 적는다. */
  name: string
  viewCount: number
}

/**
 * 표시 이름. 순위 응답의 `areaName` 은 **null 일 수 있다**(스냅샷: "수집되지 않았으면
 * null"). 비워 두면 「누를 수는 있는데 무엇인지 모르는 버튼」이 된다.
 */
export const resolveCommercialName = (
  areaCode: string,
  areaName: string | null,
): string => areaName?.trim() || areaCode

export type PopularCommercialsView = {
  items: PopularCommercial[]
  windowLabel: string | null
}

/**
 * 순위 항목을 화면이 쓸 형태로 옮긴다.
 *
 * `areaCode` 가 비어 있으면 **버린다** — 역조회할 코드가 없으면 눌러도 갈 데가 없고,
 * 죽은 행을 목록에 남기는 것보다 빼는 편이 정직하다.
 */
export const toPopularCommercials = (
  items: readonly AnalysisRankingItem[],
  limit: number,
): PopularCommercial[] =>
  items
    .filter(item => Boolean(item.areaCode?.trim()))
    .slice(0, Math.max(0, limit))
    .map(item => {
      const commercialCode = item.areaCode.trim()

      return {
        rank: item.rank,
        commercialCode,
        name: resolveCommercialName(commercialCode, item.areaName),
        viewCount: item.viewCount,
      }
    })

export const toPopularCommercialsView = (
  body: AnalysisRankingBody,
  limit: number,
): PopularCommercialsView => ({
  items: toPopularCommercials(body.rankings ?? [], limit),
  windowLabel: formatRankingWindow(body.windowHours),
})
