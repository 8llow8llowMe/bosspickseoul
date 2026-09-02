import {
  isRetryable,
  normalizeApiError,
  readAppThrownMessage,
} from '@/lib/api/api-error'

/**
 * 공유 링크 발급 실패를 화면에 띄울 한 줄로 환산한다.
 *
 * **보관함 분류기(`classifyAnalysisBookmarkSaveError`)를 여기에 쓰면 안 된다.**
 * 그쪽은 409 를 무조건 "이미 보관함에 저장된 화면"으로 읽는다 — 보관함에서는 409 가
 * 정말 중복 저장이지만, 공유 링크에서 409 는 동시 생성 경합(`SHARE_LINK_007`)이라
 * 뜻이 다르다. 한동안 공유 실패 토스트에 보관함 문구가 새어 나오고 있었다.
 *
 * 동시 생성 자체는 `createShareLink` 가 재시도로 흡수한다. 그걸 뚫고 여기까지 온
 * 409 는 설명할 수 없는 상태이므로 서버 문구를 그대로 전달하고 재시도는 사용자에게 맡긴다.
 */
export type ShareLinkFailure = {
  /** 사용자에게 보여줄 문구. 서버 메시지가 있으면 그것을 쓴다. */
  message: string
  /** 재시도 버튼을 붙여도 되는가 (통신 실패·5xx 만 참). */
  retryable: boolean
}

export const classifyShareLinkError = (error: unknown): ShareLinkFailure => {
  // 화면이 직접 던진 Error(200 인데 success:false 등)의 문구는 서버가 준 것이다.
  const appThrown = readAppThrownMessage(error)
  if (appThrown) return { message: appThrown, retryable: false }

  const normalized = normalizeApiError(error)
  return {
    message: normalized.message,
    retryable: isRetryable(normalized.kind),
  }
}
