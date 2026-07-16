import type { Metadata } from 'next'
import RequireAuth from '@/components/auth/require-auth'
import SimulationComparePage from '@/components/simulation/simulation-compare-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '창업 시뮬레이션 비교',
  description: '저장한 창업 시뮬레이션 결과를 나란히 비교합니다.',
  path: '/simulation/compare',
  index: false,
})

export default function Page() {
  return (
    <RequireAuth>
      <SimulationComparePage basePath="/simulation" />
    </RequireAuth>
  )
}
