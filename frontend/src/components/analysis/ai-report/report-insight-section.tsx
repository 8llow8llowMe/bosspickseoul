'use client'

import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  Check,
  Clock,
  CircleSlash,
  Lightbulb,
  ListChecks,
  Store,
  UserRound,
  Users,
} from 'lucide-react'
import styled, { keyframes } from 'styled-components'

import AiReportLockCard from '@/components/analysis/ai-report/ai-report-lock-card'
import { RegionReportBlocks } from '@/components/analysis/ai-report/report-blocks'
import { Button } from '@/components/ui/button'
import type { AiReportState } from '@/hooks/use-ai-report'
import { useProgressRotation } from '@/hooks/use-progress-rotation'
import type { ReportBlockList } from '@/lib/analysis/ai-report-presentation'
import type { InsightMode } from '@/lib/analysis/report-section-state'

const spin = keyframes`
  to {
    transform: rotate(360deg);
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

const LoadingWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 24px 0 16px;
`

const Spinner = styled.div`
  width: 30px;
  height: 30px;
  margin-bottom: 8px;
  border: 3px solid var(--color-border-200);
  border-top-color: var(--color-primary-700);
  border-radius: var(--radius-pill);
  animation: ${spin} 0.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const HeadlineBlock = styled.section`
  display: grid;
  gap: 10px;
  padding: 0 0 16px;
`

const Summary = styled.p`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
`

const Insight = styled.p`
  padding-left: 15px;
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
`

type AccentTone = 'success' | 'warning'

const toneVar = (tone: AccentTone) =>
  tone === 'success' ? 'var(--color-success)' : 'var(--color-warning)'

const AccentGrid = styled.div<{ $variant: 'full' | 'compact' }>`
  display: grid;
  grid-template-columns: ${props =>
    props.$variant === 'compact' ? '1fr' : 'repeat(2, minmax(0, 1fr))'};
  gap: 12px;
  margin: 0 0 16px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const AccentBlock = styled.section<{ $tone: AccentTone }>`
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid ${props => toneVar(props.$tone)};
  border-radius: var(--radius-control);
  background: color-mix(
    in srgb,
    ${props => toneVar(props.$tone)} 8%,
    var(--color-surface)
  );
`

const AccentTitle = styled.h4<{ $tone: AccentTone }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${props => toneVar(props.$tone)};

  svg {
    flex-shrink: 0;
  }
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

const ActionGrid = styled.div<{ $variant: 'full' | 'compact' }>`
  display: grid;
  grid-template-columns: ${props =>
    props.$variant === 'compact' ? '1fr' : 'repeat(2, minmax(0, 1fr))'};
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const ActionCard = styled.section`
  display: grid;
  gap: 8px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  padding: 12px;
`

const ActionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const ActionIcon = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  color: var(--color-text-600);
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

const ACTION_ICONS: Record<string, LucideIcon> = {
  '추천 업종군': Store,
  '추천 고객층': Users,
  '추천 운영 시간': Clock,
  '피해야 할 시간': CircleSlash,
  '타깃 연령': UserRound,
  '타깃 성별': Users,
  '운영 팁': Lightbulb,
}

function ActionBlock({ block }: { block: ReportBlockList }) {
  const Icon = ACTION_ICONS[block.title] ?? ListChecks
  return (
    <ActionCard>
      <ActionHeader>
        <ActionIcon>
          <Icon size={16} aria-hidden />
        </ActionIcon>
        <ActionTitle>{block.title}</ActionTitle>
      </ActionHeader>
      <Chips>
        {block.items.map(item => (
          <Chip key={item}>{item}</Chip>
        ))}
      </Chips>
    </ActionCard>
  )
}

function LoadingStage({ state }: { state: AiReportState }) {
  const stage = state.status === 'loading' ? state.stage : null
  const progressMessages =
    state.status === 'loading' ? state.progressMessages : []
  const rotating = useProgressRotation(progressMessages, 4000)
  return (
    <LoadingWrap
      role="status"
      aria-live="polite"
      aria-label="AI 리포트 생성 중"
    >
      <Spinner aria-hidden />
      <StatusText>{stage?.name ?? 'AI 리포트를 생성하고 있어요…'}</StatusText>
      {rotating ? <StageDesc>{rotating}</StageDesc> : null}
    </LoadingWrap>
  )
}

function ReadyView({
  state,
  variant,
}: {
  state: AiReportState
  variant: 'full' | 'compact'
}) {
  if (state.status === 'ready-region') {
    return <RegionReportBlocks view={state.view} />
  }
  if (state.status !== 'ready-commercial') return null
  const { view } = state
  const hasAccents = view.strengths.length > 0 || view.risks.length > 0
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
      {hasAccents ? (
        <AccentGrid $variant={variant}>
          {view.strengths.length > 0 ? (
            <AccentBlock $tone="success">
              <AccentTitle $tone="success">
                <Check size={14} aria-hidden />
                강점
              </AccentTitle>
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
              <AccentTitle $tone="warning">
                <AlertTriangle size={14} aria-hidden />
                주의
              </AccentTitle>
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
        </AccentGrid>
      ) : null}
      {view.actions.length > 0 ? (
        <ActionGrid $variant={variant}>
          {view.actions.map(block => (
            <ActionBlock key={block.title} block={block} />
          ))}
        </ActionGrid>
      ) : null}
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
  variant = 'full',
}: {
  mode: InsightMode
  state: AiReportState
  loginHref: string
  onRetry: () => void
  variant?: 'full' | 'compact'
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
    return <ReadyView state={state} variant={variant} />
  }
  return <LoadingStage state={state} />
}
