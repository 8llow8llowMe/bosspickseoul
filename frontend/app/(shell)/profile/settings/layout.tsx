import ProfileSectionLayout from '@/components/profile/profile-section-layout'

/*
  회원 탈퇴는 탭에서 뺐다(#575, 결정 D-6). 회원 정보 화면 맨 아래 회색 링크로 들어간다 — 되돌릴 수 없는 동작을
  자주 쓰는 설정과 같은 급의 탭으로 두지 않는다. 주소(`/profile/settings/withdraw`)는 그대로다.
*/
const SETTINGS_TABS = [
  { label: '회원 정보', href: '/profile/settings/edit' },
  { label: '비밀번호 변경', href: '/profile/settings/change-password' },
  { label: '로그인 기기', href: '/profile/settings/sessions' },
] as const

type SettingsLayoutProps = {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <ProfileSectionLayout
      title="개인 정보 설정"
      description="계정 정보를 확인하고 관리합니다."
      tabs={SETTINGS_TABS}
    >
      {children}
    </ProfileSectionLayout>
  )
}
