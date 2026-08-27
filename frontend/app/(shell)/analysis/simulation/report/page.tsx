import { Suspense } from 'react'
import type { Metadata } from 'next'
import SimulationReportPage from '@/components/simulation/report/simulation-report-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '창업 시뮬레이션 리포트',
  description: '분석한 상권 조건의 예상 창업 비용 리포트를 보여줍니다.',
  path: '/analysis/simulation/report',
  index: false,
})

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SimulationReportPage variant="analysis" />
    </Suspense>
  )
}
