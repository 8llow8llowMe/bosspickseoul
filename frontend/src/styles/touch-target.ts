import { css } from 'styled-components'

/**
 * 모바일 터치 대상 최소 크기(px). DESIGN.md §Touch Targets · analysis.md S2-7.
 *
 * 1023px 는 전역 폼 글꼴(global-styles.ts)·지도 셸과 같은 분기다.
 */
export const TOUCH_TARGET_MIN = 44

/**
 * **보이는 크기는 그대로 두고 히트 영역만** 44px 로 넓힌다.
 *
 * `::before` 를 요소 중앙에 44px 이상으로 깔아 둔다. 요소가 이미 44px 를 넘으면
 * `max(100%, 44px)` 가 100% 라 아무 일도 하지 않는다. 가상 요소의 클릭은 요소 자신의 클릭으로
 * 전달되므로 핸들러·포커스는 그대로다.
 *
 * - 이웃 대상과 겹치면 DOM 순서상 뒤쪽이 이긴다. 간격이 좁은 곳(<8px)에는 쓰지 말고
 *   요소 자체의 min-height 를 올린다.
 * - `<select>`·`<input>` 은 가상 요소를 그리지 않는다. 그쪽은 min-height 로 키운다.
 * - 이미 `position: absolute` 인 요소는 `keepPosition` 을 켠다 — 안 그러면 relative 로 덮인다.
 */
export const touchHitArea = (options?: { keepPosition?: boolean }) => css`
  @media (max-width: 1023px) {
    ${options?.keepPosition ? '' : 'position: relative;'}

    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: max(100%, ${TOUCH_TARGET_MIN}px);
      height: max(100%, ${TOUCH_TARGET_MIN}px);
      transform: translate(-50%, -50%);
    }
  }
`
