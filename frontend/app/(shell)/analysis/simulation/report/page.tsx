import { Suspense } from 'react'
import type { Metadata } from 'next'
import SimulationReportPage from '@/components/simulation/simulation-report-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '창업 시뮬레이션 리포트',
  description: '입력한 창업 조건 기준의 시뮬레이션 리포트를 확인합니다.',
  path: '/analysis/simulation/report',
  index: false,
})

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SimulationReportPage basePath="/analysis/simulation" />
    </Suspense>
  )
}
