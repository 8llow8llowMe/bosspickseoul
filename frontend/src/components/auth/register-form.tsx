'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Eye, EyeOff, Minus } from 'lucide-react'
import styled from 'styled-components'
import AuthShell, {
  AuthForm,
  Field,
  FieldLabel,
  FooterLink,
  FooterRow,
  HelperText,
  FieldError,
  Notice,
  PrimaryButton,
  SecondaryButton,
  TextInput,
} from '@/components/auth/auth-shell'
import {
  buildSignupCompleteLoginHref,
  getBrowserSessionStorage,
  rememberSignupEmail,
} from '@/components/auth/auth-flow'
import GuestOnly from '@/components/auth/guest-only'
import SignupConsentFieldset, {
  useSignupConsentFocus,
} from '@/components/auth/signup-consent-fieldset'
import SocialLogin from '@/components/auth/social-login'
import {
  EMAIL_CODE_COOLDOWN,
  classifyAuthError,
  getAuthErrorMessage,
  isEmailCodeInvalidated,
  type AuthErrorField,
} from '@/lib/api/auth-errors'
import {
  EMAIL_FORMAT_MESSAGE,
  EMAIL_PATTERN,
  INITIAL_REGISTER_STATE,
  NAME_MAX_LENGTH,
  NICKNAME_MAX_LENGTH,
  PASSWORD_RULES,
  REGISTER_PROFILE_FIELDS,
  canSubmit,
  onCodeSent,
  onEmailChanged,
  onVerified,
  registerFieldErrors,
  validateRegisterField,
  type RegisterForm as RegisterFormValues,
  type RegisterProfileField,
} from '@/components/auth/register-machine'
import { buildLoginHref, safeReturnPath } from '@/lib/auth/return-path'
import { RESEND_COOLDOWN_SECONDS } from '@/lib/auth/verification-cooldown'
import {
  EMPTY_SIGNUP_CONSENT,
  SOCIAL_SIGNUP_CONSENT_REQUIRED_MESSAGE,
  isSignupConsentComplete,
  missingSignupConsent,
  signupConsentErrorKeys,
  type SignupConsent,
  type SignupConsentKey,
} from '@/lib/auth/signup-consent'
import { normalizeApiResponseFailure } from '@/lib/api/api-error'
import type { ApiResponse } from '@/types/api'
import { PASSWORD_REVEAL_LABEL } from '@/components/ui/text-field'
import { touchHitArea } from '@/styles/touch-target'

const INITIAL_FORM: RegisterFormValues = {
  email: '',
  password: '',
  name: '',
  nickname: '',
}

type FormError = {
  field: AuthErrorField
  message: string
} | null

const PasswordFieldWrapper = styled.div`
  position: relative;
`

const PasswordInput = styled(TextInput)`
  padding-right: 64px;
`

const PasswordToggle = styled.button`
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  border: none;
  background: none;
  color: var(--color-text-500);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  svg {
    width: 20px;
    height: 20px;
  }
  /* 보이는 아이콘은 그대로, 모바일 히트 영역만 44px. 이미 absolute 라 position 은 건드리지 않는다. */
  ${touchHitArea({ keepPosition: true })}
`

const ResendRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const ResendButton = styled.button`
  border: none;
  background: none;
  padding: 0;
  color: var(--color-text-primary-on-light);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    color: var(--color-text-500);
    cursor: not-allowed;
  }
`

