import { Suspense } from 'react'
import type { Metadata } from 'next'
import SimulationFormPage from '@/components/simulation/simulation-form-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '창업 시뮬레이션',
  description: '창업 조건을 입력해 예상 비용과 운영 흐름을 시뮬레이션합니다.',
  path: '/simulation',
  index: false,
})

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SimulationFormPage reportBasePath="/simulation" />
    </Suspense>
  )
}
