import { districts } from '@/data/districts'
import {
  createAnalysisExplorerHref,
  createEmptyAnalysisSelection,
} from '@/lib/analysis/selection'
import type { AnalysisRankingBody, AnalysisRankingItem } from '@/types/status'

/**
 * 정적 자치구 코드→이름 표. `@/data/districts` 는 서울 25개 자치구를 전부 담고 있고
 * 홈이 이미(히어로 지도) 번들에 들고 있으므로 **추가 요청 없이** 이름을 메울 수 있다.
 */
const districtNameByCode = new Map(
  districts.map(district => [String(district.gooCode), district.gooName]),
)

export type PopularDistrict = {
  rank: number
  districtCode: string
  /** 표시용 이름. 절대 비지 않는다 — 아래 폴백 규칙 참고. */
  name: string
  viewCount: number
  /** 누를 곳. 이 자치구를 1단계로 채운 상권분석 탐색 화면. */
  href: string
}

/**
 * 표시 이름을 정한다.
 *
 * 순위 응답의 `areaName` 은 **null 일 수 있다**(스냅샷: "수집되지 않았으면 null").
 * 그대로 그리면 「누를 수는 있는데 무엇인지 모르는 버튼」이 되므로 정적 표로 메우고,
 * 그마저 없으면 코드라도 적는다.
 */
export const resolveDistrictName = (
  areaCode: string,
  areaName: string | null,
): string => {
  const trimmed = areaName?.trim()
  if (trimmed) return trimmed

  return districtNameByCode.get(areaCode) ?? areaCode
}

/**
 * 조회 수 표기. 변화율은 **의도적으로 없다** — 집계에 「전기」가 없어서 0 으로 채우면
 * 「변동 없음」이라는 틀린 말을 하게 된다. 절대값만 적는다.
 */
export const formatViewCount = (viewCount: number): string =>
  `${new Intl.NumberFormat('ko-KR').format(Math.max(0, Math.trunc(viewCount)))}회`

/**
 * 집계 창을 문장으로. `windowHours` 가 24의 배수면 일 단위로 읽는 편이 자연스럽다.
 * 값이 이상하면(0 이하·비유한) 창 표기를 포기한다 — 틀린 기간을 적느니 안 적는다.
 */
export const formatRankingWindow = (windowHours: number): string | null => {
  if (!Number.isFinite(windowHours) || windowHours <= 0) return null

  const hours = Math.trunc(windowHours)
  if (hours % 24 === 0) {
    const days = hours / 24
    return days === 1 ? '최근 24시간' : `최근 ${days}일`
  }

  return `최근 ${hours}시간`
}

const createDistrictHref = (districtCode: string): string =>
  createAnalysisExplorerHref({
    ...createEmptyAnalysisSelection(),
    districtCode,
  })

/**
 * 순위 항목을 화면이 쓸 형태로 옮긴다.
 *
 * `areaCode` 가 비어 있으면 **버린다** — 누를 곳을 만들 수 없는 항목은 장식일 뿐이고,
 * 링크 없이 남기면 목록 안에서 혼자 죽은 행이 된다.
 */
export const toPopularDistricts = (
  items: readonly AnalysisRankingItem[],
): PopularDistrict[] =>
  items
    .filter(item => Boolean(item.areaCode?.trim()))
    .map(item => {
      const districtCode = item.areaCode.trim()

      return {
        rank: item.rank,
        districtCode,
        name: resolveDistrictName(districtCode, item.areaName),
        viewCount: item.viewCount,
        href: createDistrictHref(districtCode),
      }
    })

export type PopularDistrictsView = {
  items: PopularDistrict[]
  windowLabel: string | null
}

export const toPopularDistrictsView = (
  body: AnalysisRankingBody,
): PopularDistrictsView => ({
  items: toPopularDistricts(body.rankings ?? []),
  windowLabel: formatRankingWindow(body.windowHours),
})
