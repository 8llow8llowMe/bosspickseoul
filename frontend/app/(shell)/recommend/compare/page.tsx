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

/**
 * `useSearchParams` 는 Suspense 경계 없이는 정적 렌더에서 빌드가 깨진다.
 * 폴백이 `null` 이면 콜드 로드에서 화면이 통째로 빈 채 뜬다 — `/recommend` 처럼
 * 이름 붙은 셸을 둬서 보조기기에도 무엇을 기다리는지 말해 준다.
 */
export default function Page() {
  return (
    <Suspense fallback={<main aria-label="상권 비교 준비 중" />}>
      <RecommendComparePage />
    </Suspense>
  )
}
