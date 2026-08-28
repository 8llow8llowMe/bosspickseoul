import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'
import { FieldError, TextInput } from './auth-shell'

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
  it('입력의 에러 표시는 red500 2px 테두리다', () => {
    const styles = renderStyles(createElement(TextInput))

    expect(styles).toContain(
      "[aria-invalid='true']{border:2px solid var(--color-danger);}",
    )
  })

  it('에러 상태에서도 포커스 링이 danger 로 유지된다 — 파랑으로 돌아가지 않는다', () => {
    const styles = renderStyles(createElement(TextInput))

    expect(styles).toContain(
      "[aria-invalid='true']:focus{border-color:var(--color-danger);box-shadow:var(--shadow-focus-danger);}",
    )
  })

  it('평상시 테두리는 1px 이라 에러일 때만 두꺼워진다', () => {
    const styles = renderStyles(createElement(TextInput))

    expect(styles).toContain('border:1px solid var(--color-border-200);')
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
