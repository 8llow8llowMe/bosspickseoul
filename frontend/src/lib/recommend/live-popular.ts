/**
 * `/recommend` 조건 카드 아래 「지금 많이 본 상권」 띠의 표시 규칙.
 *
 * **실제 조회 집계만 적는다.** 백엔드에는 추천 이벤트 기록이 없어 「n분 전 누가 무엇을
 * 추천받았다」는 문장을 만들 근거가 없다. 그런 문장을 지어내면 허위 활동 표시가 된다.
 * 그래서 이미 있는 `GET /analysis-rankings?areaType=COMMERCIAL`(최근 N시간 조회 수 순위)을
 * 한 줄씩 돌려 보여 준다 — 문구도 「추천받았어요」가 아니라 「많이 봤어요」다.
 */

import {
  toPopularCommercialsView,
  type PopularCommercial,
} from '@/lib/analysis/popular-commercials'
import {
  canShowViewCounts,
  formatViewCount,
} from '@/lib/rankings/ranking-format'
import type { AnalysisRankingBody } from '@/types/status'

/** 돌려 보여 줄 개수. 5개면 한 바퀴가 25초라 같은 이름이 금방 반복되지 않는다. */
export const LIVE_POPULAR_SIZE = 5

/** 한 줄이 머무는 시간. 상권 이름 + 조회 수를 읽기에 충분하고 지루하지 않은 길이. */
export const LIVE_POPULAR_ROTATE_MS = 5000

/** 순위는 실시간 집계라 화면을 켜 둔 동안에도 바뀐다. 1분마다 다시 읽는다. */
export const LIVE_POPULAR_REFETCH_MS = 60_000

export type LivePopularView = {
  items: PopularCommercial[]
  /** 「최근 24시간」 같은 집계 창. 값이 이상하면 null — 틀린 기간을 적느니 안 적는다. */
  windowLabel: string | null
  /**
   * 조회 수를 숫자로 적을지(#600). 돌려 보여 줄 다섯 곳 중 하나라도 임계값(`MIN_VISIBLE_VIEW_COUNT`)
   * 아래면 모든 줄이 순위·이름만 보인다 — 「조회 2회」는 아무도 쓰지 않는 서비스처럼 읽힌다.
   */
  showViewCounts: boolean
}

export const toLivePopularView = (
  body: AnalysisRankingBody | null,
): LivePopularView | null => {
  if (!body) return null

  const view = toPopularCommercialsView(body, LIVE_POPULAR_SIZE)
  return view.items.length > 0
    ? { ...view, showViewCounts: canShowViewCounts(view.items) }
    : null
}

export const nextLivePopularIndex = (index: number, length: number): number =>
  length <= 0 ? 0 : (index + 1) % length

/**
 * 스크린리더용 한 문장. 상권 이름 받침에 따라 조사(이에요/예요)가 갈리므로 조사를 붙이지
 * 않는 나열형으로 적는다.
 */
export const describeLivePopular = (
  item: PopularCommercial,
  windowLabel: string | null,
  showViewCount = true,
): string =>
  `${windowLabel ? `${windowLabel} ` : ''}많이 본 상권 ${item.rank}위, ${item.name}${
    showViewCount ? `, 조회 ${formatViewCount(item.viewCount)}` : ''
  }`
