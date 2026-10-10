/**
 * 링크를 **사람에게 건네는** 마지막 한 걸음(share.md D3). 공유 시트가 있으면 시트를 띄우고,
 * 없으면 클립보드에 복사한다. 분석 결과·추천 비교·시뮬레이션 리포트가 같은 규칙을 쓴다.
 *
 * - `navigator.share` 를 먼저 쓴다. 모바일은 거의 다 있고, 데스크톱은 대부분 없어 복사로 떨어진다.
 * - 사용자가 공유 시트를 닫은 `AbortError` 는 실패가 아니다 — `'aborted'` 로 돌려주고 토스트를 띄우지 않는다.
 * - 그 밖의 실패는 던진다. 호출부가 화면 문구로 바꾼다.
 */

export type ShareNavigator = {
  share?: (data: { title?: string; url?: string }) => Promise<void>
  clipboard?: { writeText: (text: string) => Promise<void> }
}

export type ShareDeliveryResult = 'shared' | 'copied' | 'aborted'

const isAbortError = (error: unknown) =>
  error instanceof Error && error.name === 'AbortError'

const isNotAllowedError = (error: unknown) =>
  error instanceof Error && error.name === 'NotAllowedError'

export const deliverShareUrl = async (
  { url, title }: { url: string; title?: string },
  nav: ShareNavigator | undefined = typeof navigator === 'undefined'
    ? undefined
    : (navigator as ShareNavigator),
): Promise<ShareDeliveryResult> => {
  if (typeof nav?.share === 'function') {
    try {
      await nav.share({ title, url })
      return 'shared'
    } catch (error) {
      if (isAbortError(error)) return 'aborted'
      // 시트를 띄울 권한이 없다(사용자 활성화가 만료됐거나 정책이 막았다). 시트가 없는 브라우저와
      // 같게 보고 복사로 한 번 넘어간다 — 사용자는 링크를 원했지 시트를 원한 게 아니다.
      if (!isNotAllowedError(error)) throw error
    }
  }

  if (typeof nav?.clipboard?.writeText !== 'function') {
    throw new Error('이 브라우저에서는 링크를 복사할 수 없어요.')
  }
  await nav.clipboard.writeText(url)
  return 'copied'
}

/**
 * V2 공유 링크(`/s/{shareCode}`) 발급 뒤 성공 토스트. 분석 결과 화면의 문구와 같다
 * (`analysis-result-view.tsx` `handleShare`) — 같은 동작은 같은 말로 알린다.
 */
export const SHARE_LINK_READY_MESSAGE =
  '공유 링크를 준비했어요. 링크는 90일간 열 수 있어요.'

/**
 * 시뮬레이션 리포트 「링크 복사」 토스트. 리포트는 조건이 URL 의 정본이라 짧은 코드를 따로
 * 발급하지 않고 지금 주소를 그대로 건넨다 — 만료가 없으므로 90일 안내를 붙이지 않는다.
 */
export const REPORT_LINK_MESSAGES = {
  shared: '리포트 링크를 공유했어요.',
  copied:
    '리포트 링크를 복사했어요. 받은 사람도 같은 조건의 리포트를 볼 수 있어요.',
  failed: '리포트 링크를 복사하지 못했어요. 주소창의 주소를 복사해 주세요.',
} as const
