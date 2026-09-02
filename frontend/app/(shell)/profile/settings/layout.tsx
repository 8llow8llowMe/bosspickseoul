import ProfileSectionLayout from '@/components/profile/profile-section-layout'

const tabs = [
  { label: '회원 정보', href: '/profile/settings/edit' },
  { label: '비밀번호 변경', href: '/profile/settings/change-password' },
  { label: '회원 탈퇴', href: '/profile/settings/withdraw' },
] as const

type SettingsLayoutProps = {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <ProfileSectionLayout
      title="개인 정보 설정"
      description="계정 정보를 확인하고 관리합니다."
      tabs={tabs}
    >
      {children}
    </ProfileSectionLayout>
  )
}
