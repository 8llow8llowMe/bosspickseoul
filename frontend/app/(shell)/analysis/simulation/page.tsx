import { Suspense } from 'react'
import type { Metadata } from 'next'
import SimulationFormPage from '@/components/simulation/simulation-form-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '창업 시뮬레이션',
  description: '창업 조건을 입력해 예상 비용 시뮬레이션을 생성합니다.',
  path: '/analysis/simulation',
  index: false,
})

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SimulationFormPage reportBasePath="/analysis/simulation" />
    </Suspense>
  )
}
