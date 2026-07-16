import type { Metadata } from 'next'
import RecommendPage from '@/components/recommend/recommend-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '상권 추천',
  description:
    '자치구와 행정동 기준으로 추천 상권을 비교하고, 관심 지역을 저장할 수 있습니다.',
  path: '/recommend',
  index: false,
})

export default function Page() {
  return <RecommendPage />
}
