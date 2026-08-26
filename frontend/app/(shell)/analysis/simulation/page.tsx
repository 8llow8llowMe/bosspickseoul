import { Suspense } from 'react'
import type { Metadata } from 'next'
import SimulationWizardPage from '@/components/simulation/simulation-wizard-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '창업 시뮬레이션',
  description: '분석한 상권 조건으로 예상 창업 비용을 계산합니다.',
  path: '/analysis/simulation',
  index: false,
})

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SimulationWizardPage variant="analysis" />
    </Suspense>
  )
}
