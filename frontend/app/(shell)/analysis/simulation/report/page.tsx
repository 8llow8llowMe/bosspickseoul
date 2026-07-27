import type { Metadata } from 'next'
import SimulationUnavailablePage from '@/components/simulation/simulation-unavailable-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '창업 시뮬레이션 리포트',
  description: '창업 시뮬레이션 리포트의 V2 API 계약 준비 상태를 안내합니다.',
  path: '/analysis/simulation/report',
  index: false,
})

export default function Page() {
  return <SimulationUnavailablePage kind="report" />
}
