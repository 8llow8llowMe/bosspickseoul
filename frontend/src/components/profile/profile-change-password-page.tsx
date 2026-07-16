'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Field,
  FieldLabel,
  Form,
  HelperText,
  PrimaryButton,
  SectionNotice,
  SectionPanel,
  SectionStack,
  SectionTitle,
  SectionBody,
  TextInput,
} from '@/components/profile/profile-ui'
import { changeMemberPassword } from '@/lib/api/profile'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { useAuthStore } from '@/stores/auth-store'

export default function ProfileChangePasswordPage() {
  const memberInfo = useAuthStore(state => state.memberInfo)
  const [form, setForm] = useState({
    nowPassword: '',
    changePassword: '',
    changePasswordCheck: '',
  })
  const [message, setMessage] = useState<{
    tone: 'error' | 'success' | 'info'
    text: string
  } | null>(null)

  const mutation = useMutation({
    mutationFn: changeMemberPassword,
    onSuccess: response => {
      if (!isApiSuccess(response)) {
        setMessage({
          tone: 'error',
          text: getApiMessage(response, '비밀번호를 변경하지 못했습니다.'),
        })
        return
      }

      setForm({
        nowPassword: '',
        changePassword: '',
        changePasswordCheck: '',
      })
      setMessage({
        tone: 'success',
        text: '비밀번호가 변경되었습니다.',
      })
    },
    onError: () => {
      setMessage({
        tone: 'error',
        text: '현재 비밀번호와 새 비밀번호를 확인한 뒤 다시 시도해주세요.',
      })
    },
  })

  if (memberInfo?.provider) {
    return (
      <SectionStack>
        <SectionPanel>
          <SectionTitle>비밀번호 변경</SectionTitle>
          <SectionBody>
            소셜 계정은 외부 인증 공급자를 통해 로그인하므로 비밀번호 변경을
            지원하지 않습니다.
          </SectionBody>
        </SectionPanel>
      </SectionStack>
    )
  }

  const handleChange =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm(current => ({
        ...current,
        [key]: event.target.value,
      }))
    }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    mutation.mutate(form)
  }

  return (
    <SectionStack>
      <SectionPanel>
        <SectionTitle>비밀번호 변경</SectionTitle>
        <SectionBody>
          현재 비밀번호 확인 후 새 비밀번호를 등록합니다. 기존 레거시 서버 검증
          규칙을 그대로 따릅니다.
        </SectionBody>
      </SectionPanel>

      <SectionPanel>
        {message ? (
          <SectionNotice $tone={message.tone}>{message.text}</SectionNotice>
        ) : null}
        <Form onSubmit={handleSubmit}>
          <Field>
            <FieldLabel>현재 비밀번호</FieldLabel>
            <TextInput
              type="password"
              value={form.nowPassword}
              onChange={handleChange('nowPassword')}
            />
          </Field>
          <Field>
            <FieldLabel>새 비밀번호</FieldLabel>
            <TextInput
              type="password"
              value={form.changePassword}
              onChange={handleChange('changePassword')}
            />
            <HelperText>
              영문, 숫자, 특수문자를 포함한 8~16자 구성을 권장합니다.
            </HelperText>
          </Field>
          <Field>
            <FieldLabel>새 비밀번호 확인</FieldLabel>
            <TextInput
              type="password"
              value={form.changePasswordCheck}
              onChange={handleChange('changePasswordCheck')}
            />
          </Field>
          <PrimaryButton type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? '변경 중...' : '비밀번호 변경'}
          </PrimaryButton>
        </Form>
      </SectionPanel>
    </SectionStack>
  )
}
