import { normalizeApiError } from '@/lib/api/api-error'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'

/*
  프로필 보관함의 지연 삭제(#574) — 북마크 해제·화면 보관 삭제·시뮬레이션 기록 삭제·기기 해제가 모두 이 규칙을 쓴다.

  누르면 화면에서만 숨기고, 되돌리기 시간이 지나면 그때 DELETE 를 보낸다(`use-undoable-removal`). 여기서는
  그 DELETE 한 번의 결과를 「지워졌다 / 지우지 못했다」 둘로 접는다.
*/

/** 실패 사유. `message` 는 사용자에게 그대로 보여 줄 서버 문구다. */
export class RemovalFailedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RemovalFailedError'
  }
}

/**
 * 삭제 요청을 보내고 결과를 접는다. 지워졌으면 그냥 끝나고, 못 지웠으면 `RemovalFailedError` 를 던진다.
 *
 * **404 는 성공으로 본다.** 다른 기기에서 먼저 지웠거나 이미 해제된 항목이다 — 사용자가 바란 상태(목록에 없음)와
 * 같으므로, 숨겼던 카드를 되살리며 「지우지 못했다」고 하면 오히려 틀린 말이 된다.
 */
export const requestRemoval = async (
  request: () => Promise<ApiResponse<unknown>>,
  fallbackMessage: string,
): Promise<void> => {
  let response: ApiResponse<unknown>

  try {
    response = await request()
  } catch (error) {
    const normalized = normalizeApiError(error)
    if (normalized.kind === 'not-found') return
    throw new RemovalFailedError(normalized.message || fallbackMessage)
  }

  if (!isApiSuccess(response)) {
    throw new RemovalFailedError(getApiMessage(response, fallbackMessage))
  }
}

/**
 * 지연 삭제가 실패해 숨겼던 항목을 되살릴 때의 문구. 무엇이 다시 나타났는지를 먼저 말하고, 서버 사유가 있으면
 * 뒤에 붙인다 — 이유 없이 카드가 돌아오면 되돌리기를 잘못 누른 줄 안다.
 */
export const describeRemovalFailure = (
  restoredMessage: string,
  error: unknown,
): string => {
  const reason = error instanceof Error ? error.message.trim() : ''
  return reason ? `${restoredMessage} ${reason}` : restoredMessage
}

/** 숨긴 항목을 뺀 목록. 숨긴 것이 없으면 같은 배열을 돌려준다(렌더마다 새 배열을 만들지 않는다). */
export const excludeHiddenItems = <Item>(
  items: readonly Item[],
  hiddenKeys: ReadonlySet<string>,
  getKey: (item: Item) => string,
): readonly Item[] =>
  hiddenKeys.size === 0
    ? items
    : items.filter(item => !hiddenKeys.has(getKey(item)))
