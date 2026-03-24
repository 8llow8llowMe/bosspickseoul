import type { Metadata } from 'next'
import RegisterGeneralPage from '@/components/auth/register-general-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '이메일 회원가입',
  description:
    '이메일 인증 후 닉네임과 비밀번호를 등록하는 NowDoBoss 일반 회원가입 화면입니다.',
  path: '/register/general',
  index: false,
})

export default function Page() {
  return <RegisterGeneralPage />
}
