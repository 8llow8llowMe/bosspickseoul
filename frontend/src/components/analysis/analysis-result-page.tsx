'use client'

import type { PropsWithChildren } from 'react'
import styled from 'styled-components'

import AnalysisResultView from '@/components/analysis/analysis-result-view'

const Page = styled.main`
  min-height: calc(100dvh - 64px);
  background: var(--color-surface-muted);
`

export function AnalysisResultPageSurface({ children }: PropsWithChildren) {
  return <Page data-hide-footer="true">{children}</Page>
}

export default function AnalysisResultPage() {
  return (
    <AnalysisResultPageSurface>
      <AnalysisResultView />
    </AnalysisResultPageSurface>
  )
}
