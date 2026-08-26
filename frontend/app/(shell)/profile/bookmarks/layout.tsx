import ProfileSectionLayout from '@/components/profile/profile-section-layout'

const tabs = [
  { label: '지역·화면', href: '/profile/bookmarks/analysis' },
  { label: '상권', href: '/profile/bookmarks/recommend' },
  { label: '시뮬레이션', href: '/profile/bookmarks/simulation' },
] as const

type BookmarksLayoutProps = {
  children: React.ReactNode
}

export default function BookmarksLayout({ children }: BookmarksLayoutProps) {
  return (
    <ProfileSectionLayout
      title="북마크"
      description="V2 회원 북마크에 저장한 자치구·행정동·상권을 대상별로 확인합니다."
      tabs={tabs}
    >
      {children}
    </ProfileSectionLayout>
  )
}
