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
