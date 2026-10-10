/**
 * 토스트 목록의 **순수 상태 전이**. React 를 모른다.
 *
 * 컴포넌트에서 분리한 이유: 여기서 정하는 규칙(같은 키는 겹쳐 쌓지 않는다, 개수 상한,
 * 톤별 노출 시간)이 화면 없이도 검증돼야 하는 판정이기 때문이다. 렌더 테스트로 확인하려면
 * 타이머를 돌려야 하는데, 그렇게 만든 테스트는 느리고 잘 깨진다.
 */

export type ToastTone = 'success' | 'error' | 'info'

export type ToastAction = {
  label: string
  onAction: () => void
}

export type Toast = {
  id: string
  tone: ToastTone
  message: string
  /** 같은 동작을 반복해도 토스트가 쌓이지 않게 하는 키. 같은 키면 **교체**한다. */
  dedupeKey?: string
  action?: ToastAction
  /**
   * 스크린리더가 이미 읽은 문장. 있으면 live region 은 이 문장을 그대로 둔다 — `updateToastByKey` 로 문구만 고친 토스트가
   * 새 알림처럼 다시 읽히지 않게 한다(#631). 보통은 비어 있고, 그때는 문구로 문장을 만든다(`announcementOf`).
   */
  announced?: string
}

/** 화면에 동시에 띄우는 최대 개수. 넘치면 **가장 오래된 것부터** 밀어낸다. */
export const TOAST_LIMIT = 3

/**
 * 톤별 자동 해제 시간(ms).
 *
 * 오류를 더 오래 두는 이유는 읽을 내용이 많아서다 — 서버 문구가 그대로 실린다.
 * 액션이 달린 토스트는 이 값을 쓰지 않는다(`toastDurationMs` 참고).
 */
export const TOAST_DURATION_MS: Record<ToastTone, number> = {
  success: 4000,
  info: 4000,
  error: 6000,
}

/** 액션이 달렸으면 누를 시간을 준다. 4초는 문구를 읽고 손을 옮기기에 짧다. */
export const TOAST_ACTION_DURATION_MS = 10000

export const toastDurationMs = (toast: Toast): number =>
  toast.action ? TOAST_ACTION_DURATION_MS : TOAST_DURATION_MS[toast.tone]

/**
 * 토스트를 목록에 넣는다.
 *
 * `dedupeKey` 가 같은 것이 이미 있으면 **그 자리에서 교체**한다. 보관 버튼을 연달아 누를 때
 * "저장했어요 / 해제했어요"가 세 개씩 쌓이면 마지막 상태가 무엇인지 알 수 없게 된다.
 * 자리를 옮기지 않는 이유는, 교체 때마다 아래로 튀면 읽던 문구를 놓치기 때문이다.
 */
export const appendToast = (
  toasts: readonly Toast[],
  toast: Toast,
  limit = TOAST_LIMIT,
): Toast[] => {
  const existingIndex = toast.dedupeKey
    ? toasts.findIndex(item => item.dedupeKey === toast.dedupeKey)
    : -1

  if (existingIndex >= 0) {
    const next = [...toasts]
    next[existingIndex] = toast
    return next
  }

  return [...toasts, toast].slice(-limit)
}

export const dismissToast = (toasts: readonly Toast[], id: string): Toast[] =>
  toasts.filter(toast => toast.id !== id)

/**
 * 같은 `dedupeKey` 의 토스트를 닫는다. 토스트의 동작(되돌리기 등)이 더는 뜻이 없어졌을 때 쓴다 —
 * 누르면 아무 일도 없는데 성공처럼 닫히는 버튼을 남기지 않는다(#581, 댓글 삭제 되돌리기).
 */
export const dismissToastByKey = (
  toasts: readonly Toast[],
  dedupeKey: string,
): Toast[] => toasts.filter(toast => toast.dedupeKey !== dedupeKey)

/**
 * 스크린리더가 읽는 문장. 동작 버튼이 달렸으면 그 버튼이 있다는 것을 끝에 붙인다 — 문구만 읽으면 되돌릴 수 있다는
 * 것을 모른 채 지나간다. 버튼 이름은 카드의 버튼과 같다. 이미 읽은 문장(`announced`)이 있으면 그것을 돌려준다.
 */
export const announcementOf = (toast: Toast): string =>
  toast.announced ??
  (toast.action
    ? `${toast.message} 알림에 「${toast.action.label}」 버튼이 있어요.`
    : toast.message)

/**
 * 같은 `dedupeKey` 의 토스트 **내용만** 바꾼다. id 는 그대로라 수명 타이머가 처음부터 다시 재지 않는다.
 *
 * `appendToast` 의 교체는 새 id 로 수명을 새로 주는데, 묶음 되돌리기 토스트(#631)는 항목 하나가 기한을 넘겨 빠질
 * 때마다 문구를 고친다 — 그때마다 수명이 늘면 마지막 항목의 기한이 지난 뒤에도 토스트가 남는다. 이미 닫힌 토스트는
 * 되살리지 않는다(사용자가 닫은 것을 다시 띄우지 않는다). 해당 토스트가 없으면 같은 배열을 돌려준다.
 *
 * live region 에는 **처음 읽은 문장을 그대로 둔다**(`announced`). 같은 문단의 텍스트가 바뀌면 스크린리더는 새 알림처럼
 * 다시 읽는데, 기한이 지나 항목이 빠진 것은 사용자가 한 일이 아니다. 바뀐 문구는 보이는 카드에서 읽는다.
 */
export const updateToastByKey = (
  toasts: readonly Toast[],
  dedupeKey: string,
  content: Pick<Toast, 'message' | 'action'>,
): readonly Toast[] => {
  const index = toasts.findIndex(toast => toast.dedupeKey === dedupeKey)
  if (index < 0) return toasts

  const next = [...toasts]
  next[index] = {
    ...toasts[index],
    message: content.message,
    action: content.action,
    announced: announcementOf(toasts[index]),
  }
  return next
}
