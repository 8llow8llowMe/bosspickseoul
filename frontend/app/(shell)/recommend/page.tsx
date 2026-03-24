import type { Metadata } from 'next'
import RecommendPage from '@/components/recommend/recommend-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '상권 추천',
  description:
    '자치구와 행정동을 기준으로 추천 상권을 조회하고 저장하는 NowDoBoss 추천 페이지입니다.',
  path: '/recommend',
  index: false,
})

export default function Page() {
  return <RecommendPage />
}
