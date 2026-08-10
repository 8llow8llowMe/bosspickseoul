import { css } from 'styled-components'

// 히어로 글래스 계열 표면 공통 (DESIGN.md 예외 승인 범위 — Task 8에서 정본화)
// WindowCard(hero-window.tsx)와 DockButton(hero-section.tsx)이 동일한
// shadow/border 리터럴을 공유하도록 한 곳에 정의한다.
export const glassSurface = css`
  box-shadow: 0 24px 60px -16px rgba(2, 9, 19, 0.3);
  border: 1px solid color-mix(in srgb, #ffffff 65%, transparent);
`
