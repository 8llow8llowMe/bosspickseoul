/**
 * 공유 링크 / 분석 보관함 payload 계약.
 *
 * 백엔드(`commercial-service`)는 payload 를 **해석하지 않는다.** JSON 객체를 그대로 보관했다가
 * 그대로 돌려줄 뿐이다(`backend/docs/share-link-frontend-guide.md`). 따라서 payload 스키마는
 * **프론트가 정하는 계약**이며, 이 파일이 그 정본이다.
 *
 * 공유 링크(`/api/v1/share-links`)와 분석 보관함(`/api/v1/analysis-bookmarks`)은
 * shareType·payload 계약이 완전히 동일하다. 그래서 빌더를 한 벌만 둔다.
 *
 * 규칙
 * - **화면 재현에 필요한 최소 상태만** 담는다. 분석 결과 데이터 자체는 절대 담지 않는다.
 * - key 순서는 무관하다. 백엔드가 정규화(key 정렬) 후 같은 상태를 같은 코드로 인식한다.
 * - 정규화 후 2000자를 넘으면 `SHARE_LINK_005` / `ANALYSIS_BOOKMARK_003~005` 로 거절된다.
 */

import {
  COMPARE_MAX_COMMERCIALS,
  COMPARE_MIN_COMMERCIALS,
} from '@/lib/recommend/compare-url'

export const SHARE_TYPES = [
  'COMMERCIAL_ANALYSIS',
  'DISTRICT_ANALYSIS',
  'ADMINISTRATION_ANALYSIS',
  'COMMERCIAL_COMPARISON',
  'AI_REPORT',
] as const

export type ShareType = (typeof SHARE_TYPES)[number]

export const isShareType = (value: unknown): value is ShareType =>
  typeof value === 'string' && SHARE_TYPES.includes(value as ShareType)

/** 화면 타입 한글 라벨. 보관함 목록/필터 탭에 쓴다. */
export const SHARE_TYPE_LABELS: Record<ShareType, string> = {
  COMMERCIAL_ANALYSIS: '상권 분석',
  DISTRICT_ANALYSIS: '자치구 현황',
  ADMINISTRATION_ANALYSIS: '행정동 탐색',
  COMMERCIAL_COMPARISON: '상권 비교',
  AI_REPORT: 'AI 리포트',
}

/** 백엔드가 내려주는 코드 메타데이터(`CodeNameDescriptionMetadata`). */
export type ShareTypeMetadata = {
  code: string
  name?: string | null
  description?: string | null
}

/** payload 는 JSON 객체다. 값은 문자열/문자열 배열만 쓴다 — URL 로 되돌릴 수 있어야 한다. */
export type SharePayload = Record<string, string | string[]>

/** 상권 상세 분석(`/analysis/result`) 복원에 필요한 최소 상태. */
export type CommercialAnalysisPayload = {
  districtCode: string
  administrationCode: string
  commercialCode: string
  serviceCode: string
  periodCode: string
  /** 결과 화면 탭. 없으면 기본 탭으로 연다. */
  tab?: string
}

/** AI 리포트(`/analysis/report`) 복원에 필요한 최소 상태. 탭이 없다. */
export type AiReportPayload = {
  districtCode: string
  administrationCode: string
  commercialCode: string
  serviceCode: string
  periodCode: string
}

/** 행정동 탐색(`/analysis`) 복원에 필요한 최소 상태. */
export type AdministrationAnalysisPayload = {
  districtCode: string
  administrationCode: string
}

/**
 * 상권 비교(`/recommend/compare`) 복원에 필요한 최소 상태.
 *
 * 조건 셋은 전 열 공통이라 하나씩만 담는다(`compare-url.ts` 와 같은 이유).
 * `commercialCodes` 의 **순서는 의미가 있다** — 사용자가 고른 순서가 곧 열 순서다.
 * 그래서 정렬하지 않는다. 백엔드 정규화는 key 만 정렬하므로 순서가 다르면 다른
 * 공유 코드가 되는데, 그게 맞다. 다른 화면이니 다른 링크여야 한다.
 *
 * 점수는 담지 않는다. `compare-url.ts` 가 URL 에 점수를 싣지 않는 것과 같은 이유로,
 * 링크가 낡은 값을 들고 되살아나면 안 된다.
 */
export type CommercialComparisonPayload = {
  districtCode: string
  administrationCode: string
  serviceCode: string
  commercialCodes: string[]
}

export type SharePayloadByType = {
  COMMERCIAL_ANALYSIS: CommercialAnalysisPayload
  AI_REPORT: AiReportPayload
  ADMINISTRATION_ANALYSIS: AdministrationAnalysisPayload
  /**
   * **미지원.** `/status` 는 URL 의 `district` 를 읽기는 하지만
   * `normalizeStatusSelection` 이 **그 지표의 Top10 안에 있을 때만** 선택을 인정한다.
   * Top10 밖이면 `district` 를 지운 URL 로 `router.replace` 해버려 — 조건이 사라진 기본 화면이
   * 아무 안내 없이 뜬다. 순위는 데이터 갱신마다 바뀌므로 저장 시점에 열리던 링크가 나중에
   * 조용히 깨진다. 빌드 타임에 보장할 수 없어 빌더를 두지 않는다.
   * `/status` 가 Top10 밖 자치구도 상세로 열게 되면 그때 빌더를 추가한다.
   */
  DISTRICT_ANALYSIS: SharePayload
  COMMERCIAL_COMPARISON: CommercialComparisonPayload
}

