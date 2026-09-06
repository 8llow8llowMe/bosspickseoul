'use client'

import styled from 'styled-components'

import AiReportBody from '@/components/analysis/ai-report-body'
import type { AnalysisSelection } from '@/lib/analysis/selection'
import { centeredColumn } from '@/styles/layout'

const Main = styled.main`
  min-height: calc(100dvh - 64px);
  background: var(--color-surface);
`

/*
  AI 리포트는 생성된 산문이라 읽기 화면이다. 넓히면 줄 길이가 길어져 나빠진다.
*/
const Content = styled.div`
  ${centeredColumn('var(--w-read)')}
  padding: 28px 0 56px;
  display: grid;
  gap: 24px;

  @media (max-width: 640px) {
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
