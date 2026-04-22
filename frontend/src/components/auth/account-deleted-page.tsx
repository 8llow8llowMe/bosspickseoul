import Link from 'next/link'
import styled from 'styled-components'
import AuthShell, {
  FooterLink,
  FooterRow,
  Notice,
} from '@/components/auth/auth-shell'

const PrimaryLink = styled(Link)`
  min-width: 180px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: white;
  font-size: 15px;
  font-weight: 600;
`

export default function AccountDeletedPage() {
  return (
    <AuthShell
      eyebrow="Account"
      title="회원 탈퇴가 완료되었습니다."
      description="개인 정보와 기존 세션이 정리되었습니다. 다시 서비스를 이용하려면 새 계정으로 가입해야 합니다."
    >
      <Notice $tone="success">
        탈퇴 요청이 정상 처리되었습니다. 운영 중 생성된 개인 설정과 로그인
        세션은 모두 초기화되었습니다.
      </Notice>
      <PrimaryLink href="/">메인으로 이동</PrimaryLink>
      <FooterRow>
        <span>다시 시작하려면</span>
        <FooterLink href="/register">새 계정 만들기</FooterLink>
      </FooterRow>
    </AuthShell>
  )
}
