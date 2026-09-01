import { Suspense } from 'react'
import type { Metadata } from 'next'

import RecommendComparePage from '@/components/recommend/compare/recommend-compare-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '상권 비교',
  description: '추천받은 상권들의 점수와 지표를 나란히 비교합니다.',
  path: '/recommend/compare',
  index: false,
})

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RecommendComparePage />
    </Suspense>
  )
}
