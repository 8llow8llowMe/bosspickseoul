'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'

import AiReportPageView from '@/components/analysis/ai-report-page-view'
import { parseAnalysisSelection } from '@/lib/analysis/selection'

export default function AiReportPage() {
  const searchParams = useSearchParams()
  const selection = useMemo(
    () => parseAnalysisSelection(searchParams),
    [searchParams],
  )
  return <AiReportPageView selection={selection} />
}
