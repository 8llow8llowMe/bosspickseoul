import { css } from 'styled-components'

/*
  셸 — 페이지의 최외곽 컨테이너에만 쓴다.

  var(--w-shell) 은 calc(100% - …) 이라 부모 폭을 기준으로 계산된다. 이미 좁혀진
  컨테이너 안에서 쓰면 두 번 좁혀지므로, 반드시 페이지 최상단에서만 건다.
*/
export const shellWidth = css`
  width: var(--w-shell);
  margin: 0 auto;
`

/*
  중앙 컬럼 — 읽기·폼처럼 넓어지면 나빠지는 화면에 쓴다.

  셸보다 좁으므로 헤더와 어긋난다. 그것은 결함이 아니라 읽기를 위해 지불한
  대가다. 개방할 수 있는 화면에 이것을 쓰면 근거 없는 어긋남이 된다.
*/
export const centeredColumn = (token: string) => css`
  width: min(${token}, var(--w-shell));
  margin: 0 auto;
`
