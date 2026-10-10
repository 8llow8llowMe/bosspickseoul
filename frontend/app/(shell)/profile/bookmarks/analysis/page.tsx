import type { Metadata } from 'next'
import { Suspense } from 'react'
import ProfileAnalysisBookmarksPage from '@/components/profile/profile-analysis-bookmarks-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '지역 북마크·화면 보관함',
  description:
    '저장한 자치구·행정동과, 조건까지 포함해 보관한 분석 화면을 확인합니다.',
  path: '/profile/bookmarks/analysis',
  index: false,
})

/*
  안쪽 탭을 `?tab=` 에서 읽는다(useSearchParams, #606). 정적 생성 중에는 쿼리를 모르므로 Suspense 경계가 있어야
  빌드가 이 페이지 전체를 클라이언트 렌더로 내리지 않는다.
*/
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProfileAnalysisBookmarksPage />
    </Suspense>
  )
}
