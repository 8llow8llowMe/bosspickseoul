import { Suspense } from 'react'

import AnalysisResultModal from '@/components/analysis/analysis-result-modal'

export default function InterceptedAnalysisResultPage() {
  return (
    <Suspense fallback={null}>
      <AnalysisResultModal />
    </Suspense>
  )
}
