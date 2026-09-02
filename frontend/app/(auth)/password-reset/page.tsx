import type { Metadata } from 'next'
import PasswordResetForm from '@/components/auth/password-reset-form'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '비밀번호 재설정',
  description: '가입한 이메일로 인증코드를 받아 비밀번호를 다시 설정합니다.',
  path: '/password-reset',
  index: false,
})

export default function Page() {
  return <PasswordResetForm />
}
