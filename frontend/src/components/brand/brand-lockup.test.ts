import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'

import BrandLockup, { type BrandLockupProps } from './brand-lockup'

const squeeze = (css: string): string => css.replace(/\s+/g, '')

const renderLockup = (
  props: BrandLockupProps = {},
): { html: string; css: string } => {
  const styleSheet = new ServerStyleSheet()

  try {
    const html = renderToStaticMarkup(
      styleSheet.collectStyles(createElement(BrandLockup, props)),
    )
    return { html, css: squeeze(styleSheet.getStyleTags()) }
  } finally {
    styleSheet.seal()
  }
}

describe('BrandLockup 워드마크', () => {
  /**
   * 13자를 전부 700 으로 두면 헤더에서 한 덩어리로 뭉친다. 무게 분리는
   * 이름의 의미 구조(브랜드 + 지역)와도 일치한다 — 브라우저 실측으로 확정.
   */
  it('BossPick 700 과 Seoul 400 으로 무게를 분리한다', () => {
    const { html, css } = renderLockup()

    expect(html).toContain('BossPick')
    expect(html).toContain('Seoul')
    expect(css).toContain('font-weight:700;')
    expect(css).toContain('font-weight:400;')
  })

  it('이름 전체가 한 문자열로 읽힌다', () => {
    const { html } = renderLockup()

    expect(html.replace(/<[^>]*>/g, '')).toContain('BossPickSeoul')
  })

  it('워드마크를 조판 규약대로 그린다', () => {
    const { css } = renderLockup()

    expect(css).toContain('font-size:19px;')
    expect(css).toContain('line-height:28px;')
    expect(css).toContain('letter-spacing:-0.01em;')
    expect(css).toContain('white-space:nowrap;')
  })

  it('워드마크 크기를 바꾸면 줄 높이가 비례한다', () => {
    const { css } = renderLockup({ wordmarkSize: 38 })

    expect(css).toContain('font-size:38px;')
    expect(css).toContain('line-height:56px;')
  })
})

describe('BrandLockup 심볼', () => {
  it('기본은 컨테이너 32px 이고 그 안은 Solid 다', () => {
    const { html } = renderLockup()

    expect(html).toContain('width="32"')
    expect(html).toContain('viewBox="0 0 44.8 44.8"')
  })

  it('심볼은 장식으로 숨긴다 — 워드마크가 이름을 읽어준다', () => {
    const { html } = renderLockup()

    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toContain('<title>')
  })

  it('markHeight 를 키우면 컨테이너가 격자를 담는다', () => {
    const { html } = renderLockup({ markHeight: 64 })

    expect(html).toContain('width="64"')
    expect(html).toContain('viewBox="0 0 54.4 54.4"')
  })
})

describe('BrandLockup 배치', () => {
  it('가로형이 기본이고 간격은 컨테이너의 25% 다', () => {
    const { css } = renderLockup()

    expect(css).toContain('flex-direction:row;')
    expect(css).toContain('gap:8px;')
    expect(css).toContain('align-items:center;')
  })

  it('세로형은 심볼 위 워드마크 아래로 쌓는다', () => {
    const { css } = renderLockup({ orientation: 'vertical', markHeight: 48 })

    expect(css).toContain('flex-direction:column;')
    expect(css).toContain('gap:12px;')
  })
})

describe('BrandLockup 톤', () => {
  it('ink 톤은 워드마크를 본문 최강색으로 그린다', () => {
    const { css } = renderLockup()

    expect(css).toContain('color:var(--color-text-900);')
  })

  it('inverse 톤은 워드마크를 흰색으로, 컨테이너를 반전한다', () => {
    const { html, css } = renderLockup({ tone: 'inverse' })

    expect(css).toContain('color:#ffffff;')
    expect(html).toContain('data-role="container" fill="#ffffff"')
  })
})

/**
 * 헤더 계약. `site-header.tsx` 의 `Brand` 는 `min-height: 40px` 이고
 * 워드마크는 19px 이다. 컨테이너 32px 는 그 안에 여유 있게 들어가고,
 * 격자를 살리려면 46px 가 필요해 들어가지 않는다 — 그래서 Solid 다.
 */
describe('헤더 기본값 계약', () => {
  // 32px 컨테이너는 헤더 min-height 40px 안에 여유 있게 들어간다.
  // 실제 여유 공간은 Step 7 의 브라우저 실측이 검증한다.
  it('기본 컨테이너는 32px 다', () => {
    const { html } = renderLockup()

    expect(html).toContain('width="32"')
  })

  it('기본 컨테이너는 격자가 아니라 Solid 를 담는다', () => {
    const { html } = renderLockup()

    // 심볼 높이는 floor(32 × 0.625) = 20px. 그 크기의 격자 갭은 0.59px 로
    // 무너지므로 갭 없는 Solid 박스(16×28 → 컨테이너 44.8)여야 한다.
    expect(html).toContain('viewBox="0 0 44.8 44.8"')
    expect(html).not.toContain('viewBox="0 0 54.4 54.4"')
  })

  it('푸터 크기(24px 컨테이너 / 15px 워드마크)도 Solid 를 담는다', () => {
    const { html, css } = renderLockup({ markHeight: 24, wordmarkSize: 15 })

    expect(html).toContain('width="24"')
    expect(html).toContain('viewBox="0 0 44.8 44.8"')
    expect(css).toContain('font-size:15px;')
    expect(css).toContain('gap:6px;')
  })
})
