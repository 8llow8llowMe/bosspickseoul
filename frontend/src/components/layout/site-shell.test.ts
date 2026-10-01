import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'

import SiteShell from './site-shell'

/*
  셸 세로 묶음(community.md §S4 「다듬기」 푸터 위치). 내용이 짧아도 푸터가 화면 바닥에 붙는다 —
  실제 높이는 e2e(`e2e/community/invariants.spec.ts`)가 재고, 여기서는 그 높이를 만드는 구조와 규칙을 잠근다.
*/
const renderShell = () => {
  const sheet = new ServerStyleSheet()

  try {
    const markup = renderToStaticMarkup(
      sheet.collectStyles(
        createElement(
          SiteShell,
          {
            header: createElement('header', null, '헤더'),
            footer: createElement('footer', null, '푸터'),
          },
          createElement('main', { 'data-hide-footer': 'true' }, '본문'),
        ),
      ),
    )
    return { markup, styles: sheet.getStyleTags() }
  } finally {
    sheet.seal()
  }
}

/** 클래스 이름으로 그 규칙 본문을 찾는다(styled-components 는 선언을 압축해 내보낸다). */
const ruleOf = (styles: string, className: string) =>
  styles.match(new RegExp(`\\.${className}\\{([^}]*)\\}`))?.[1] ?? ''

/** 그 속성을 가진 div 의 마지막 클래스(= 규칙이 붙은 클래스). 속성 순서와 상관없다. */
const classOf = (markup: string, attribute: string) =>
  markup
    .match(new RegExp(`<div(?=[^>]*${attribute})[^>]*class="([^"]*)"`))?.[1]
    ?.split(' ')
    .at(-1) ?? ''

describe('SiteShell', () => {
  it('헤더 · 본문 칸 · 푸터 순서이고, 페이지(main)는 본문 칸 안에 있다', () => {
    const { markup } = renderShell()

    expect(markup).toMatch(
      /^<div[^>]*data-site-shell="true"[^>]*><header>헤더<\/header><div[^>]*data-site-shell-body="true"[^>]*><main data-hide-footer="true">본문<\/main><\/div><footer>푸터<\/footer><\/div>$/,
    )
  })

  it('셸은 최소 한 화면 높이의 세로 flex 다 — dvh 를 모르는 브라우저는 100vh', () => {
    const { markup, styles } = renderShell()
    const rule = ruleOf(styles, classOf(markup, 'data-site-shell="true"'))

    expect(rule).toContain('display:flex;')
    expect(rule).toContain('flex-direction:column;')
    // 폴백이 먼저, dvh 가 나중이라 아는 브라우저는 dvh 를 쓴다.
    expect(rule.indexOf('min-height:100vh;')).toBeGreaterThanOrEqual(0)
    expect(rule.indexOf('min-height:100dvh;')).toBeGreaterThan(
      rule.indexOf('min-height:100vh;'),
    )
  })

  it('본문 칸이 남는 높이를 갖고 줄지 않는다(flex: 1 0 auto)', () => {
    const { markup, styles } = renderShell()
    const rule = ruleOf(styles, classOf(markup, 'data-site-shell-body="true"'))

    expect(rule).toContain('flex:1 0 auto;')
  })
})

describe('(shell) 레이아웃', () => {
  const source = readFileSync(
    new URL('../../../app/(shell)/layout.tsx', import.meta.url),
    'utf8',
  )

  it('헤더 · 푸터를 SiteShell 에 끼운다 — 셸 밖에 나란히 두면 푸터가 바닥에 붙지 않는다', () => {
    expect(source).toContain('footer={<SiteFooter />}')
    expect(source).toContain('header={<SiteHeader />}')
    expect(source).not.toMatch(/<>\s*<SiteHeader/)
  })
})
