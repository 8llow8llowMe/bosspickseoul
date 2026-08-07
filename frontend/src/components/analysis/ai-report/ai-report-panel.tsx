import { X } from 'lucide-react'
import styled from 'styled-components'

import {
  CommercialReportBlocks,
  RegionReportBlocks,
} from '@/components/analysis/ai-report/report-blocks'
import { Button } from '@/components/ui/button'
import type { AiReportState } from '@/hooks/use-ai-report'

const Shell = styled.aside`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-surface);
`

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-200);
`

const Title = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-900);
`

const CloseButton = styled.button`
  display: inline-flex;
  padding: 6px;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-600);
  cursor: pointer;
`

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 20px 20px;
`

const StatusText = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 21px;
  text-align: center;
`

const Footer = styled.footer`
  padding: 12px 20px;
  border-top: 1px solid var(--color-border-200);
`

function Content({
  state,
  onRetry,
}: {
  state: AiReportState
  onRetry: () => void
}) {
  switch (state.status) {
    case 'loading':
      return <StatusText>리포트를 생성하고 있어요…</StatusText>
    case 'empty':
      return <StatusText>표시할 내용이 없어요.</StatusText>
    case 'error':
      return (
        <div>
          <StatusText>{state.message}</StatusText>
          <Button type="button" onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      )
    case 'ready-commercial':
      return <CommercialReportBlocks view={state.view} />
    case 'ready-region':
      return <RegionReportBlocks view={state.view} />
    default:
      return null
  }
}

export default function AiReportPanel({
  targetName,
  state,
  onClose,
  onRetry,
  onViewFullAnalysis,
}: {
  targetName: string
  state: AiReportState
  onClose: () => void
  onRetry: () => void
  onViewFullAnalysis?: () => void
}) {
  return (
    <Shell aria-label={`${targetName} AI 리포트`}>
      <Header>
        <Title>{targetName} AI 리포트</Title>
        <CloseButton type="button" aria-label="닫기" onClick={onClose}>
          <X size={18} aria-hidden />
        </CloseButton>
      </Header>
      <Body>
        <Content state={state} onRetry={onRetry} />
      </Body>
      {onViewFullAnalysis ? (
        <Footer>
          <Button type="button" onClick={onViewFullAnalysis}>
            전체 분석 보기
          </Button>
        </Footer>
      ) : null}
    </Shell>
  )
}
