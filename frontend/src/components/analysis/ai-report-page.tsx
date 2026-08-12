'use client'

import { useSearchParams } from 'next/navigation'
import { parseAnalysisSelection } from '@/lib/analysis/selection'

export default function AiReportPage() {
  const searchParams = useSearchParams()
  const selection = parseAnalysisSelection(searchParams)
  // Task 9에서 <AiReportPageView selection={selection} /> 로 교체
  return (
    <main
      data-hide-footer="true"
      data-selection={selection.commercialCode ?? ''}
    />
  )
}
