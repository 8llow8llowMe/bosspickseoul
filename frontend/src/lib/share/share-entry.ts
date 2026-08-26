/**
 * `/s/{shareCode}` 진입 화면의 실패 분기.
 *
 * 공유 링크는 **만료(410)** 와 **미존재(404)** 가 사용자에게 완전히 다른 사건이다.
 * 만료는 "있었는데 시간이 지났다"(다시 공유해 달라고 하면 된다), 미존재는 "주소가 틀렸다"이다.
 * 그래서 문구를 나눈다. 둘 다 재시도해도 결과가 같으므로 재시도 버튼을 붙이지 않는다.
 */

import { isRetryable, normalizeApiError } from '@/lib/api/api-error'

export type ShareEntryFailureKind =
  | 'expired'
  | 'not-found'
  | 'network'
  | 'server'
  | 'client'

export type ShareEntryFailure = {
  kind: ShareEntryFailureKind
  title: string
  description: string
  /** `isRetryable` 로만 결정한다. 만료/미존재는 항상 false. */
  retryable: boolean
}

const TITLES: Record<ShareEntryFailureKind, string> = {
  expired: '만료된 공유 링크예요',
  'not-found': '존재하지 않는 공유 링크예요',
  network: '링크를 여는 중 연결이 끊겼어요',
  server: '링크를 여는 중 문제가 발생했어요',
  client: '링크를 열 수 없어요',
}

const DESCRIPTIONS: Partial<Record<ShareEntryFailureKind, string>> = {
  expired: '공유 링크는 발급 후 90일간 유효해요. 링크를 다시 받아 주세요.',
  'not-found': '주소가 잘못됐거나 삭제된 링크예요. 주소를 다시 확인해 주세요.',
}

/**
 * 해석 실패를 화면 문구로 환산한다.
 *
 * 만료 판정은 **HTTP 410** 을 우선 본다. `resultCode`(`SHARE_LINK_002`)는 보조 근거로만 쓴다
 * — 에러 코드로 UI 를 분기하지 않는 저장소 규약을 지키되, 410 은 상태만으로 의미가 확정된다.
 */
export const classifyShareEntryError = (error: unknown): ShareEntryFailure => {
  const normalized = normalizeApiError(error)

  if (normalized.status === 410) {
    return {
      kind: 'expired',
      title: TITLES.expired,
      description: DESCRIPTIONS.expired ?? normalized.message,
      retryable: false,
    }
  }

  if (normalized.kind === 'not-found') {
    return {
      kind: 'not-found',
      title: TITLES['not-found'],
      // 404 는 서버 메시지를 그대로 노출하는 것이 규약이다.
      description: normalized.message || (DESCRIPTIONS['not-found'] as string),
      retryable: false,
    }
  }

  const kind: ShareEntryFailureKind =
    normalized.kind === 'network'
      ? 'network'
      : normalized.kind === 'server'
        ? 'server'
        : 'client'

  return {
    kind,
    title: TITLES[kind],
    description: normalized.message,
    retryable: isRetryable(normalized.kind),
  }
}
