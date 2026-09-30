import {
  createAnalysisExplorerHref,
  createEmptyAnalysisSelection,
} from '@/lib/analysis/selection'

/**
 * 자치구 상세의 항목을 상권분석으로 잇는 링크와, 이미 도착해 있는 비율 표기를 만든다.
 *
 * **새 API 호출이 없다.** 여기서 쓰는 코드·비율은 전부
 * `GET /districts/{districtCode}` 응답에 이미 들어 있는데 화면이 쓰지 않던 필드다.
 * 명세: `docs/features/status/district-detail-links.md`
 *
 * ⚠️ 목적지는 언제나 `/analysis` 다. 여기서 만드는 링크는 **업종·행정동 단위**인데
 * `/status` 는 자치구 단위 화면이라 받을 자리가 없다(행정동은 아예 화면이 없다).
 * `/status?district=` 자체는 2026-09-30 부터 25개 구 모두 유효하다(status.md 1.2) —
 * 예전엔 「현재 지표 Top10」 밖 코드를 버려서 그것도 목적지로 쓸 수 없었다.
 */

const trimmed = (value: string | null | undefined): string | null => {
  const next = value?.trim()
  return next ? next : null
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/**
 * 자치구 → 상권분석. 상세 맨 아래 「{구} 상권 분석하기」 CTA 가 쓴다. 자치구만 채우므로
 * 활성 단계는 **행정동**이 된다. 코드가 없으면 링크를 만들지 않는다.
 */
export const createDistrictHref = (
  districtCode: string | null | undefined,
): string | undefined => {
  const district = trimmed(districtCode)
  if (!district) return undefined

  return createAnalysisExplorerHref({
    ...createEmptyAnalysisSelection(),
    districtCode: district,
  })
}

/**
 * 행정동 → 상권분석. 자치구·행정동이 채워지므로 활성 단계는 **상권**이 된다.
 * 둘 중 하나라도 없으면 링크를 만들지 않는다(누를 데 없는 링크를 만들지 않는다).
 */
export const createDistrictAdministrationHref = (
  districtCode: string | null | undefined,
  administrationCode: string | null | undefined,
): string | undefined => {
  const district = trimmed(districtCode)
  const administration = trimmed(administrationCode)
  if (!district || !administration) return undefined

  return createAnalysisExplorerHref({
    ...createEmptyAnalysisSelection(),
    districtCode: district,
    administrationCode: administration,
  })
}

/**
 * 업종 → 상권분석. 자치구·업종이 채워지므로 활성 단계는 **행정동**이 된다.
 *
 * 넘긴 업종이 사용자가 나중에 고를 상권에 없을 수 있지만 **여기서 검사하지 않는다.**
 * `selectAnalysisValue` 의 `commercial` 분기가 이미 같은 규칙을 쓴다 — 업종을 보존하고,
 * 상권별 업종 목록이 도착한 뒤 `analysis-map-shell` 의 정합성 효과가 URL 에서 지운다.
 */
export const createDistrictServiceHref = (
  districtCode: string | null | undefined,
  serviceCode: string | null | undefined,
): string | undefined => {
  const district = trimmed(districtCode)
  const service = trimmed(serviceCode)
  if (!district || !service) return undefined

  return createAnalysisExplorerHref({
    ...createEmptyAnalysisSelection(),
    districtCode: district,
    serviceCode: service,
  })
}

/**
 * 개업률·폐업률 표기. 부호를 붙이지 않는다(증감이 아니라 비율이다).
 *
 * 값이 없으면 `undefined` 를 돌려준다 — 화면은 보조 표기만 생략하고 건수는 그대로
 * 보여준다. **`0%` 로 채우지 않는다**: 집계가 없는 것과 0인 것은 다른 말이다.
 */
export const formatRateSuffix = (
  label: string,
  rate: number | null | undefined,
): string | undefined => {
  if (!isFiniteNumber(rate)) return undefined

  const rounded = Math.round(rate * 10) / 10
  return `${label} ${rounded}%`
}

/** 증감률 표기. 이쪽은 부호를 붙인다 — 기존 `formatStatusChange` 와 같은 규칙. */
export const formatChangeSuffix = (
  rate: number | null | undefined,
): string | undefined => {
  if (!isFiniteNumber(rate)) return undefined

  const rounded = Math.round(rate * 10) / 10
  return rounded > 0 ? `+${rounded}%` : `${rounded}%`
}
