import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'
import SignupConsentFieldset, {
  signupConsentInputId,
} from './signup-consent-fieldset'
import {
  EMPTY_SIGNUP_CONSENT,
  type SignupConsentKey,
} from '@/lib/auth/signup-consent'

const render = (invalid: SignupConsentKey[] = []) =>
  renderToStaticMarkup(
    createElement(SignupConsentFieldset, {
      value: EMPTY_SIGNUP_CONSENT,
      onChange: () => undefined,
      invalid,
      idPrefix: 'register-consent',
    }),
  )

/** `id` 로 input 태그 하나를 꺼낸다. 속성 순서에 기대지 않으려고 태그째 본다. */
const inputTag = (markup: string, key: SignupConsentKey) => {
  const id = signupConsentInputId('register-consent', key)
  const match = markup.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`))
  if (!match) throw new Error(`체크박스가 없다: ${id}`)
  return match[0]
}

describe('SignupConsentFieldset (TC-CON-003)', () => {
  it('fieldset·legend 안에 체크박스 4개(전체 동의 + 필수 3개)를 그린다', () => {
    const markup = render()

    expect(markup).toContain('<fieldset')
    expect(markup).toContain('약관 동의</legend>')
    expect(markup.match(/type="checkbox"/g)).toHaveLength(4)
    expect(markup).toContain('전체 동의')
    expect(markup).toContain('이용약관에 동의합니다')
    expect(markup).toContain('개인정보 처리방침에 동의합니다')
    expect(markup).toContain('만 14세 이상입니다')
    expect(markup.match(/\[필수\]/g)).toHaveLength(3)
  })

  it('약관·처리방침 「보기」는 새 탭으로 연다 — 입력 중인 가입 흐름을 잃지 않게', () => {
    const markup = render()
    const links = markup.match(/<a [^>]*>[^<]*<\/a>/g) ?? []

    const terms = links.find(link => link.includes('href="/terms"'))
    const privacy = links.find(link => link.includes('href="/privacy"'))
    for (const link of [terms, privacy]) {
      expect(link).toBeDefined()
      expect(link).toContain('target="_blank"')
      expect(link).toContain('rel="noopener noreferrer"')
    }
  })

  it('invalid 항목에만 aria-invalid 와 오류 문구 연결을 단다', () => {
    const markup = render(['ageOver14Confirmed'])
    const age = inputTag(markup, 'ageOver14Confirmed')
    const terms = inputTag(markup, 'termsAgreed')

    expect(age).toContain('aria-invalid="true"')
    const describedBy = age.match(/aria-describedby="([^"]+)"/)?.[1]
    expect(describedBy).toBeDefined()
    expect(markup).toMatch(
      new RegExp(
        `<span[^>]*id="${describedBy}"[^>]*>만 14세 이상만 가입할 수 있어요\\.`,
      ),
    )
    expect(terms).not.toContain('aria-invalid')
    expect(terms).not.toContain('aria-describedby')
  })

  it('오류가 없으면 오류 문구를 그리지 않는다', () => {
    const markup = render()

    expect(markup).not.toContain('aria-invalid')
    expect(markup).not.toContain('만 14세 이상만 가입할 수 있어요')
  })
})

describe('SignupConsentFieldset — 대비 (#495 리뷰)', () => {
  /** blue500 글자는 흰 바탕에서 2.77:1 이라 AA 미달이다(DESIGN.md §Color 「Blue Text」). */
  it('「[필수]」는 밝은 배경용 파란 글자 토큰을 쓴다', () => {
    const sheet = new ServerStyleSheet()
    let styles = ''
    try {
      renderToStaticMarkup(
        sheet.collectStyles(
          createElement(SignupConsentFieldset, {
            value: EMPTY_SIGNUP_CONSENT,
            onChange: () => undefined,
            idPrefix: 'p',
          }),
        ),
      )
      styles = sheet.getStyleTags()
    } finally {
      sheet.seal()
    }

    expect(styles).toContain('color:var(--color-text-primary-on-light)')
  })
})
