import ProfileSectionLayout from '@/components/profile/profile-section-layout'

const tabs = [
  { label: '상권분석', href: '/profile/bookmarks/analysis' },
  { label: '상권추천', href: '/profile/bookmarks/recommend' },
  { label: '창업시뮬레이션', href: '/profile/bookmarks/simulation' },
] as const

type BookmarksLayoutProps = {
  children: React.ReactNode
}

export default function BookmarksLayout({ children }: BookmarksLayoutProps) {
  return (
    <ProfileSectionLayout
      title="북마크"
      description="레거시 계정에 저장된 상권 분석과 시뮬레이션 목록을 Next 기반 프로필 화면에서 확인합니다."
      tabs={tabs}
    >
      {children}
    </ProfileSectionLayout>
  )
}
