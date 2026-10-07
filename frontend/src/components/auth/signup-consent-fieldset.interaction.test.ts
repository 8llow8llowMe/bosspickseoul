// @vitest-environment jsdom
import { createElement, useState } from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import SignupConsentFieldset, {
  signupConsentInputId,
} from './signup-consent-fieldset'
import {
  EMPTY_SIGNUP_CONSENT,
  type SignupConsent,
} from '@/lib/auth/signup-consent'

/*
  「전체 동의」의 indeterminate 는 속성이 아니라 DOM 프로퍼티라 SSR 마크업에 나오지 않는다.
  실제 DOM 에서 잠근다. 마크업 계약은 signup-consent-fieldset.test.ts.
*/

afterEach(() => {
  cleanup()
})

const PREFIX = 'consent'

const Harness = ({ initial }: { initial: SignupConsent }) => {
  const [value, setValue] = useState(initial)
  return createElement(SignupConsentFieldset, {
    value,
    onChange: setValue,
    idPrefix: PREFIX,
  })
}

const checkbox = (id: string) => {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`체크박스가 없다: ${id}`)
  }
  return element
}

const all = () => checkbox(`${PREFIX}-all`)
const item = (key: keyof SignupConsent) =>
  checkbox(signupConsentInputId(PREFIX, key))

describe('SignupConsentFieldset — 전체 동의', () => {
  it('하나도 켜지지 않았으면 전체 동의는 꺼져 있고 indeterminate 가 아니다', () => {
    render(createElement(Harness, { initial: EMPTY_SIGNUP_CONSENT }))

    expect(all().checked).toBe(false)
    expect(all().indeterminate).toBe(false)
  })

  it('일부만 켜지면 indeterminate 가 된다', () => {
    render(createElement(Harness, { initial: EMPTY_SIGNUP_CONSENT }))

    fireEvent.click(item('termsAgreed'))

    expect(item('termsAgreed').checked).toBe(true)
    expect(all().checked).toBe(false)
    expect(all().indeterminate).toBe(true)
  })

  it('전체 동의를 누르면 셋을 한꺼번에 켜고, 다시 누르면 끈다', () => {
    render(createElement(Harness, { initial: EMPTY_SIGNUP_CONSENT }))

    fireEvent.click(all())
    expect(item('termsAgreed').checked).toBe(true)
    expect(item('privacyAgreed').checked).toBe(true)
    expect(item('ageOver14Confirmed').checked).toBe(true)
    expect(all().checked).toBe(true)
    expect(all().indeterminate).toBe(false)

    fireEvent.click(all())
    expect(item('termsAgreed').checked).toBe(false)
    expect(item('privacyAgreed').checked).toBe(false)
    expect(item('ageOver14Confirmed').checked).toBe(false)
  })

  it('일부만 켜진 상태에서 전체 동의를 누르면 모두 켠다', () => {
    render(createElement(Harness, { initial: EMPTY_SIGNUP_CONSENT }))

    fireEvent.click(item('privacyAgreed'))
    fireEvent.click(all())

    expect(item('termsAgreed').checked).toBe(true)
    expect(item('privacyAgreed').checked).toBe(true)
    expect(item('ageOver14Confirmed').checked).toBe(true)
  })
})
