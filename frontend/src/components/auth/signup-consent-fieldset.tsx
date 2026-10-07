'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { FieldError } from '@/components/auth/auth-shell'
import { LEGAL_HREF } from '@/lib/legal/links'
import {
  SIGNUP_CONSENT_ERROR_MESSAGE,
  SIGNUP_CONSENT_KEYS,
  isSignupConsentComplete,
  setAllSignupConsent,
  type SignupConsent,
  type SignupConsentKey,
} from '@/lib/auth/signup-consent'

/** 체크박스 `id`. 부모가 오류 항목으로 포커스를 옮길 때 같은 규칙을 쓴다. */
export const signupConsentInputId = (idPrefix: string, key: SignupConsentKey) =>
  `${idPrefix}-${key}`

/**
 * 오류로 강조한 체크박스에 포커스를 옮긴다 — **강조가 커밋된 뒤에.**
 *
 * 강조(`setInvalid`)와 같은 핸들러에서 곧바로 `.focus()` 하면 `aria-invalid`·`aria-describedby`·
 * 오류 문구가 DOM 에 붙기 전에 포커스가 가서, 스크린리더가 오류 없는 체크박스를 읽는다.
 * 그래서 포커스할 키를 상태로 두고 effect 에서 옮긴다. 같은 키를 다시 요청해도 움직이도록
 * 매번 새 객체를 넣는다.
 */
export const useSignupConsentFocus = (idPrefix: string) => {
  const [request, setRequest] = useState<{ key: SignupConsentKey } | null>(null)

  useEffect(() => {
    if (!request) return
    document
      .getElementById(signupConsentInputId(idPrefix, request.key))
      ?.focus()
  }, [idPrefix, request])

  return (key: SignupConsentKey | undefined) => {
    if (key) setRequest({ key })
  }
}

const ITEMS: Record<
  SignupConsentKey,
  { label: string; view?: { href: string; name: string } }
> = {
  termsAgreed: {
    label: '이용약관에 동의합니다',
    view: { href: LEGAL_HREF.terms, name: '이용약관' },
  },
  privacyAgreed: {
    label: '개인정보 처리방침에 동의합니다',
    view: { href: LEGAL_HREF.privacy, name: '개인정보 처리방침' },
  },
  ageOver14Confirmed: { label: '만 14세 이상입니다' },
}

const Fieldset = styled.fieldset`
  display: grid;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
`

const Legend = styled.legend`
  margin-bottom: 8px;
  padding: 0;
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

/*
  체크박스 선례는 profile-ui.tsx 의 CheckboxRow(label 이 input 을 감싼다)와
  community-report-dialog.tsx 의 사유 옵션(accent-color primary-700, 20px)이다.
  label 전체가 누르는 영역이라 min-height 44px 로 터치 타깃을 잡는다(DESIGN.md §Touch Targets).
  포커스 표시는 전역 :focus-visible 링을 그대로 쓴다.
*/
const CheckLabel = styled.label<{ $strong?: boolean }>`
  flex: 1 1 auto;
  min-width: 0;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--color-text-900);
  font-size: ${props => (props.$strong ? '15px' : '14px')};
  font-weight: ${props => (props.$strong ? 600 : 400)};
  line-height: 20px;
  cursor: pointer;

  input {
    width: 20px;
    height: 20px;
    flex: 0 0 auto;
    margin: 0;
    accent-color: var(--color-primary-700);
    cursor: inherit;
  }

  span {
    min-width: 0;
    overflow-wrap: anywhere;
    word-break: keep-all;
  }
`

const AllRow = styled.div`
  display: flex;
  border-bottom: 1px solid var(--color-border-200);
  margin-bottom: 4px;
`

const Item = styled.div`
  display: grid;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

/* blue500(primary-700)은 흰 바탕에서 2.77:1 이라 글자에 쓰지 않는다(DESIGN.md §Color 「Blue Text」). */
const Required = styled.strong`
  color: var(--color-text-primary-on-light);
  font-weight: 600;
`

const ViewLink = styled(Link)`
  flex: 0 0 auto;
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-500);
  font-size: 13px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
`

/* 오류 문구를 체크박스(20px) + 간격(12px) 뒤 글자 시작선에 맞춘다. */
const ItemError = styled(FieldError)`
  padding-left: 32px;
`

export type SignupConsentFieldsetProps = {
  value: SignupConsent
  onChange: (next: SignupConsent) => void
  /** 강조할 항목. 오류 문구가 체크박스 아래에 붙는다. */
  invalid?: readonly SignupConsentKey[]
  /** 한 화면에 둘 이상 그려도 `id` 가 겹치지 않게 한다. */
  idPrefix: string
}

/**
 * 가입 동의 체크박스 묶음 (#495, 계약 §0-1).
 *
 * 「전체 동의」는 세 항목을 한꺼번에 켜고 끄는 편의일 뿐이다 — 서버에는 세 필드를 각각 보낸다.
 * 일부만 켜졌으면 indeterminate 로 보인다(DOM 프로퍼티라 effect 에서 설정한다).
 */
export default function SignupConsentFieldset({
  value,
  onChange,
  invalid = [],
  idPrefix,
}: SignupConsentFieldsetProps) {
  const allRef = useRef<HTMLInputElement>(null)
  const allChecked = isSignupConsentComplete(value)
  const someChecked = SIGNUP_CONSENT_KEYS.some(key => value[key])
  const indeterminate = someChecked && !allChecked

  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <Fieldset>
      <Legend>약관 동의</Legend>
      <AllRow>
        <CheckLabel $strong>
          <input
            ref={allRef}
            id={`${idPrefix}-all`}
            type="checkbox"
            checked={allChecked}
            // 일부만 켜졌을 때 누르면 모두 켠다 — 꺼진 것을 켜려는 의도가 더 흔하다.
            onChange={() => onChange(setAllSignupConsent(!allChecked))}
          />
          <span>전체 동의</span>
        </CheckLabel>
      </AllRow>
      {SIGNUP_CONSENT_KEYS.map(key => {
        const item = ITEMS[key]
        const inputId = signupConsentInputId(idPrefix, key)
        const errorId = `${inputId}-error`
        const isInvalid = invalid.includes(key)
        return (
          <Item key={key}>
            <Row>
              <CheckLabel>
                <input
                  id={inputId}
                  type="checkbox"
                  name={key}
                  checked={value[key]}
                  onChange={event =>
                    onChange({ ...value, [key]: event.target.checked })
                  }
                  aria-invalid={isInvalid || undefined}
                  aria-describedby={isInvalid ? errorId : undefined}
                />
                <span>
                  <Required>[필수]</Required> {item.label}
                </span>
              </CheckLabel>
              {item.view ? (
                <ViewLink
                  href={item.view.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${item.view.name} 보기 (새 탭)`}
                >
                  보기
                </ViewLink>
              ) : null}
            </Row>
            {isInvalid ? (
              <ItemError id={errorId}>
                {SIGNUP_CONSENT_ERROR_MESSAGE[key]}
              </ItemError>
            ) : null}
          </Item>
        )
      })}
    </Fieldset>
  )
}
