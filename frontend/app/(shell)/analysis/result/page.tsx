import { Suspense } from 'react'
import type { Metadata } from 'next'
import AnalysisResultPage from '@/components/analysis/analysis-result-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '상권분석 결과',
  description: '선택한 상권과 업종 기준의 분석 결과를 확인합니다.',
  path: '/analysis/result',
  index: false,
})

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AnalysisResultPage />
    </Suspense>
  )
}