/** 정규화 후 payload 최대 길이. 초과하면 백엔드가 400 으로 거절한다. */
export const SHARE_PAYLOAD_MAX_LENGTH = 2000

const isNonEmpty = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0

/**
 * 백엔드와 같은 방식으로 payload 를 정규화한다(key 정렬 + 공백 없는 JSON).
 * **길이 검사 전용**이다. 실제 요청 본문은 정규화하지 않고 그대로 보내도 된다 — key 순서는 무관하다.
 */
export const normalizeSharePayload = (payload: SharePayload): string =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(payload).sort(([left], [right]) =>
        left < right ? -1 : left > right ? 1 : 0,
      ),
    ),
  )

export const measureSharePayload = (payload: SharePayload): number =>
  normalizeSharePayload(payload).length

export const isSharePayloadWithinLimit = (payload: SharePayload): boolean =>
  measureSharePayload(payload) <= SHARE_PAYLOAD_MAX_LENGTH

type AnalysisSelectionLike = {
  districtCode: string | null
  administrationCode: string | null
  commercialCode: string | null
  serviceCode: string | null
  periodCode: string
}

/**
 * 상권 분석 결과 화면 payload. 선택이 불완전하면 null 이다 — 호출부에서 공유/보관 버튼을 막는다.
 * `tab` 은 기본 탭('summary')이면 담지 않는다(같은 화면 상태를 같은 코드로 재사용시키기 위해).
 */
export const buildCommercialAnalysisPayload = (
  selection: AnalysisSelectionLike,
  tab?: string | null,
): CommercialAnalysisPayload | null => {
  if (
    !isNonEmpty(selection.districtCode) ||
    !isNonEmpty(selection.administrationCode) ||
    !isNonEmpty(selection.commercialCode) ||
    !isNonEmpty(selection.serviceCode) ||
    !isNonEmpty(selection.periodCode)
  ) {
    return null
  }

  const base: CommercialAnalysisPayload = {
    districtCode: selection.districtCode.trim(),
    administrationCode: selection.administrationCode.trim(),
    commercialCode: selection.commercialCode.trim(),
    serviceCode: selection.serviceCode.trim(),
    periodCode: selection.periodCode.trim(),
  }
  return isNonEmpty(tab) && tab.trim() !== 'summary'
    ? { ...base, tab: tab.trim() }
    : base
}

/** AI 리포트 화면 payload. 선택이 불완전하면 null. */
export const buildAiReportPayload = (
  selection: AnalysisSelectionLike,
): AiReportPayload | null => {
  const payload = buildCommercialAnalysisPayload(selection)
  if (!payload) return null

  const { districtCode, administrationCode, commercialCode, serviceCode } =
    payload
  return {
    districtCode,
    administrationCode,
    commercialCode,
    serviceCode,
    periodCode: payload.periodCode,
  }
}

/**
 * 행정동 탐색 화면 payload.
 *
 * `/analysis` 는 `parseAnalysisSelection` 으로 이 두 키를 그대로 읽어 자치구·행정동이
 * 선택된 상태(3단계 상권 선택)로 진입한다 — 실측 확인됨.
 */
export const buildAdministrationAnalysisPayload = (
  districtCode: string | null | undefined,
  administrationCode: string | null | undefined,
): AdministrationAnalysisPayload | null => {
  if (!isNonEmpty(districtCode) || !isNonEmpty(administrationCode)) return null
  return {
    districtCode: districtCode.trim(),
    administrationCode: administrationCode.trim(),
  }
}

/**
 * 상권 비교 화면 payload. 조건이 불완전하거나 상권이 하한 미만이면 null 이다
 * — 호출부에서 공유/보관 버튼을 막는다.
 *
 * 중복 제거와 상한 절단은 `compare-url.ts` 의 파서와 **같은 규칙**을 쓴다:
 * 첫 등장만 남기고, 순서는 건드리지 않는다. 규칙이 갈리면 저장한 링크와
 * 주소창이 서로 다른 화면을 그린다.
 */
export const buildCommercialComparisonPayload = ({
  districtCode,
  administrationCode,
  serviceCode,
  commercialCodes,
}: {
  districtCode: string | null | undefined
  administrationCode: string | null | undefined
  serviceCode: string | null | undefined
  commercialCodes: readonly string[]
}): CommercialComparisonPayload | null => {
  if (
    !isNonEmpty(districtCode) ||
    !isNonEmpty(administrationCode) ||
    !isNonEmpty(serviceCode)
  ) {
    return null
  }

  const unique: string[] = []
  commercialCodes.forEach(code => {
    const trimmed = typeof code === 'string' ? code.trim() : ''
    if (trimmed && !unique.includes(trimmed)) unique.push(trimmed)
  })

  if (unique.length < COMPARE_MIN_COMMERCIALS) return null

  return {
    districtCode: districtCode.trim(),
    administrationCode: administrationCode.trim(),
    serviceCode: serviceCode.trim(),
    commercialCodes: unique.slice(0, COMPARE_MAX_COMMERCIALS),
  }
}
