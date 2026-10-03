// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import CommunitySheet from '@/components/community/community-sheet'

/*
  지역 시트는 단계마다 목록 길이가 달라, 높이가 내용을 따르면 목록이 도착하는 순간 가운데·바닥 정렬 때문에
  위쪽 행이 밀린다 — 그때 누른 손가락이 다른 지역을 고른다(#518, #467 dev 회귀에서 실제로 겪음).
  `fixedHeight` 시트는 최대 높이로 고정되고, 다른 시트는 지금처럼 내용을 따른다.
*/

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

/** 시트 패널(dialog)에 걸린 styled-components 규칙 문자열. */
const panelRules = () => {
  const panel = document.querySelector('[role="dialog"]')
  expect(panel).not.toBeNull()
  const classes = [...(panel?.classList ?? [])]
  const css = [...document.querySelectorAll('style')]
    .map(style => style.textContent ?? '')
    .join('\n')
  return classes
    .flatMap(name =>
      [...css.matchAll(new RegExp(`\\.${name}\\{[^}]*\\}`, 'g'))].map(
        m => m[0],
      ),
    )
    .join('\n')
    .replace(/\s+/g, '')
}

const renderSheet = (fixedHeight?: boolean) =>
  render(
    createElement(
      CommunitySheet,
      { open: true, onClose: () => undefined, title: '지역 선택', fixedHeight },
      createElement('p', null, '불러오는 중이에요'),
    ),
  )

describe('CommunitySheet — 높이', () => {
  it('fixedHeight 면 내용과 무관하게 최대 높이로 고정한다', () => {
    renderSheet(true)

    expect(panelRules()).toContain('height:min(640px,calc(100dvh-48px))')
  })

  it('기본은 내용 높이를 따른다 — 최대 높이만 있다', () => {
    renderSheet()
    const rules = panelRules()

    expect(rules).toContain('max-height:min(640px,calc(100dvh-48px))')
    expect(rules).not.toMatch(/[;{]height:min\(640px/)
  })
})
