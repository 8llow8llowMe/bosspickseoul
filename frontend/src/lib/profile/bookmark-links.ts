import { districts } from '@/data/districts'
import {
  createAnalysisExplorerHref,
  createEmptyAnalysisSelection,
} from '@/lib/analysis/selection'
import { resolveDistrictCodeFromAdministration } from '@/lib/map/geometry'
import type { MemberBookmark } from '@/types/bookmark'
import type { CommercialRegion } from '@/types/recommend'

/*
  프로필 북마크 카드 → 분석 화면(#574). 카드는 이름·날짜만 보여 주고 갈 곳이 없었다. 저장한 지역을 다시 보려면
  분석 화면에서 자치구·행정동을 처음부터 다시 골라야 했다(3~4탭). 카드 자체를 그 단계로 바로 여는 링크로 만든다.
*/

type RegionBookmark = Pick<MemberBookmark, 'targetCode'> & {
  targetType: 'DISTRICT' | 'ADMINISTRATION'
}

const SEOUL_NAME = '서울특별시'

const findDistrictName = (districtCode: string): string | null =>
  districts.find(district => String(district.gooCode) === districtCode)
    ?.gooName ?? null

/**
 * 카드에 내부 코드(「지역 코드 11440660」) 대신 적을 상위 지역 이름.
 *
 * 행정동 코드 앞 5자리가 자치구 코드다(`resolveDistrictCodeFromAdministration`). 자치구 이름은 정적 표에 있으므로
 * 요청 없이 바로 적는다. 표에 없는 코드면 서울로 둔다 — 틀린 구 이름을 적느니 넓게 말하는 편이 낫다.
 */
export const describeRegionBookmarkParent = (
  bookmark: RegionBookmark,
): string => {
  if (bookmark.targetType === 'DISTRICT') return SEOUL_NAME

  const districtName = findDistrictName(
    resolveDistrictCodeFromAdministration(bookmark.targetCode),
  )
  return districtName ? `${SEOUL_NAME} ${districtName}` : SEOUL_NAME
}

/**
 * 지역 북마크 → 분석 탐색 화면. 자치구면 행정동 고르기, 행정동이면 상권 고르기 단계로 바로 연다.
 * 기간은 싣지 않는다 — 지정이 없으면 최신 분기로 연다(`selection.ts` 의 periodCode 규칙).
 */
export const createRegionBookmarkHref = (bookmark: RegionBookmark): string => {
  const empty = createEmptyAnalysisSelection()

  if (bookmark.targetType === 'DISTRICT') {
    return createAnalysisExplorerHref({
      ...empty,
      districtCode: bookmark.targetCode,
    })
  }

  return createAnalysisExplorerHref({
    ...empty,
    districtCode: resolveDistrictCodeFromAdministration(bookmark.targetCode),
    administrationCode: bookmark.targetCode,
  })
}

/**
 * 상권 북마크 → 분석 탐색 화면(업종 고르기 단계).
 *
 * 상권 코드만으로는 상위 코드를 알 수 없어 `GET /regions/commercials/{code}/administration` 으로 한 번 역조회한
 * 결과를 받는다. 목록 전체를 미리 역조회하면 카드 수만큼 요청이 나가므로(N+1) **눌린 카드만** 조회한다
 * (`analysis-ranking.ts` 의 인기 상권 지름길과 같은 결정). 상위 코드가 비어 있으면 반쯤 채운 화면 대신 null.
 */
export const createCommercialBookmarkHref = (
  region: Pick<
    CommercialRegion,
    'commercialCode' | 'districtCode' | 'administrationCode'
  > | null,
): string | null => {
  if (
    !region?.commercialCode ||
    !region.districtCode ||
    !region.administrationCode
  ) {
    return null
  }

  return createAnalysisExplorerHref({
    ...createEmptyAnalysisSelection(),
    districtCode: region.districtCode,
    administrationCode: region.administrationCode,
    commercialCode: region.commercialCode,
  })
}

/* ------------------------------------------------------------------------- *
 * 지역·화면 북마크 안쪽 탭(#606) — 선택을 URL 에 남긴다
 * ------------------------------------------------------------------------- */

export type AnalysisBookmarkTab = 'region' | 'archive'

export const BOOKMARK_TAB_PARAM = 'tab'

/** `?tab=archive` 만 화면 보관함이다. 없거나 모르는 값이면 기본(지역 북마크)으로 연다. */
export const parseAnalysisBookmarkTab = (
  value: string | null | undefined,
): AnalysisBookmarkTab => (value === 'archive' ? 'archive' : 'region')

/**
 * 탭을 바꾼 주소. 기본 탭은 쿼리에서 지운다 — `?tab=region` 과 쿼리 없음이 같은 화면을 두 주소로 갖지 않게 한다.
 * 다른 쿼리는 그대로 둔다.
 */
export const createAnalysisBookmarkTabHref = (
  pathname: string,
  search: string,
  tab: AnalysisBookmarkTab,
): string => {
  const params = new URLSearchParams(search)
  if (tab === 'region') params.delete(BOOKMARK_TAB_PARAM)
  else params.set(BOOKMARK_TAB_PARAM, tab)

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
