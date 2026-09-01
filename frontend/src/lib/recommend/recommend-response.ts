import { RECOMMENDATION_TOP_N } from '@/lib/api/recommend'
import type { ApiResponse } from '@/types/api'
import type {
  BlueOceanCategory,
  CandidateCommercial,
  CandidateCommercialsResponse,
  CommercialArea,
  MetricBreakdownItem,
  ScoreMetricMetadata,
} from '@/types/recommend'

/**
 * 추천 API 응답을 **읽는** 규칙. 타입 선언은 런타임 보장이 아니라서
 * 화면에 올리기 전에 여기서 한 번 거른다.
 *
 * 이 모듈이 따로 있는 이유는 `/recommend` 와 `/recommend/compare` 가 **같은
 * 목록**을 봐야 하기 때문이다. 두 화면이 각자 응답을 읽으면 한쪽이 거르는 행을
 * 다른 쪽은 통과시키고, 그러면 추천 요청에 들어가는 상권 코드 집합과
 * `commercialCodesKey` 가 갈라진다 — 캐시가 갈라지고 점수까지 달라진다
 * (명세 §4). 읽는 규칙은 한 곳에만 둔다.
 */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

export const isValidCoordinate = (lng: unknown, lat: unknown): boolean =>
  typeof lng === 'number' &&
  typeof lat === 'number' &&
  Number.isFinite(lng) &&
  Number.isFinite(lat) &&
  lng >= -180 &&
  lng <= 180 &&
  lat >= -90 &&
  lat <= 90

export const isSuccessfulApiResponse = <T>(
  response: ApiResponse<T> | null | undefined,
): response is ApiResponse<T> =>
  response?.dataHeader?.success === true && response.dataBody !== undefined

export const readCommercials = (
  response: ApiResponse<CommercialArea[]> | null | undefined,
): CommercialArea[] => {
  if (!isSuccessfulApiResponse(response) || !Array.isArray(response.dataBody)) {
    return []
  }

  return (response.dataBody as unknown[]).flatMap(commercial => {
    if (
      !isRecord(commercial) ||
      typeof commercial.commercialCode !== 'string' ||
      typeof commercial.commercialName !== 'string' ||
      typeof commercial.commercialClassificationCode !== 'string' ||
      typeof commercial.commercialClassificationName !== 'string' ||
      !isValidCoordinate(commercial.centerLng, commercial.centerLat)
    ) {
      return []
    }

    return [
      {
        commercialCode: commercial.commercialCode,
        commercialName: commercial.commercialName,
        commercialClassificationCode: commercial.commercialClassificationCode,
        commercialClassificationName: commercial.commercialClassificationName,
        centerLng: commercial.centerLng as number,
        centerLat: commercial.centerLat as number,
      },
    ]
  })
}

export const readTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

const readCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : 0

/**
 * 블루오션 목록을 화면에 쓸 수 있는 형태로만 남긴다.
 * `null`·빈 배열·형태가 깨진 항목은 모두 걸러진다 — 호출부는 길이가 0이면 섹션을 렌더하지 않는다.
 */
export const readBlueOceanCategories = (
  value: unknown,
): BlueOceanCategory[] => {
  if (!Array.isArray(value)) return []

  return value.flatMap(category => {
    if (!isRecord(category)) return []

    const serviceName = readTrimmedString(category.serviceName)
    if (!serviceName) return []

    return [
      {
        serviceCode: readTrimmedString(category.serviceCode),
        serviceName,
        commercialStoreCount: readCount(category.commercialStoreCount),
        administrationStoreCount: readCount(category.administrationStoreCount),
        storeRate:
          typeof category.storeRate === 'number' &&
          Number.isFinite(category.storeRate)
            ? category.storeRate
            : Number.NaN,
      },
    ]
  })
}

const readNullableString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null

const normalizeScoreMetricMetadata = (value: unknown): ScoreMetricMetadata => {
  if (
    !isRecord(value) ||
    typeof value.code !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.description !== 'string' ||
    typeof value.scoreDescription !== 'string'
  ) {
    return null
  }

  return {
    code: value.code,
    name: value.name,
    description: value.description,
    scoreDescription: value.scoreDescription,
  }
}

