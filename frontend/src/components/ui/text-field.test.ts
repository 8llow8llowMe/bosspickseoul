import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'
import { TextField } from './text-field'

/** prettier 가 color-mix() 를 여러 줄로 감싸면 방출 CSS 의 공백이 달라진다. */
const squeeze = (css: string): string => css.replace(/\s+/g, '')

const renderStyles = (element: ReturnType<typeof createElement>): string => {
  const styleSheet = new ServerStyleSheet()

  try {
    renderToStaticMarkup(styleSheet.collectStyles(element))
    return styleSheet.getStyleTags()
  } finally {
    styleSheet.seal()
  }
}

describe('TextField 에러 규격 (DESIGN.md §Error (inline field))', () => {
  it('errorText 가 있으면 테두리가 red500 이 되고 면에 danger 틴트가 깔린다', () => {
    const styles = renderStyles(
      createElement(TextField, { errorText: '다시 확인해주세요.' }),
    )

    expect(styles).toContain('border:2px solid var(--color-danger);')
    expect(squeeze(styles)).toContain(
      'color-mix(insrgb,var(--color-danger)6%,var(--color-surface))',
    )
  })

  it('errorText 가 없으면 테두리가 투명하다 — 두께는 그대로다', () => {
    const styles = renderStyles(createElement(TextField, {}))

    expect(styles).toContain('transparent')
    expect(styles).not.toContain('var(--color-danger)')
    // 두께가 상태에 따라 변하면 칸이 흔들린다.
    expect(styles).not.toContain('border:1px solid')
  })

  /**
   * emphasized 는 면 대비가 부족한 자리에서 칸 경계를 살리는 변형이다.
   * 자리를 잡는 2px 투명 테두리에 색을 칠하면 개편 전(1px)보다 두 배 무거워지므로
   * **1px inset 링**으로 두께를 되돌린다. 이게 사라지면 조용히 두꺼워진다.
   */
  it('emphasized 는 2px 테두리가 아니라 1px inset 링으로 경계를 만든다', () => {
    const styles = renderStyles(createElement(TextField, { emphasized: true }))

    expect(styles).toContain('inset 0 0 0 1px var(--color-border-300)')
    expect(styles).not.toContain('border:2px solid var(--color-border-300)')
  })

  it('평상시 필드는 inset 링도 없다', () => {
    const styles = renderStyles(createElement(TextField, {}))

    expect(styles).not.toContain('inset 0 0 0 1px')
  })

  it('errorText 는 aria-invalid 와 함께 나간다 — 시각 표시와 보조기술 표시가 갈리지 않는다', () => {
    const markup = renderToStaticMarkup(
      createElement(TextField, { errorText: '다시 확인해주세요.' }),
    )

    expect(markup).toContain('aria-invalid="true"')
    expect(markup).toContain('다시 확인해주세요.')
  })
})

/**
 * 지우기 버튼은 **컨트롤**이다. `rightSlot` 은 아이콘 자리라 `aria-hidden` 이어서
 * 거기에 버튼을 넣으면 포커스는 받는데 스크린리더에는 없는 컨트롤이 된다 —
 * 그래서 `onClear` 를 별도 prop 으로 뒀다(#262).
 */
describe('TextField 지우기 버튼', () => {
  it('onClear 와 값이 함께 있을 때만 뜬다', () => {
    const withValue = renderToStaticMarkup(
      createElement(TextField, { value: '강', onClear: () => {} }),
    )

    expect(withValue).toContain('aria-label="검색어 지우기"')
  })

  it('빈 칸에는 두지 않는다 — 누를 것이 없는 버튼이 포커스 순서에 남는다', () => {
    const empty = renderToStaticMarkup(
      createElement(TextField, { value: '', onClear: () => {} }),
    )

    expect(empty).not.toContain('검색어 지우기')
  })

  it('onClear 가 없으면 뜨지 않는다 — 기존 사용처가 바뀌지 않는다', () => {
    const markup = renderToStaticMarkup(
      createElement(TextField, { value: '강' }),
    )

    expect(markup).not.toContain('검색어 지우기')
  })

  /**
   * 라벨 있는 ✕ 를 두면서 네이티브 ✕ 를 남기면 같은 아이콘이 두 개 나란히 보인다.
   * 반대로 onClear 를 쓰지 않는 칸에서는 네이티브 버튼이 유일한 지우기 수단이므로
   * 숨기면 기능이 사라진다 — 그래서 prop 에 따라 갈린다.
   */
  it('네이티브 지우기 버튼은 onClear 를 쓸 때만 숨긴다', () => {
    const withClear = renderStyles(
      createElement(TextField, { value: '강', onClear: () => {} }),
    )
    const withoutClear = renderStyles(createElement(TextField, { value: '강' }))

    expect(squeeze(withClear)).toContain(
      '::-webkit-search-cancel-button{display:none;}',
    )
    expect(squeeze(withoutClear)).not.toContain('-webkit-search-cancel-button')
  })
})

/**
 * 포커스 신호는 **칸 테두리 하나**다(DESIGN.md §Inputs & Forms). 전역
 * `:focus-visible` 아웃라인이 그 위에 겹치면 파란 선이 두 줄로 보인다. 클래스
 * 선택자 하나로는 전역 규칙과 특이도가 같아 순서에 밀리므로, `:focus-visible` 을
 * 함께 붙여 확실히 이긴다 — 이 선택자가 사라지면 조용히 두 줄로 돌아간다.
 */
describe('TextField 포커스 신호', () => {
  it('전역 아웃라인을 :focus-visible 특이도로 눌러 하나만 남긴다', () => {
    const styles = squeeze(renderStyles(createElement(TextField, {})))

    /* styled-components 는 `&` 를 클래스로 풀어 방출한다 — 세 선택자가 한 규칙이다. */
    expect(styles).toMatch(
      /\.[A-Za-z]+,\.[A-Za-z]+:focus,\.[A-Za-z]+:focus-visible\{outline:none;\}/,
    )
  })

  it('포커스에서 칸 테두리가 primary-700 로 바뀐다 — 신호가 사라지는 게 아니다', () => {
    const styles = squeeze(renderStyles(createElement(TextField, {})))

    expect(styles).toContain('border-color:var(--color-primary-700)')
  })
})
