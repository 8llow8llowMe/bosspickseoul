import type { WindowState } from '@/components/home/hero-window'

export type WindowDisplay = {
  displayState: WindowState
  showDock: boolean
}

/**
 * 모바일에서는 신호등(닫기/접기)이 숨겨져 있어 사용자가 닫기·최소화에 도달할
 * 방법이 없다. 데스크톱에서 만들어둔 windowState는 그대로 보존하되, 모바일
 * 뷰포트에서는 카드를 항상 열린 상태로 그려 데스크톱으로 되돌아가면 이전
 * 상태가 복원되게 한다. hero-section.tsx의 렌더링 분기(displayState/showDock)를
 * 순수 함수로 뽑아 단위 테스트로 회귀를 잡는다.
 */
export function deriveWindowDisplay(
  windowState: WindowState,
  isMobileViewport: boolean,
): WindowDisplay {
  return {
    displayState: isMobileViewport ? 'open' : windowState,
    showDock: !isMobileViewport && windowState === 'closed',
  }
}
