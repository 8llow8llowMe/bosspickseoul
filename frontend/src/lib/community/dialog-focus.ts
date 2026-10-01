/*
 * 커뮤니티 모달(신고 다이얼로그 · 공용 시트)의 포커스 가두기 규칙. 두 곳이 셀렉터를 따로 들고 있으면
 * 한쪽만 고쳤을 때 Tab 순환이 갈린다.
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
