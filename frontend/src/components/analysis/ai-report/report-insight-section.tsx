'use client'

import { AlertTriangle, Check } from 'lucide-react'
import styled, { keyframes } from 'styled-components'

import AiReportLockCard from '@/components/analysis/ai-report/ai-report-lock-card'
import { Button } from '@/components/ui/button'
import type { AiReportState } from '@/hooks/use-ai-report'
import { useProgressRotation } from '@/hooks/use-progress-rotation'
import type { ReportBlockList } from '@/lib/analysis/ai-report-presentation'
import type { InsightMode } from '@/lib/analysis/report-section-state'

const shimmer = keyframes`
  0% {
    opacity: 0.6;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.6;
  }
`

const StatusText = styled.p`
  padding: 12px 0;
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 21px;
  text-align: center;
`

const StageDesc = styled.p`
  padding: 2px 0;
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
  text-align: center;
`

const SkeletonStack = styled.div`
  display: grid;
  gap: 8px;
  padding: 16px 0;
`

const Skeleton = styled.div<{ $width?: string }>`
  width: ${props => props.$width ?? '100%'};
  height: 16px;
  border-radius: var(--radius-compact);
  background: var(--color-border-300);
  animation: ${shimmer} 1.2s var(--ease-standard) infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const HeadlineBlock = styled.section`
  display: grid;
  gap: 8px;
  padding: 0 0 16px;
`

const Summary = styled.p`
  font-size: 15px;
  line-height: 22px;
  color: var(--color-text-900);
`

const Insight = styled.p`
  font-size: 13px;
  line-height: 20px;
  color: var(--color-text-600);
`

type AccentTone = 'success' | 'warning'

const toneVar = (tone: AccentTone) =>
  tone === 'success' ? 'var(--color-success)' : 'var(--color-warning)'

const AccentBlock = styled.section<{ $tone: AccentTone }>`
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  margin: 0 0 12px;
  border: 1px solid ${props => toneVar(props.$tone)};
  border-radius: var(--radius-control);
  background: color-mix(
    in srgb,
    ${props => toneVar(props.$tone)} 8%,
    var(--color-surface)
  );
`

const AccentTitle = styled.h4<{ $tone: AccentTone }>`
  font-size: 13px;
  font-weight: 700;
  color: ${props => toneVar(props.$tone)};
`

const AccentList = styled.ul`
  display: grid;
  gap: 6px;
`

const AccentItem = styled.li<{ $tone: AccentTone }>`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  color: var(--color-text-900);
  font-size: 13px;
  line-height: 20px;

  svg {
    flex-shrink: 0;
    margin-top: 3px;
    color: ${props => toneVar(props.$tone)};
  }
`

const ActionSection = styled.section`
  display: grid;
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid var(--color-border-200);

  &:first-of-type {
    border-top: none;
  }
`

const ActionTitle = styled.h4`
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-700);
`

const Chips = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Chip = styled.li`
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  color: var(--color-text-700);
  font-size: 12px;
`

const ErrorWrap = styled.div`
  display: grid;
  gap: 12px;
  padding: 12px 0;
  text-align: center;
`

function ActionBlock({ block }: { block: ReportBlockList }) {
  return (
    <ActionSection>
      <ActionTitle>{block.title}</ActionTitle>
      <Chips>
        {block.items.map(item => (
          <Chip key={item}>{item}</Chip>
        ))}
      </Chips>
    </ActionSection>
  )
}

function LoadingStage({ state }: { state: AiReportState }) {
  const stage = state.status === 'loading' ? state.stage : null
  const progressMessages =
    state.status === 'loading' ? state.progressMessages : []
  const rotating = useProgressRotation(progressMessages, 4000)
  return (
    <div aria-live="polite">
      <StatusText>{stage?.name ?? 'AI가 리포트를 생성하고 있어요…'}</StatusText>
      {stage?.description ? <StageDesc>{stage.description}</StageDesc> : null}
      {rotating ? <StageDesc>{rotating}</StageDesc> : null}
      <SkeletonStack aria-hidden>
        <Skeleton $width="80%" />
        <Skeleton $width="100%" />
        <Skeleton $width="60%" />
      </SkeletonStack>
    </div>
  )
}

function ReadyView({ state }: { state: AiReportState }) {
  if (state.status !== 'ready-commercial') return null
  const { view } = state
  return (
    <div>
      <HeadlineBlock>
        {view.headline.summary ? (
          <Summary>{view.headline.summary}</Summary>
        ) : null}
        {view.headline.insight ? (
          <Insight>{view.headline.insight}</Insight>
        ) : null}
      </HeadlineBlock>
      {view.strengths.length > 0 ? (
        <AccentBlock $tone="success">
          <AccentTitle $tone="success">강점</AccentTitle>
          <AccentList>
            {view.strengths.map(item => (
              <AccentItem key={item} $tone="success">
                <Check size={14} aria-hidden />
                <span>{item}</span>
              </AccentItem>
            ))}
          </AccentList>
        </AccentBlock>
      ) : null}
      {view.risks.length > 0 ? (
        <AccentBlock $tone="warning">
          <AccentTitle $tone="warning">주의</AccentTitle>
          <AccentList>
            {view.risks.map(item => (
              <AccentItem key={item} $tone="warning">
                <AlertTriangle size={14} aria-hidden />
                <span>{item}</span>
              </AccentItem>
            ))}
          </AccentList>
        </AccentBlock>
      ) : null}
      {view.actions.map(block => (
        <ActionBlock key={block.title} block={block} />
      ))}
    </div>
  )
}

function ErrorView({
  state,
  onRetry,
}: {
  state: AiReportState
  onRetry: () => void
}) {
  if (state.status !== 'error') return null
  return (
    <ErrorWrap>
      <StatusText>{state.message}</StatusText>
      {state.canRetry ? (
        <Button type="button" onClick={onRetry}>
          다시 시도
        </Button>
      ) : null}
    </ErrorWrap>
  )
}

export default function ReportInsightSection({
  mode,
  state,
  loginHref,
  onRetry,
}: {
  mode: InsightMode
  state: AiReportState
  loginHref: string
  onRetry: () => void
}) {
  if (mode === 'locked') {
    return <AiReportLockCard level="commercial" loginHref={loginHref} />
  }
  if (mode === 'empty') {
    return <StatusText>표시할 내용이 없어요.</StatusText>
  }
  if (mode === 'error') {
    return <ErrorView state={state} onRetry={onRetry} />
  }
  if (mode === 'ready') {
    return <ReadyView state={state} />
  }
  return <LoadingStage state={state} />
}
