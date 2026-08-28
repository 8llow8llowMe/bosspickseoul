import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'
import { FieldError, TextInput } from './auth-shell'

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

describe('auth 인라인 필드 에러 규격 (DESIGN.md §Error (inline field))', () => {
  it('에러는 red500 테두리 + 옅은 danger 틴트다', () => {
    const styles = renderStyles(createElement(TextInput))

    expect(styles).toContain("[aria-invalid='true']{")
    expect(styles).toContain('border-color:var(--color-danger)')
    expect(squeeze(styles)).toContain(
      'color-mix(insrgb,var(--color-danger)6%,var(--color-surface))',
    )
  })

  /**
   * 상태는 **테두리 색 하나로만** 말한다. 에러 위에 포커스 후광을 덧대면 이중선이
   * 되고, 후광 없는 정상 포커스와 규격도 갈린다. 파랑으로 돌아가지도 않는다.
   */
  it('에러 + 포커스는 danger 테두리만 남기고 후광을 덧대지 않는다', () => {
    const styles = renderStyles(createElement(TextInput))

    expect(styles).toContain(
      "[aria-invalid='true']:focus{border-color:var(--color-danger);}",
    )
    expect(styles).not.toContain('var(--shadow-focus-danger)')
    expect(styles).not.toContain('var(--shadow-focus-primary)')
  })

  /**
   * 채움형이라 평상시 테두리를 그리지 않는다. 다만 **두께는 2px 로 고정**해 자리를
   * 잡아 둔다 — 포커스·에러에서 두께가 변하면 칸이 1px 씩 흔들린다.
   */
  it('평상시 테두리는 투명이고 두께는 에러와 같다', () => {
    const styles = renderStyles(createElement(TextInput))

    expect(styles).toContain('border:2px solid transparent;')
    expect(styles).not.toContain('border:1px solid')
  })

  it('폼 필드는 control 이 아니라 field 라디우스를 쓴다', () => {
    const styles = renderStyles(createElement(TextInput))

    expect(styles).toContain('border-radius:var(--radius-field)')
    expect(styles).not.toContain('border-radius:var(--radius-control)')
  })

  it('에러 문구는 red500 13px 이다', () => {
    const styles = renderStyles(
      createElement(FieldError, null, '계좌번호를 다시 확인해주세요.'),
    )

    expect(styles).toContain(
      'color:var(--color-danger);font-size:13px;line-height:20px;',
    )
  })

  it('aria-invalid 가 없으면 에러 테두리가 붙지 않는다', () => {
    const markup = renderToStaticMarkup(createElement(TextInput))

    expect(markup).not.toContain('aria-invalid')
  })
})
