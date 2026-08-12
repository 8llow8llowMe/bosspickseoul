import { Suspense } from 'react'
import type { Metadata } from 'next'
import AiReportPage from '@/components/analysis/ai-report-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'AI 상권 리포트',
  description:
    '선택한 상권·업종의 핵심 지표와 AI 리포트를 한 화면에서 확인합니다.',
  path: '/analysis/report',
  index: false,
})

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AiReportPage />
    </Suspense>
  )
}
