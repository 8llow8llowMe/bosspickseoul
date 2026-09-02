/**
 * shareType + payload → 화면 복원 URL.
 *
 * `payload.ts` 빌더의 **역함수**다. 두 파일은 한 쌍으로만 의미가 있으므로
 * `routes.test.ts` 가 라운드트립(상태 → payload → URL → payload)으로 고정한다.
 *
 * 공유 링크 해석(`/s/{shareCode}`)과 보관함 항목 클릭이 둘 다 이 표를 쓴다.
 * 보관함 목록 응답에는 payload 가 그대로 실려 오므로, 해석 API 없이 곧장 이동할 수 있다.
 */

import {
  isShareType,
  SHARE_TYPE_LABELS,
  type SharePayload,
  type ShareType,
} from '@/lib/share/payload'
import {
  COMPARE_MIN_COMMERCIALS,
  createCompareHref,
} from '@/lib/recommend/compare-url'

type RouteBuilder = (payload: SharePayload) => string | null

const read = (payload: SharePayload, key: string): string | null => {
  const value = payload[key]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/**
 * 문자열 배열 값을 읽는다. 중복은 첫 등장만 남기고 **순서는 지킨다**
 * — `compare-url.ts` 파서와 같은 규칙이다.
 *
 * payload 는 보관함·공유 링크 응답으로 되돌아오는 값이라 타입 선언이 런타임을
 * 보장하지 않는다. 배열이 아니면 빈 배열로 떨어뜨려 호출부가 미지원으로 안내하게 한다.
 */
const readList = (payload: SharePayload, key: string): string[] => {
  const value = payload[key]
  if (!Array.isArray(value)) return []

  const unique: string[] = []
  value.forEach(item => {
    const trimmed = typeof item === 'string' ? item.trim() : ''
    if (trimmed && !unique.includes(trimmed)) unique.push(trimmed)
  })
  return unique
}

const toQuery = (entries: [string, string | null][]): string => {
  const params = new URLSearchParams()
  entries.forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  return params.toString()
}

const buildCommercialAnalysisRoute: RouteBuilder = payload => {
  const districtCode = read(payload, 'districtCode')
  const administrationCode = read(payload, 'administrationCode')
  const commercialCode = read(payload, 'commercialCode')
  const serviceCode = read(payload, 'serviceCode')
  if (!districtCode || !administrationCode || !commercialCode || !serviceCode) {
    return null
  }

  const query = toQuery([
    ['districtCode', districtCode],
    ['administrationCode', administrationCode],
    ['commercialCode', commercialCode],
    ['serviceCode', serviceCode],
    ['periodCode', read(payload, 'periodCode')],
    // 기본 탭('summary')은 payload 에 담지 않는다 — 화면이 기본값으로 연다.
    ['tab', read(payload, 'tab')],
  ])
  return `/analysis/result?${query}`
}

const buildAiReportRoute: RouteBuilder = payload => {
  const districtCode = read(payload, 'districtCode')
  const administrationCode = read(payload, 'administrationCode')
  const commercialCode = read(payload, 'commercialCode')
  const serviceCode = read(payload, 'serviceCode')
  if (!districtCode || !administrationCode || !commercialCode || !serviceCode) {
    return null
  }

  const query = toQuery([
    ['districtCode', districtCode],
    ['administrationCode', administrationCode],
    ['commercialCode', commercialCode],
    ['serviceCode', serviceCode],
    ['periodCode', read(payload, 'periodCode')],
  ])
  return `/analysis/report?${query}`
}

const buildAdministrationAnalysisRoute: RouteBuilder = payload => {
  const districtCode = read(payload, 'districtCode')
  const administrationCode = read(payload, 'administrationCode')
  if (!districtCode || !administrationCode) return null

  const query = toQuery([
    ['districtCode', districtCode],
    ['administrationCode', administrationCode],
  ])
  return `/analysis?${query}`
}

/**
 * `/recommend/compare` 복원.
 *
 * URL 조립은 **직접 하지 않고** `createCompareHref` 에 맡긴다. 파라미터 이름과 상한
 * 절단이 한 곳에만 있어야 파서와 어긋나지 않는다 — 이 파일이 이름을 따로 알면
 * 비교 화면의 URL 규칙이 바뀔 때 조용히 갈라진다.
 *
 * 상권이 하한(2) 미만이면 null 이다. 한 개짜리 비교표는 그릴 게 없으므로
 * 조건이 반쯤 사라진 화면을 여느니 미지원으로 안내한다.
 */
const buildCommercialComparisonRoute: RouteBuilder = payload => {
  const districtCode = read(payload, 'districtCode')
  const administrationCode = read(payload, 'administrationCode')
  const serviceCode = read(payload, 'serviceCode')
  if (!districtCode || !administrationCode || !serviceCode) return null

  const commercialCodes = readList(payload, 'commercialCodes')
  if (commercialCodes.length < COMPARE_MIN_COMMERCIALS) return null

  return createCompareHref({
    districtCode,
    administrationCode,
    serviceCode,
    commercialCodes,
  })
}

/**
 * shareType 별 URL 조립기.
 *
 * **`null` 은 "아직 지원하지 않음"이다.** 조용히 조건이 사라진 기본 화면을 여느니
 * 정직하게 미지원으로 안내한다 — 사용자에게는 후자가 에러보다 낫다.
 * 대상 화면이 URL 로 상태를 온전히 복원하게 되면 그때 빌더를 채운다.
 * (근거는 `payload.ts` 의 `SharePayloadByType` 주석)
 */
export const ROUTE_BUILDERS: Record<ShareType, RouteBuilder | null> = {
  COMMERCIAL_ANALYSIS: buildCommercialAnalysisRoute,
  AI_REPORT: buildAiReportRoute,
  ADMINISTRATION_ANALYSIS: buildAdministrationAnalysisRoute,
  // `/status` 는 Top10 밖 자치구를 조용히 버린다(URL 재작성 + 안내 없음).
  DISTRICT_ANALYSIS: null,
  COMMERCIAL_COMPARISON: buildCommercialComparisonRoute,
}

export type ShareRouteResult =
  | { ok: true; href: string }
  | { ok: false; reason: 'unknown-type' | 'unsupported-type' | 'bad-payload' }

/**
 * 해석 결과를 이동 가능한 경로로 바꾼다. 실패 이유를 나눠 돌려준다 —
 * 화면에서 안내 문구가 다르기 때문이다.
 */
export const buildShareRoute = (
  shareTypeCode: string | null | undefined,
  payload: unknown,
): ShareRouteResult => {
  if (!isShareType(shareTypeCode)) return { ok: false, reason: 'unknown-type' }

  const builder = ROUTE_BUILDERS[shareTypeCode]
  if (!builder) return { ok: false, reason: 'unsupported-type' }

  if (typeof payload !== 'object' || payload === null || Array.isArray(payload))
    return { ok: false, reason: 'bad-payload' }

  const href = builder(payload as SharePayload)
  return href ? { ok: true, href } : { ok: false, reason: 'bad-payload' }
}

const SHARE_ROUTE_FAILURE_MESSAGES: Record<
  Exclude<ShareRouteResult, { ok: true }>['reason'],
  string
> = {
  'unknown-type': '알 수 없는 화면 유형이라 링크를 열 수 없어요.',
  'unsupported-type': '아직 지원하지 않는 화면 유형이에요.',
  'bad-payload': '링크에 담긴 화면 정보가 올바르지 않아요.',
}

export const getShareRouteFailureMessage = (
  reason: Exclude<ShareRouteResult, { ok: true }>['reason'],
): string => SHARE_ROUTE_FAILURE_MESSAGES[reason]

/** 목록 UI 에서 항목 이름이 없을 때 보여줄 대체 라벨. */
export const getShareTypeLabel = (shareTypeCode: string | null | undefined) =>
  isShareType(shareTypeCode) ? SHARE_TYPE_LABELS[shareTypeCode] : '분석 화면'

/**
 * URL → payload. `ROUTE_BUILDERS` 의 역함수이며 **라운드트립 테스트 전용**이다.
 * 런타임 코드가 URL 을 다시 payload 로 되돌릴 일은 없지만, 두 방향이 어긋나면
 * 공유 링크가 조용히 다른 화면을 열게 되므로 테스트로 못 박는다.
 */
/**
 * URL 에서 **배열로 되돌려야 하는** 파라미터.
 *
 * `createCompareHref` 가 상권 코드들을 쉼표로 이어 한 파라미터에 담기 때문에,
 * 그대로 읽으면 문자열이 되어 라운드트립이 성립하지 않는다. 이 이름은 비교 화면
 * URL 에만 쓰이므로 shareType 을 몰라도 키만으로 구분할 수 있다.
 */
const LIST_PARAMS = new Set(['commercialCodes'])

export const parseShareRoute = (href: string): SharePayload => {
  const queryIndex = href.indexOf('?')
  if (queryIndex < 0) return {}

  const params = new URLSearchParams(href.slice(queryIndex + 1))
  const payload: SharePayload = {}
  params.forEach((value, key) => {
    payload[key] = LIST_PARAMS.has(key)
      ? value
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)
      : value
  })
  return payload
}
