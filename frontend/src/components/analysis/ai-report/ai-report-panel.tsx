import { X } from 'lucide-react'
import Link from 'next/link'
import styled from 'styled-components'

import {
  CommercialReportBlocks,
  RegionReportBlocks,
} from '@/components/analysis/ai-report/report-blocks'
import { Button } from '@/components/ui/button'
import type { AiReportStage, AiReportState } from '@/hooks/use-ai-report'
import { useProgressRotation } from '@/hooks/use-progress-rotation'

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
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-200);
`

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const Title = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-900);
`

/** 상권 레벨일 때만 상위(analysis-page.tsx)가 createAiReportHref로 만들어 내려주는
 * 전용 AI 리포트 페이지 진입 CTA. */
const ReportLink = styled(Link)`
  align-self: flex-start;
  color: var(--color-primary-700);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    outline: none;
  }
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

const RemainingSelectionHint = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
  text-align: center;
`

function LoadingBody({
  stage,
  progressMessages,
}: {
  stage: AiReportStage | null
  progressMessages: string[]
}) {
  const rotating = useProgressRotation(progressMessages, 4000)
  return (
    <div>
      <StatusText>{stage?.name ?? '리포트를 생성하고 있어요…'}</StatusText>
      {stage?.description ? <StatusText>{stage.description}</StatusText> : null}
      {rotating ? <StatusText aria-live="polite">{rotating}</StatusText> : null}
    </div>
  )
}

function Content({
  state,
  onRetry,
}: {
  state: AiReportState
  onRetry: () => void
}) {
  switch (state.status) {
    case 'loading':
      return (
        <LoadingBody
          stage={state.stage}
          progressMessages={state.progressMessages}
        />
      )
    case 'empty':
      return <StatusText>표시할 내용이 없어요.</StatusText>
    case 'error':
      return (
        <div>
          <StatusText>{state.message}</StatusText>
          {state.canRetry ? (
            <Button type="button" onClick={onRetry}>
              {state.errorKind === 'not-found' ? '다시 요청하기' : '다시 시도'}
            </Button>
          ) : null}
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
  aiReportHref,
}: {
  targetName: string
  state: AiReportState
  onClose: () => void
  onRetry: () => void
  onViewFullAnalysis?: () => void
  aiReportHref?: string
}) {
  return (
    <Shell aria-label={`${targetName} AI 리포트`}>
      <Header>
        <HeaderText>
          <Title>{targetName} AI 리포트</Title>
          {aiReportHref ? (
            <ReportLink href={aiReportHref}>AI 리포트 보기</ReportLink>
          ) : null}
        </HeaderText>
        <CloseButton type="button" aria-label="닫기" onClick={onClose}>
          <X size={18} aria-hidden />
        </CloseButton>
      </Header>
      <Body>
        <Content state={state} onRetry={onRetry} />
      </Body>
      <Footer>
        {onViewFullAnalysis ? (
          <Button type="button" onClick={onViewFullAnalysis}>
            전체 분석 보기
          </Button>
        ) : (
          <RemainingSelectionHint>
            분야까지 선택하면 전체 분석을 볼 수 있어요
          </RemainingSelectionHint>
        )}
      </Footer>
    </Shell>
  )
}
