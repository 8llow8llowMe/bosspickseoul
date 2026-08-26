/** 요청 검증 실패 시 필드별로 내려오는 오류 항목. */
export type ApiFieldError = {
  code: string | null
  field: string
  message: string
}

/**
 * 요청 검증(Bean Validation) 실패 응답의 `resultMessage` 형태.
 * 예: `{ message: 'topN은 5 이상 30 이하여야 합니다.', errors: [{ code, field, message }] }`
 */
export type ApiValidationMessage = {
  message?: string
  errors?: ApiFieldError[]
}

export type ApiMessage = string | ApiValidationMessage | null

export type ApiDataHeader = {
  success: boolean
  resultCode: string | null
  resultMessage: ApiMessage
}

export type ApiResponse<T> = {
  dataHeader: ApiDataHeader
  dataBody: T
}
