import type { Metadata } from 'next'
import RecommendPage from '@/components/recommend/recommend-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '상권 추천',
  description:
    '자치구·행정동·업종을 선택하고 행정동 안의 추천 상권 Top 5를 지도에서 비교합니다.',
  path: '/recommend',
  index: false,
})

export default function Page() {
  return <RecommendPage />
}
