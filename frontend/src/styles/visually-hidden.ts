import { css } from 'styled-components'

/**
 * 화면에서는 감추고 보조기술에는 남긴다(sr-only). 접근 이름·설명 연결(`<label>`·`aria-describedby`)은
 * 그대로 살아 있다. `display: none`·`visibility: hidden` 은 접근성 트리에서도 빠지므로 쓰지 않는다.
 *
 * `position: absolute` 라 그리드·플렉스 항목에서 빠져 간격(gap)도 먹지 않는다.
 */
export const visuallyHidden = css`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  border: 0;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
`
