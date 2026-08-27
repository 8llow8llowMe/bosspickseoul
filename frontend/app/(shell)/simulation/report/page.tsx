import { Suspense } from 'react'
import type { Metadata } from 'next'
import SimulationReportPage from '@/components/simulation/report/simulation-report-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '창업 시뮬레이션 리포트',
  description: '계산한 창업 조건의 예상 비용과 상세 리포트를 보여줍니다.',
  path: '/simulation/report',
  index: false,
})

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SimulationReportPage />
    </Suspense>
  )
}
