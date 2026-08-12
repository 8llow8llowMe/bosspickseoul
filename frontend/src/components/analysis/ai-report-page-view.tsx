'use client'

import styled from 'styled-components'

import AiReportBody from '@/components/analysis/ai-report-body'
import type { AnalysisSelection } from '@/lib/analysis/selection'

const Main = styled.main`
  min-height: calc(100dvh - 64px);
  background: var(--color-surface);
`

const Content = styled.div`
  width: min(1080px, calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0 56px;
  display: grid;
  gap: 24px;

  @media (max-width: 640px) {
    width: min(100% - 28px, 1080px);
    padding: 20px 0 max(36px, env(safe-area-inset-bottom));
  }
`

export default function AiReportPageView({
  selection,
}: {
  selection: AnalysisSelection
}) {
  return (
    <Main data-hide-footer="true">
      <Content>
        <AiReportBody selection={selection} variant="full" />
      </Content>
    </Main>
  )
}