const normalizeMetricBreakdown = (value: unknown): MetricBreakdownItem[] =>
  Array.isArray(value)
    ? value.flatMap(metric => {
        if (!isRecord(metric)) return []

        return [
          {
            metricType: normalizeScoreMetricMetadata(metric.metricType),
            score:
              typeof metric.score === 'number' && Number.isFinite(metric.score)
                ? metric.score
                : null,
            grade: readNullableString(metric.grade),
            summaryLabel: readNullableString(metric.summaryLabel),
          },
        ]
      })
    : []

const normalizeCandidateCommercial = (
  item: unknown,
): CandidateCommercial | null => {
  if (
    !isRecord(item) ||
    typeof item.commercialCode !== 'string' ||
    typeof item.commercialName !== 'string' ||
    typeof item.rank !== 'number' ||
    !Number.isFinite(item.rank)
  ) {
    return null
  }

  return {
    rank: item.rank,
    commercialCode: item.commercialCode,
    commercialName: item.commercialName,
    compositeScore:
      typeof item.compositeScore === 'number' &&
      Number.isFinite(item.compositeScore)
        ? item.compositeScore
        : null,
    grade: readNullableString(item.grade),
    summaryLabel: readNullableString(item.summaryLabel),
    selectionReason: readNullableString(item.selectionReason),
    opportunityLabel: readNullableString(item.opportunityLabel),
    riskLabel: readNullableString(item.riskLabel),
    metricBreakdown: normalizeMetricBreakdown(item.metricBreakdown),
    reasonTags: Array.isArray(item.reasonTags)
      ? item.reasonTags.filter(
          (reasonTag): reasonTag is string => typeof reasonTag === 'string',
        )
      : [],
    // 백엔드가 산정에 실패하면 빈 목록으로 강등하는 계약이라 `null`·`[]`는 오류가 아니다.
    blueOceanCategories: readBlueOceanCategories(item.blueOceanCategories),
  }
}

/**
 * 추천 응답의 후보를 화면에 올릴 수 있는 목록으로 줄인다 —
 * 항목별 정규화 → rank 순 정렬 → 요청한 코드만 → 중복 제거 → Top N 까지.
 *
 * **`/recommend` 와 `/recommend/compare` 가 이 함수 하나를 같이 쓴다.** 한쪽이
 * 날것의 `items` 를 정렬·중복제거만 하고 쓰면, `rank` 가 `null` 인 행에서
 * `left.rank - right.rank` 가 `NaN` 이 되어 정렬 순서가 규정되지 않고 두 화면이
 * 같은 상권에 다른 순위를 붙인다. `metricBreakdown` 이 배열이 아니면 한쪽은
 * 그대로 살려 보내 표가 통째로 죽는다. 계약 위반은 **한 곳에서** 거른다(명세 §4).
 */
export const normalizeRecommendationResults = (
  response: CandidateCommercialsResponse | null | undefined,
  allowedCommercialCodes: readonly string[],
): CandidateCommercial[] => {
  if (
    !isSuccessfulApiResponse(response) ||
    !Array.isArray(response.dataBody?.items)
  ) {
    return []
  }

  const allowedCodes = new Set(allowedCommercialCodes.map(String))
  const seen = new Set<string>()

  return (response.dataBody.items as unknown[])
    .flatMap(item => {
      const normalized = normalizeCandidateCommercial(item)
      return normalized ? [normalized] : []
    })
    .sort((left, right) => {
      return left.rank - right.rank
    })
    .filter(item => {
      const commercialCode = String(item.commercialCode)

      if (
        !commercialCode ||
        !allowedCodes.has(commercialCode) ||
        seen.has(commercialCode)
      ) {
        return false
      }

      seen.add(commercialCode)
      return true
    })
    .slice(0, RECOMMENDATION_TOP_N)
}
