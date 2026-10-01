import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { communityOutlinedField, communityUnderlineField } from './field-styles'

/*
  커뮤니티 글자 입력칸의 포커스·크기 규칙(community.md §S4 「다듬기」 입력칸, DESIGN.md §4 「Focus is one line」).
  조각 자체와, 입력칸이 있는 화면 파일이 모두 그 조각을 쓰는지를 소스로 잠근다.
*/
const flatten = (fragment: ReadonlyArray<unknown>) =>
  fragment
    .map(part => (typeof part === 'string' ? part : ''))
    .join('')
    .replace(/\s+/g, ' ')

describe('communityOutlinedField', () => {
  const css = flatten(communityOutlinedField)

  it('포커스는 칸 안쪽 한 줄이다 — 테두리 primary-700 + 같은 색 inset 1px, 바깥 글로우 없음', () => {
    expect(css).toMatch(
      /&:focus-visible \{ border-color: var\(--color-primary-700\); box-shadow: inset 0 0 0 1px var\(--color-primary-700\); \}/,
    )
    expect(css).not.toContain('--shadow-focus-primary')
    // primary-600 은 hover 색이다(DESIGN.md §2) — 포커스에 쓰지 않는다.
    expect(css).not.toContain('--color-primary-600')
  })

  it('전역 링은 포커스 선택자 안에서 끈다', () => {
    expect(css).toMatch(/&, &:focus, &:focus-visible \{ outline: none; \}/)
  })

  it('오류(aria-invalid)는 같은 방식의 danger 이고 포커스 규칙 뒤라 이긴다', () => {
    expect(css).toMatch(
      /&\[aria-invalid='true'\] \{ border-color: var\(--color-danger\); box-shadow: inset 0 0 0 1px var\(--color-danger\); \}/,
    )
    expect(css.indexOf("[aria-invalid='true']")).toBeGreaterThan(
      css.indexOf('&:focus-visible {'),
    )
  })

  it('손잡이로 크기를 바꾸지 않는다', () => {
    expect(css).toContain('resize: none;')
  })
})

describe('communityUnderlineField', () => {
  const css = flatten(communityUnderlineField)

  it('밑줄형은 아래 한 줄만 2px 로 — 바깥 그림자가 아니라 안쪽 1px 를 덧댄다', () => {
    expect(css).toContain('border-bottom-color: var(--color-primary-700);')
    expect(css).toContain(
      'box-shadow: inset 0 -1px 0 var(--color-primary-700);',
    )
    expect(css).toContain('box-shadow: inset 0 -1px 0 var(--color-danger);')
    expect(css).not.toMatch(/box-shadow: 0 1px 0/)
    expect(css).toMatch(/&, &:focus, &:focus-visible \{ outline: none; \}/)
  })
})

describe('커뮤니티 입력칸은 모두 공통 조각을 쓴다', () => {
  const files = [
    'community-list-view.tsx',
    'community-region-sheet.tsx',
    'community-editor-form.tsx',
    'community-comment-thread.tsx',
    'community-report-dialog.tsx',
  ]
  const blankComments = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
  /** `const 이름 = styled.input…` / `styled.textarea…` 템플릿. 파일 입력(숨김)은 글자 칸이 아니다. */
  const fieldTemplate =
    /const (\w+) = styled\.(?:input|textarea)(?:<[^>`]*>)?`([^`]*)`/g

  for (const file of files) {
    const source = blankComments(
      readFileSync(
        new URL(`../../components/community/${file}`, import.meta.url),
        'utf8',
      ),
    )
    const fields = [...source.matchAll(fieldTemplate)].filter(
      match => match[1] !== 'HiddenFileInput',
    )

    it(`${file} — 글자 칸마다 조각을 끼우고 자기 포커스 규칙·글로우·resize 를 두지 않는다`, () => {
      expect(fields.length).toBeGreaterThan(0)

      for (const [, name, body] of fields) {
        expect(
          body,
          `${name} 은 communityOutlinedField / communityUnderlineField 를 써야 한다`,
        ).toMatch(/\$\{community(?:Outlined|Underline)Field\}/)
        expect(body, `${name} 에 자기 포커스 블록이 남았다`).not.toMatch(
          /&:focus/,
        )
        expect(body, `${name} 이 resize 를 따로 정한다`).not.toMatch(
          /resize\s*:/,
        )
      }

      expect(source).not.toContain('--shadow-focus-primary-strong')
      expect(source).not.toMatch(/resize:\s*(?:vertical|both|horizontal)/)
    })
  }
})
