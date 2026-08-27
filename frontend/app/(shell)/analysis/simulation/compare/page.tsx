import { Suspense } from 'react'
import type { Metadata } from 'next'
import SimulationComparePage from '@/components/simulation/compare/simulation-compare-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '창업 시뮬레이션 비교',
  description: '분석한 상권 조건으로 두 창업 조건의 초기 비용을 비교합니다.',
  path: '/analysis/simulation/compare',
  index: false,
})

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SimulationComparePage variant="analysis" />
    </Suspense>
  )
}
