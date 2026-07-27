import { Suspense } from 'react'
import type { Metadata } from 'next'
import AnalysisPage from '@/components/analysis/analysis-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '상권분석',
  description: '서울 상권과 업종을 선택해 상권 데이터를 분석합니다.',
  path: '/analysis',
  index: false,
})

export default function Page() {
  return (
    <Suspense
      fallback={
        <main
          data-hide-footer="true"
          aria-label="상권 분석 화면 준비 중"
          role="status"
        />
      }
    >
      <AnalysisPage />
    </Suspense>
  )
}
