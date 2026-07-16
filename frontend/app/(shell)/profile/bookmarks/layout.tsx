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
      description="저장한 상권 분석, 추천 지역, 창업 시뮬레이션 결과를 한 곳에서 확인합니다."
      tabs={tabs}
    >
      {children}
    </ProfileSectionLayout>
  )
}
