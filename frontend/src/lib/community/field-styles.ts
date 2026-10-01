import { css } from 'styled-components'

/*
  커뮤니티 글자 입력칸의 포커스·오류·크기 규칙 한 곳(community.md §S4 「다듬기」 입력칸, DESIGN.md §4
  Inputs & Forms 「Focus is one line」). 목록 검색 · 지역 시트 검색 · 글쓰기 제목·본문 · 댓글·답글 ·
  신고 사유가 이 조각을 쓴다.

  - 포커스 신호는 **칸 안쪽의 한 줄**이다. 테두리를 primary-700 으로 바꾸고 같은 색 inset 1px 를 덧대
    2px 로 보이게 한다 — 바깥 글로우(--shadow-focus-primary-strong)는 쓰지 않는다. 칸 밖으로 번지지 않아
    좁은 툴바·시트·대화상자에서 이웃 요소와 겹치지 않는다.
  - 전역 :focus-visible 링은 포커스 선택자 안에서 끈다. 기본값의 `outline: none` 만으로는 전역 규칙과
    특이도가 같아 소스 순서에 밀린다(global-styles.test.ts 가 막는 패턴).
  - 오류(aria-invalid)는 같은 방식으로 --color-danger. 포커스 뒤에 두어 포커스 중에도 오류색이 이긴다.
  - 크기는 칸이 정한다 — 손잡이로 늘이지 않는다(resize: none). 접힌 댓글칸이 펼쳐질 때 높이는 rows 가 맡는다.
*/
export const communityOutlinedField = css`
  resize: none;

  &,
  &:focus,
  &:focus-visible {
    outline: none;
  }

  &:focus-visible {
    border-color: var(--color-primary-700);
    box-shadow: inset 0 0 0 1px var(--color-primary-700);
  }

  &[aria-invalid='true'] {
    border-color: var(--color-danger);
    box-shadow: inset 0 0 0 1px var(--color-danger);
  }
`

/*
  밑줄형(글쓰기 제목) — 같은 원칙을 아래 한 줄에만 건다. 밑줄 1px 위에 같은 색 inset 1px 를 얹어
  2px 로 보이게 한다. 바깥 그림자가 아니라 자리 이동도, 칸 밖 번짐도 없다.
*/
export const communityUnderlineField = css`
  &,
  &:focus,
  &:focus-visible {
    outline: none;
  }

  &:focus-visible {
    border-bottom-color: var(--color-primary-700);
    box-shadow: inset 0 -1px 0 var(--color-primary-700);
  }

  &[aria-invalid='true'] {
    border-bottom-color: var(--color-danger);
    box-shadow: inset 0 -1px 0 var(--color-danger);
  }
`
