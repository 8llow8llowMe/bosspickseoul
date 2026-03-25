import ProfileSectionLayout from '@/components/profile/profile-section-layout'

const tabs = [
  { label: '회원 정보 수정', href: '/profile/settings/edit' },
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
      description="프로필 이미지와 닉네임, 비밀번호, 회원 탈퇴를 한 곳에서 관리합니다."
      tabs={tabs}
    >
      {children}
    </ProfileSectionLayout>
  )
}
