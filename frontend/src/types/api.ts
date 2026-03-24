export type ApiMessage = string | Record<string, string> | null

export type ApiDataHeader = {
  successCode: number
  resultCode: string | null
  resultMessage: ApiMessage
}

export type ApiResponse<T> = {
  dataHeader: ApiDataHeader
  dataBody: T
}