/** 비밀번호 규칙 체크리스트(#578). 항목마다 지켰는지를 아이콘·색·숨은 문구 세 가지로 말한다. */
const PasswordRuleList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const PasswordRuleItem = styled.li<{ $met: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  /* 지킨 항목은 초록 글자(green700, 흰 바탕 5.36:1 — DESIGN.md §2 Success Green Text). */
  color: ${props =>
    props.$met ? 'var(--color-green-700)' : 'var(--color-text-500)'};
  font-size: 13px;
  line-height: 20px;

  svg {
    width: 14px;
    height: 14px;
    flex: 0 0 auto;
  }
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

const PASSWORD_RULES_ID = 'register-password-rules'

const fieldErrorId = (field: RegisterProfileField) => `register-${field}-error`

/** `aria-describedby` 에 넣을 id 들. 빈 값은 빼고, 남는 게 없으면 속성을 달지 않는다. */
const describedBy = (...ids: Array<string | false | null | undefined>) =>
  ids.filter(Boolean).join(' ') || undefined

const parseJsonResponse = async (
  res: Response,
): Promise<ApiResponse<unknown> | null> =>
  (await res.json().catch(() => null)) as ApiResponse<unknown> | null

const NETWORK_ERROR_MESSAGE = '네트워크 연결을 확인한 뒤 다시 시도해주세요.'

const CONSENT_ID_PREFIX = 'register-consent'

export type RegisterFormProps = {
  /** 서버가 세션 쿠키가 없다고 확인했다 — `GuestOnly` 참고(#579). */
  assumeGuest?: boolean
}

export default function RegisterForm({
  assumeGuest = false,
}: RegisterFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // 로그인 화면에서 넘어온 「원래 가려던 화면」. 로그인과 같은 판정을 쓴다(#576).
  const returnTo = safeReturnPath(searchParams.get('redirect'))
  const [state, setState] = useState(INITIAL_REGISTER_STATE)
  const [form, setForm] = useState<RegisterFormValues>(INITIAL_FORM)
  const [code, setCode] = useState('')
  const [error, setError] = useState<FormError>(null)
  // 인증 뒤 칸(비밀번호·이름·닉네임)의 오류. 가입 버튼이 잠긴 이유를 각 칸 옆에서 말한다(#578).
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<RegisterProfileField, string>>
  >({})
  // 오류가 커밋된 **뒤** 그 칸으로 포커스한다(`useSignupConsentFocus` 와 같은 이유).
  const [focusRequest, setFocusRequest] = useState<{
    field: RegisterProfileField
  } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  // 이메일 가입과 아래 카카오 가입이 같은 동의를 쓴다(#495).
  const [consent, setConsent] = useState<SignupConsent>(EMPTY_SIGNUP_CONSENT)
  const [consentInvalid, setConsentInvalid] = useState<SignupConsentKey[]>([])
  const [socialConsentNotice, setSocialConsentNotice] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown(current => (current <= 1 ? 0 : current - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  useEffect(() => {
    if (!focusRequest) return
    document
      .querySelector<HTMLInputElement>(`input[name="${focusRequest.field}"]`)
      ?.focus()
  }, [focusRequest])

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value
    setForm(current => ({ ...current, email: next }))
    const nextState = onEmailChanged(state, next)
    if (nextState !== state) {
      // 보낸 코드는 옛 주소에 묶여 있다. 입력한 코드와 재전송 대기를 함께 버린다(#578).
      setCode('')
      setCooldown(0)
      if (error?.field === 'code') setError(null)
    }
    setState(nextState)
    // 고쳐서 형식이 맞으면 이메일 오류를 바로 걷는다. 틀린 동안은 blur·발송 때 다시 말한다.
    if (error?.field === 'email' && EMAIL_PATTERN.test(next.trim())) {
      setError(null)
    }
  }

  /** 이메일 칸을 떠날 때 형식을 본다. 비어 있으면 아직 말하지 않는다. */
  const handleEmailBlur = () => {
    const email = form.email.trim()
    if (email && !EMAIL_PATTERN.test(email)) {
      setError({ field: 'email', message: EMAIL_FORMAT_MESSAGE })
    }
  }

  const handleFieldChange =
    (key: RegisterProfileField) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setForm(current => ({ ...current, [key]: value }))
      // 이미 오류를 보이는 칸은 고치는 동안 다시 판정해, 맞는 순간 오류를 걷는다.
      if (fieldErrors[key] && !validateRegisterField(key, value)) {
        setFieldErrors(current => ({ ...current, [key]: undefined }))
      }
    }

  /**
   * 칸을 떠날 때 판정한다. 아직 아무것도 적지 않은 칸은 지나가도 탓하지 않는다.
   *
   * 비밀번호는 blur 로 오류를 **새로 붙이지 않는다**(맞으면 걷기만 한다). 바로 아래 체크리스트가
   * 이미 항목별로 실시간으로 말하고 있고, blur 때 오류 줄이 끼어들면 「회원가입」 버튼이 아래로
   * 밀려 그 버튼을 누르던 클릭이 빗나간다(mousedown 이 blur 를 일으키고 mouseup 은 밀린 자리에
   * 떨어진다 — 375px 실측). 오류 문구는 제출 때 붙는다.
   */
  const handleFieldBlur = (key: RegisterProfileField) => () => {
    const value = form[key]
    if (!value) return
    const message = validateRegisterField(key, value)
    if (message && key === 'password') return
    setFieldErrors(current => ({ ...current, [key]: message ?? undefined }))
  }

  const handleConsentChange = (next: SignupConsent) => {
    setConsent(next)
    // 켠 항목의 강조는 바로 걷는다. 아직 꺼진 항목은 남긴다.
    setConsentInvalid(current => current.filter(key => !next[key]))
    if (isSignupConsentComplete(next)) setSocialConsentNotice(false)
  }

  const focusConsent = useSignupConsentFocus(CONSENT_ID_PREFIX)

  /** 강조하고, 강조가 그려진 뒤 첫 항목으로 포커스를 옮긴다. */
  const markConsentInvalid = (keys: SignupConsentKey[]) => {
    setConsentInvalid(keys)
    focusConsent(keys[0])
  }

  const handleSocialConsentIncomplete = (missing: SignupConsentKey[]) => {
    setSocialConsentNotice(true)
    markConsentInvalid(missing)
  }

  const handleSendCode = async () => {
    const email = form.email.trim()
    if (!EMAIL_PATTERN.test(email)) {
      // 버튼을 잠그지 않고 누르면 여기서 이유를 말한다(#578).
      setError({ field: 'email', message: EMAIL_FORMAT_MESSAGE })
      return
    }

    setError(null)
    setIsSendingCode(true)
    try {
      const res = await fetch('/api/bff/auth/email/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await parseJsonResponse(res)

      if (res.ok && data?.dataHeader?.success) {
        // 전송에 사용한 값으로 정규화해 이후 verifiedEmail 비교가 어긋나지 않도록 한다.
        setForm(current => ({ ...current, email }))
        setState(onCodeSent)
        setCooldown(RESEND_COOLDOWN_SECONDS)
        return
      }

      const resultCode = data?.dataHeader?.resultCode
      // 서버가 아직 쿨다운이라고 답했다면 화면 카운트다운이 실제와 어긋난 것이다
      // (다른 탭에서 보냈거나, 무효화 처리로 우리가 쿨다운을 열어 준 뒤일 수 있다).
      // 남은 시간을 알 수 없으므로 한 주기를 통째로 다시 잠근다 — 과대추정이 안전하다.
      if (resultCode === EMAIL_CODE_COOLDOWN) {
        setCooldown(RESEND_COOLDOWN_SECONDS)
      }
      setError({
        field: classifyAuthError(resultCode),
        message: getAuthErrorMessage(data, '인증코드 발송에 실패했습니다.'),
      })
    } catch {
      setError({ field: 'general', message: NETWORK_ERROR_MESSAGE })
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    const email = form.email.trim()
    const trimmedCode = code.trim()
    if (!trimmedCode) {
      setError({ field: 'code', message: '인증코드를 입력해주세요.' })
      return
    }

    setError(null)
    setIsVerifyingCode(true)
    try {
      const res = await fetch('/api/bff/auth/email/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: trimmedCode }),
      })
      const data = await parseJsonResponse(res)

      if (res.ok && data?.dataHeader?.success) {
        // form.email과 동일한 값을 verifiedEmail로 저장해 canSubmit의 동등 비교가 성립하게 한다.
        setForm(current => ({ ...current, email }))
        setState(current => onVerified(current, email))
        return
      }

      const resultCode = data?.dataHeader?.resultCode
      // 코드가 무효화됐으면(만료 AUTH_005 / 시도초과 AUTH_018) 백엔드에 코드가 남아 있지 않다.
      // 죽은 값을 입력란에 남겨 두고 재전송까지 잠가 두면 안내만 하고 길은 막는 꼴이 된다.
      if (isEmailCodeInvalidated(resultCode)) {
        setCode('')
        setCooldown(0)
      }
      setError({
        field: classifyAuthError(resultCode),
        message: getAuthErrorMessage(data, '인증코드 확인에 실패했습니다.'),
      })
    } catch {
      setError({ field: 'general', message: NETWORK_ERROR_MESSAGE })
    } finally {
      setIsVerifyingCode(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    if (!canSubmit(state, form, consent)) {
      // 버튼은 켜 두고, 막힌 이유를 각 칸 옆에서 말한 뒤 첫 칸으로 데려간다(#578).
      const errors = registerFieldErrors(form)
      setFieldErrors(errors)
      const missing = missingSignupConsent(consent)
      setConsentInvalid(missing)
      const firstField = REGISTER_PROFILE_FIELDS.find(field => errors[field])
      if (firstField) {
        setFocusRequest({ field: firstField })
      } else if (missing.length > 0) {
        focusConsent(missing[0])
      } else {
        // 인증한 이메일과 지금 이메일이 어긋난 경우다. 이메일 칸은 인증 뒤 잠기므로 방어용이다.
        setError({
          field: 'general',
          message: '이메일 인증을 다시 진행해주세요.',
        })
      }
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/bff/members/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name.trim(),
          nickname: form.nickname.trim(),
          // 세 값을 각각 보낸다. 문서 판(version)은 서버가 정하므로 보내지 않는다(계약 §0).
          termsAgreed: consent.termsAgreed,
          privacyAgreed: consent.privacyAgreed,
          ageOver14Confirmed: consent.ageOver14Confirmed,
        }),
      })
      const data = await parseJsonResponse(res)

      if (res.ok && data?.dataHeader?.success) {
        /*
         * 가입 응답은 세션을 주지 않는다(BE #595 전). 그래서 로그인 화면으로 보내되, 가입을 마쳤다는
         * 안내(`?signup=1`)와 원래 가려던 화면(`redirect`)을 함께 넘기고 이메일은 미리 채운다(#576).
         *
         * TODO(BE #595): 가입 응답이 세션(토큰)을 실어 주면 여기서 BFF 로그인 라우트처럼 세션을 봉인한
         * 뒤 `await useAuthStore.getState().hydrate()` → `router.replace(returnTo)` 로 바로 보낸다.
         * 그때 `rememberSignupEmail` 과 로그인 화면의 `signup=1` 안내는 걷는다.
         */
        rememberSignupEmail(getBrowserSessionStorage(), form.email)
        router.replace(buildSignupCompleteLoginHref(returnTo))
        return
      }

      // 동의로 거절되면 그 체크박스를 강조한다. 이메일 인증은 소비되지 않았으므로
      // (계약 §0-1) 인증 상태는 건드리지 않는다 — 체크하고 다시 제출하면 된다.
      const consentKeys = signupConsentErrorKeys(
        data?.dataHeader?.resultCode,
        consent,
        normalizeApiResponseFailure(data, res.status)?.fieldErrors ?? [],
      )
      if (consentKeys.length > 0) {
        markConsentInvalid(consentKeys)
        return
      }

      setError({
        field: classifyAuthError(data?.dataHeader?.resultCode),
        message: getAuthErrorMessage(data, '가입에 실패했습니다.'),
      })
    } catch {
      setError({ field: 'general', message: NETWORK_ERROR_MESSAGE })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isVerified = state.step === 'verified'

  return (
    <GuestOnly assumeGuest={assumeGuest} redirectTo={returnTo}>
      <AuthShell
        eyebrow="회원가입"
        title="BossPickSeoul 계정을 시작합니다."
        description="이메일 인증 후 비밀번호와 프로필 정보를 입력하면 가입이 완료됩니다."
      >
        {/* 카카오를 맨 위에 둔다(#577). 카카오 가입도 아래 동의 fieldset 을 쓴다(#495) —
            동의가 모자란 채 누르면 이동하지 않고 그 체크박스로 포커스를 옮긴다. */}
        <SocialLogin
          consent={consent}
          onConsentIncomplete={handleSocialConsentIncomplete}
          returnTo={returnTo}
        />

        {/* 브라우저 기본 검증을 끈다. type="email" 이 켜져 있으면 크롬이 자체
            말풍선을 띄우며 제출을 가로채, 아래 EMAIL_PATTERN 검사와 DESIGN.md
            §Error (inline field) 규격의 인라인 에러가 아예 도달하지 못한다.
            type="email" 자체는 모바일 키보드 힌트 때문에 유지한다.
            (community-editor-form 도 같은 이유로 noValidate 다) */}
        <AuthForm noValidate onSubmit={handleSubmit}>
          {error?.field === 'general' ? (
            <Notice $tone="error">{error.message}</Notice>
          ) : null}

          {isVerified ? (
            <Notice $tone="success">이메일 인증 완료</Notice>
          ) : null}

          <Field>
            <FieldLabel>이메일</FieldLabel>
            <TextInput
              type="email"
              name="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              readOnly={isVerified}
              aria-invalid={error?.field === 'email' || undefined}
              aria-describedby={
                error?.field === 'email' ? 'register-email-error' : undefined
              }
            />
            {error?.field === 'email' ? (
              <FieldError id="register-email-error">{error.message}</FieldError>
            ) : null}
          </Field>

          {/* 형식이 틀려도 잠그지 않는다 — 누르면 위 칸에 이유가 나온다(#578). */}
          {state.step === 'email-entry' ? (
            <SecondaryButton
              type="button"
              onClick={handleSendCode}
              disabled={isSendingCode}
            >
              {isSendingCode ? '발송 중...' : '인증코드 발송'}
            </SecondaryButton>
          ) : null}

          {state.step === 'code-sent' || isVerified ? (
            <Field>
              <FieldLabel>인증코드</FieldLabel>
              <TextInput
                type="text"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="인증코드를 입력하세요."
                value={code}
                onChange={event => setCode(event.target.value)}
                readOnly={isVerified}
                aria-invalid={error?.field === 'code' || undefined}
                aria-describedby={
                  error?.field === 'code' ? 'register-code-error' : undefined
                }
              />
              {error?.field === 'code' ? (
                <FieldError id="register-code-error">
                  {error.message}
                </FieldError>
              ) : null}
              {state.step === 'code-sent' ? (
                <ResendRow>
                  <HelperText>
                    인증코드가 오지 않았다면 재전송해주세요.
                  </HelperText>
                  <ResendButton
                    type="button"
                    onClick={handleSendCode}
                    disabled={cooldown > 0 || isSendingCode}
                  >
                    {cooldown > 0
                      ? `재전송 (${cooldown}초)`
                      : '인증코드 재전송'}
                  </ResendButton>
                </ResendRow>
              ) : null}
            </Field>
          ) : null}

          {/* 비어 있어도 잠그지 않는다 — 누르면 코드 칸에 「인증코드를 입력해주세요.」가 나온다(#578). */}
          {state.step === 'code-sent' ? (
            <SecondaryButton
              type="button"
              onClick={handleVerifyCode}
              disabled={isVerifyingCode}
            >
              {isVerifyingCode ? '확인 중...' : '인증 확인'}
            </SecondaryButton>
          ) : null}

          {isVerified ? (
            <>
              <Field>
                <FieldLabel>비밀번호</FieldLabel>
                <PasswordFieldWrapper>
                  <PasswordInput
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="new-password"
                    placeholder="비밀번호를 입력하세요."
                    value={form.password}
                    onChange={handleFieldChange('password')}
                    onBlur={handleFieldBlur('password')}
                    aria-invalid={Boolean(fieldErrors.password) || undefined}
                    aria-describedby={describedBy(
                      PASSWORD_RULES_ID,
                      fieldErrors.password && fieldErrorId('password'),
                    )}
                  />
                  {/*
                    공용 `TextField revealable` 과 같은 동작이다(#583). 이 폼은 AuthShell 입력칸을 쓰고
                    칸 아래에 규칙 체크리스트(<ul>)를 두어 TextField 로 옮기지 않았다 — 이유는
                    profile.md S4-1 「가입 폼 이관」. 누를 때 포커스를 입력칸에 남긴다: 버튼으로 옮겨 가면
                    칸이 blur 되고 캐럿이 사라진다. 터치는 pointerdown 에서 막아야 호환 mousedown 까지 막힌다.
                  */}
                  <PasswordToggle
                    type="button"
                    onPointerDown={event => event.preventDefault()}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => setShowPassword(current => !current)}
                    aria-label={PASSWORD_REVEAL_LABEL}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden />
                    ) : (
                      <Eye aria-hidden />
                    )}
                  </PasswordToggle>
                </PasswordFieldWrapper>
                {/* 규칙을 항목별로 보여 준다. 입력칸이 aria-describedby 로 이 목록을 읽는다(#578). */}
                <PasswordRuleList id={PASSWORD_RULES_ID}>
                  {PASSWORD_RULES.map(rule => {
                    const met = rule.test(form.password)
                    return (
                      <PasswordRuleItem key={rule.key} $met={met}>
                        {met ? <Check aria-hidden /> : <Minus aria-hidden />}
                        {rule.label}
                        <VisuallyHidden>
                          {met ? ' 충족' : ' 미충족'}
                        </VisuallyHidden>
                      </PasswordRuleItem>
                    )
                  })}
                </PasswordRuleList>
                {fieldErrors.password ? (
                  <FieldError id={fieldErrorId('password')}>
                    {fieldErrors.password}
                  </FieldError>
                ) : null}
              </Field>

              <Field>
                <FieldLabel>이름</FieldLabel>
                <TextInput
                  type="text"
                  name="name"
                  autoComplete="name"
                  maxLength={NAME_MAX_LENGTH}
                  placeholder="실명을 입력하세요."
                  value={form.name}
                  onChange={handleFieldChange('name')}
                  onBlur={handleFieldBlur('name')}
                  aria-invalid={Boolean(fieldErrors.name) || undefined}
                  aria-describedby={describedBy(
                    fieldErrors.name && fieldErrorId('name'),
                  )}
                />
                {fieldErrors.name ? (
                  <FieldError id={fieldErrorId('name')}>
                    {fieldErrors.name}
                  </FieldError>
                ) : null}
              </Field>

              <Field>
                <FieldLabel>닉네임</FieldLabel>
                <TextInput
                  type="text"
                  name="nickname"
                  autoComplete="nickname"
                  maxLength={NICKNAME_MAX_LENGTH}
                  placeholder="서비스에서 사용할 닉네임"
                  value={form.nickname}
                  onChange={handleFieldChange('nickname')}
                  onBlur={handleFieldBlur('nickname')}
                  aria-invalid={Boolean(fieldErrors.nickname) || undefined}
                  aria-describedby={describedBy(
                    fieldErrors.nickname && fieldErrorId('nickname'),
                  )}
                />
                {fieldErrors.nickname ? (
                  <FieldError id={fieldErrorId('nickname')}>
                    {fieldErrors.nickname}
                  </FieldError>
                ) : null}
              </Field>
            </>
          ) : null}

          {/* 단계와 무관하게 늘 보인다 — 위 카카오 가입도 이 동의를 쓴다(#495). */}
          <SignupConsentFieldset
            value={consent}
            onChange={handleConsentChange}
            invalid={consentInvalid}
            idPrefix={CONSENT_ID_PREFIX}
          />

          {socialConsentNotice ? (
            <Notice $tone="error">
              {SOCIAL_SIGNUP_CONSENT_REQUIRED_MESSAGE}
            </Notice>
          ) : null}

          {/* 입력이 모자라도 잠그지 않는다 — 누르면 막힌 칸마다 이유를 말하고 첫 칸으로 간다(#578). */}
          {isVerified ? (
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? '가입 처리 중...' : '회원가입'}
            </PrimaryButton>
          ) : null}
        </AuthForm>

        <FooterRow>
          <span>이미 계정이 있나요?</span>
          {/* 원래 가려던 화면을 로그인 화면에도 들고 간다(#576). */}
          <FooterLink href={buildLoginHref(returnTo)}>로그인</FooterLink>
        </FooterRow>
      </AuthShell>
    </GuestOnly>
  )
}
