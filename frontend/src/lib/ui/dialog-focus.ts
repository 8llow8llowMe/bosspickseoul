/*
 * 모달(커뮤니티 신고 다이얼로그 · 공용 시트 · 확인 시트)의 포커스 가두기 규칙. 여러 곳이 셀렉터를 따로
 * 들고 있으면 한쪽만 고쳤을 때 Tab 순환이 갈린다. 확인 시트(`components/ui/confirm-sheet`)가 채팅에서도
 * 쓰여 공용 자리(lib/ui)로 옮겼다(#581). 커뮤니티 경로는 `lib/community/dialog-focus` 가 다시 내보낸다.
 */
const DIALOG_FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export const getDialogFocusableElements = (root: HTMLElement) =>
  Array.from(
    root.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR),
  ).filter(element => !element.hasAttribute('aria-hidden'))

export const getDialogFocusTargetIndex = (
  focusableCount: number,
  currentIndex: number,
  direction: 'forward' | 'backward',
): number | null => {
  if (focusableCount <= 0) {
    return null
  }

  if (currentIndex < 0 || currentIndex >= focusableCount) {
    return direction === 'forward' ? 0 : focusableCount - 1
  }

  const offset = direction === 'forward' ? 1 : -1
  return (currentIndex + offset + focusableCount) % focusableCount
}
