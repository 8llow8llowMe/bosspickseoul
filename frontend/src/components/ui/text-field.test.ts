import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'
import { TextField } from './text-field'

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
  it('errorText 가 있으면 테두리가 red500 2px 로 두꺼워진다', () => {
    const styles = renderStyles(
      createElement(TextField, { errorText: '다시 확인해주세요.' }),
    )

    expect(styles).toContain('border:2px solid var(--color-danger);')
  })

  it('errorText 가 없으면 1px 을 유지한다', () => {
    const styles = renderStyles(createElement(TextField, {}))

    expect(styles).toContain('border:1px solid var(--color-border-200);')
    expect(styles).not.toContain('border:2px solid var(--color-danger);')
  })

  it('errorText 는 aria-invalid 와 함께 나간다 — 시각 표시와 보조기술 표시가 갈리지 않는다', () => {
    const markup = renderToStaticMarkup(
      createElement(TextField, { errorText: '다시 확인해주세요.' }),
    )

    expect(markup).toContain('aria-invalid="true"')
    expect(markup).toContain('다시 확인해주세요.')
  })
})
