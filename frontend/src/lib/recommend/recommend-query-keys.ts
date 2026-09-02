import { createStableCommercialCodes } from './recommend-state'

/**
 * `/recommend` 와 `/recommend/compare` 가 **공유하는** React Query 키.
 *
 * 두 화면이 같은 데이터를 받으려면 키가 글자 하나까지 같아야 한다. 키를 각자
 * 인라인으로 적으면 어긋나도 아무도 모르고, 증상은 "같은 화면인데 숫자가 다르다"로
 * 나타난다. 그래서 여기서만 만든다.
 */

export const recommendCommercialsKey = (
  districtCode?: string | null,
  administrationCode?: string | null,
) =>
  [
    'recommend',
    'regions',
    'commercials',
    districtCode,
    administrationCode,
  ] as const

export const recommendResultsKey = ({
  districtCode,
  administrationCode,
  serviceCode,
  periodCode,
  commercialCodesKey,
}: {
  districtCode?: string | null
  administrationCode?: string | null
  serviceCode?: string | null
  periodCode: string
  commercialCodesKey?: string | null
}) =>
  [
    'recommend',
    'results',
    districtCode,
    administrationCode,
    serviceCode,
    periodCode,
    commercialCodesKey,
  ] as const

export const recommendProfileKey = (
  commercialCode: string,
  serviceCode?: string | null,
  periodCode?: string,
) => ['recommend', 'profile', commercialCode, serviceCode, periodCode] as const

/**
 * 추천 요청의 캐시 키 문자열. `recommend-state` 의 `commercialCodesKey` 와 **같은 규칙**이다
 * (`createStableCommercialCodes(...).join(',')`). 한쪽만 바뀌면 캐시가 갈라진다.
 */
export const createCommercialCodesKey = (
  codes: readonly (string | number)[],
): string => createStableCommercialCodes(codes).join(',')

/**
 * 상권 A/B 비교 (`GET /commercials/compare`).
 *
 * 좌·우를 **정렬하지 않는다.** 응답의 `diffValue` 가 좌 - 우이고 추천측도 방향을
 * 가리키므로, 좌우를 바꾼 요청은 다른 화면이다 — 같은 키로 묶으면 뒤집힌 표가
 * 캐시에서 그대로 나온다.
 */
export const recommendComparisonKey = ({
  leftCommercialCode,
  rightCommercialCode,
  serviceCode,
  periodCode,
}: {
  leftCommercialCode?: string | null
  rightCommercialCode?: string | null
  serviceCode?: string | null
  periodCode: string
}) =>
  [
    'recommend',
    'comparison',
    leftCommercialCode,
    rightCommercialCode,
    serviceCode,
    periodCode,
  ] as const
