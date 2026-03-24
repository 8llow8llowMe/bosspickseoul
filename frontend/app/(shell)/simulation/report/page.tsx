import { Suspense } from 'react'
import type { Metadata } from 'next'
import SimulationReportPage from '@/components/simulation/simulation-report-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '창업 시뮬레이션 리포트',
  description: '창업 시뮬레이션 리포트를 확인합니다.',
  path: '/simulation/report',
  index: false,
})

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SimulationReportPage basePath="/simulation" />
    </Suspense>
  )
}
