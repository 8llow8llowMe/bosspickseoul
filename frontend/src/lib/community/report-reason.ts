/*
 * 신고 다이얼로그의 사유 조립·검증(community.md §S4 「신고 다이얼로그」, CM-012, CM-036).
 *
 * BE 계약은 `reason` 문자열 하나(500자 이하)다. 사유 코드가 BE 에 생기기 전까지는 고른 사유를
 * `[사유]` 접두로 붙여 한 문자열로 보낸다. 라디오 값도 BE 코드처럼 보이는 이름을 지어내지 않고
 * 화면 라벨을 그대로 쓴다.
 */
export const COMMUNITY_REPORT_REASONS = [
  '스팸·홍보',
  '욕설·비방',
  '개인정보 노출',
  '거짓 정보',
  '기타',
] as const

export type CommunityReportReason = (typeof COMMUNITY_REPORT_REASONS)[number]

/** 상세 입력이 필수인 사유. */
export const COMMUNITY_REPORT_REASON_REQUIRING_DETAIL: CommunityReportReason =
  '기타'

export const COMMUNITY_REPORT_REASON_MAX_LENGTH = 500

export const isCommunityReportReason = (
  value: string,
): value is CommunityReportReason =>
  (COMMUNITY_REPORT_REASONS as readonly string[]).includes(value)

/**
 * 보낼 값을 만든다: `[사유] 상세`, 상세가 비면 `[사유]`. 사유 전에는 상세만 돌려준다 —
 * 그 값은 보내지 않고 글자 수 카운터에만 쓴다.
 */
export const composeCommunityReportReason = (
  reason: CommunityReportReason | null,
  detail: string,
): string => {
  const trimmedDetail = detail.trim()

  if (!reason) {
    return trimmedDetail
  }

  return trimmedDetail ? `[${reason}] ${trimmedDetail}` : `[${reason}]`
}

/**
 * 상세 입력칸의 maxLength. 합친 값이 500자를 넘지 않도록 접두(`[사유] `) 몫을 뺀다.
 * 입력을 막는 보조 장치일 뿐이고, 사유를 바꿔 접두가 길어진 경우는 500자 검증이 잡는다.
 */
export const getCommunityReportDetailMaxLength = (
  reason: CommunityReportReason | null,
): number =>
  reason
    ? COMMUNITY_REPORT_REASON_MAX_LENGTH - `[${reason}] `.length
    : COMMUNITY_REPORT_REASON_MAX_LENGTH

/** 합친 문자열 검증(CM-012). 공백만 · 500자 초과를 막는다. */
export const validateCommunityReportReason = (
  reason: string,
): string | null => {
  const trimmedReason = reason.trim()

  if (!trimmedReason) {
    return '신고 사유를 입력해 주세요.'
  }

  if (trimmedReason.length > COMMUNITY_REPORT_REASON_MAX_LENGTH) {
    return '신고 사유는 500자 이하로 입력해 주세요.'
  }

  return null
}

export type CommunityReportInputError = {
  /** 안내를 붙이고 포커스를 옮길 곳. */
  field: 'reason' | 'detail'
  message: string
}

export const validateCommunityReportInput = ({
  reason,
  detail,
}: {
  reason: CommunityReportReason | null
  detail: string
}): CommunityReportInputError | null => {
  if (!reason) {
    return { field: 'reason', message: '신고 사유를 골라 주세요.' }
  }

  if (reason === COMMUNITY_REPORT_REASON_REQUIRING_DETAIL && !detail.trim()) {
    return { field: 'detail', message: '기타 사유를 적어 주세요.' }
  }

  const message = validateCommunityReportReason(
    composeCommunityReportReason(reason, detail),
  )

  return message ? { field: 'detail', message } : null
}
