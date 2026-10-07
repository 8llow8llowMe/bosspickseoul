import { normalizeApiError } from '@/lib/api/api-error'
import type {
  CommunityReportCreateRequest,
  CommunityReportReasonCode,
} from '@/types/community'

export type { CommunityReportReasonCode }

/*
 * 신고 다이얼로그의 사유 표·검증(community.md §S4 「신고 다이얼로그」, CM-012, CM-036, CM-058).
 *
 * BE #473 부터 사유 코드(`reasonCode`)와 상세(`detail`)를 나눠 보낸다 — 계약은
 * backend/docs/frontend-api-usage-guide.md 「신고 사유 (#473)」. 예전처럼 `[사유] 상세` 를 한 문자열
 * (`reason`)로 합치지 않는다. 순서가 곧 라디오 순서이고, 라벨은 BE 표시명과 글자까지 같다
 * (가운뎃점 U+00B7) — BE 가 레거시 `[라벨] 상세` 를 이 라벨로 해석한다.
 */
export const COMMUNITY_REPORT_REASONS = [
  { code: 'SPAM', label: '스팸·홍보' },
  { code: 'ABUSE', label: '욕설·비방' },
  { code: 'PRIVACY', label: '개인정보 노출' },
  { code: 'FALSE_INFO', label: '거짓 정보' },
  { code: 'ETC', label: '기타' },
] as const satisfies readonly {
  code: CommunityReportReasonCode
  label: string
}[]

/** 상세 입력이 필수인 사유(`400 COMMUNITY_123`). */
export const COMMUNITY_REPORT_REASON_REQUIRING_DETAIL: CommunityReportReasonCode =
  'ETC'

/** 상세 자체의 한도(`400 COMMUNITY_124`). 사유 접두가 없어져 몫을 빼지 않는다. */
export const COMMUNITY_REPORT_DETAIL_MAX_LENGTH = 500

export const isCommunityReportReasonCode = (
  value: string,
): value is CommunityReportReasonCode =>
  COMMUNITY_REPORT_REASONS.some(reason => reason.code === value)

export type CommunityReportReasonPayload = Pick<
  CommunityReportCreateRequest,
  'reasonCode' | 'detail'
>

/** 보낼 사유 몫. 상세는 걷어 내고, 비면 키째 뺀다(계약: 「상세가 없으면 `detail` 을 뺀다」). */
export const createCommunityReportReasonPayload = (
  reasonCode: CommunityReportReasonCode,
  detail: string,
): CommunityReportReasonPayload => {
  const trimmedDetail = detail.trim()
  return trimmedDetail ? { reasonCode, detail: trimmedDetail } : { reasonCode }
}

/** 안내를 붙이고 포커스를 옮길 입력칸. FE 입력칸 이름이지 BE 필드명이 아니다. */
export type CommunityReportInputField = 'reason' | 'detail'

export type CommunityReportInputError = {
  field: CommunityReportInputField
  message: string
}

export const validateCommunityReportInput = ({
  reasonCode,
  detail,
}: {
  reasonCode: CommunityReportReasonCode | null
  detail: string
}): CommunityReportInputError | null => {
  if (!reasonCode) {
    return { field: 'reason', message: '신고 사유를 골라 주세요.' }
  }

  const trimmedDetail = detail.trim()

  if (
    reasonCode === COMMUNITY_REPORT_REASON_REQUIRING_DETAIL &&
    !trimmedDetail
  ) {
    return { field: 'detail', message: '기타 사유를 적어 주세요.' }
  }

  if (trimmedDetail.length > COMMUNITY_REPORT_DETAIL_MAX_LENGTH) {
    return {
      field: 'detail',
      message: '자세한 내용은 500자 이하로 입력해 주세요.',
    }
  }

  return null
}

/*
 * 서버 오류 코드 → 안내를 붙일 입력칸. `api-error.ts` 의 「코드로 UI 분기하지 않는다」 원칙의 **명시적 예외**다
 * (구현 명세 2026-10-07 §1 #8). 110·123 은 요청 모양 검증이라 `errors[].field` 가 입력칸이 아니라
 * `reasonPresent`·`etcDetailPresent` 로 오고, 계약이 「안내 위치는 code 로 정한다」고 적었다.
 * 그 밖(중복 신고 409·대상 없음 404 등)은 입력을 고쳐도 같으니 일반 오류 자리다.
 */
const REPORT_ERROR_FIELDS = new Map<string, CommunityReportInputField>([
  // 사유 코드·레거시 reason 이 둘 다 없음
  ['COMMUNITY_110', 'reason'],
  // 알 수 없는 사유 코드
  ['COMMUNITY_018', 'reason'],
  // 기타인데 상세 없음
  ['COMMUNITY_123', 'detail'],
  // 상세 500자 초과
  ['COMMUNITY_124', 'detail'],
])

export const getCommunityReportErrorField = (
  code: string | null | undefined,
): CommunityReportInputField | null =>
  (code && REPORT_ERROR_FIELDS.get(code)) || null

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * 신고 실패 → 보여 줄 문구와 자리. 실패는 두 경로로 온다.
 * ① 4xx/5xx axios rejection — 본문 `dataHeader.resultCode`·`resultMessage` 를 `normalizeApiError` 로 읽는다.
 *    axios 의 `Request failed with status code 400` 대신 서버 문구가 나온다.
 * ② 앱이 던진 오류 — 200 + `success: false` 를 바꾼 `CommunityDetailQueryError`(`resultCode` 를 싣는다)나
 *    mock 오류. 문구가 이미 서버·도메인 문구다.
 * 401 은 여기 오기 전에 상세 페이지가 로그인 복구로 가로챈다.
 */
export const readCommunityReportError = (
  error: unknown,
  fallback: string,
): { field: CommunityReportInputField | null; message: string } => {
  if (error instanceof Error && !(isRecord(error) && error.isAxiosError)) {
    const resultCode = (error as { resultCode?: unknown }).resultCode
    return {
      field: getCommunityReportErrorField(
        typeof resultCode === 'string' ? resultCode : null,
      ),
      message: error.message || fallback,
    }
  }

  const normalized = normalizeApiError(error)
  return {
    field: getCommunityReportErrorField(normalized.code),
    message: normalized.message,
  }
}
