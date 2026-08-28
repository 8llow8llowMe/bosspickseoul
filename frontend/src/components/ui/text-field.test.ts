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
