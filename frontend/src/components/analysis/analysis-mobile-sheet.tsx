'use client'

import { useId, useState, type PropsWithChildren, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import styled from 'styled-components'

export type AnalysisMobileSheetProps = PropsWithChildren<{
  stepLabel: string
  summary: string
  aiReportSlot?: ReactNode
}>

const Sheet = styled.section<{ $expanded: boolean }>`
  position: absolute;
  z-index: 20;
  right: 0;
  bottom: 0;
  left: 0;
  height: ${props =>
    props.$expanded
      ? 'min(72dvh, calc(100% - 180px))'
      : 'calc(72px + env(safe-area-inset-bottom))'};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-border-200);
  border-bottom: 0;
  border-radius: 22px 22px 0 0;
  background: var(--color-surface);
  box-shadow: var(--shadow-level-4);
  transition: height var(--motion-normal) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Handle = styled.button`
  width: 100%;
  min-height: 72px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  background: var(--color-surface);
  color: var(--color-text-900);
  padding: 10px 18px max(10px, env(safe-area-inset-bottom));
  text-align: left;
  cursor: pointer;

  &::before {
    position: absolute;
    top: 7px;
    left: 50%;
    width: 36px;
    height: 4px;
    border-radius: 999px;
    background: var(--color-border-300);
    content: '';
    transform: translateX(-50%);
  }
`

const HandleCopy = styled.span`
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 2px;

  strong {
    font-size: 14px;
    font-weight: 700;
  }

  small {
    overflow: hidden;
    color: var(--color-text-caption);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const Icon = styled.span`
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-600);

  svg {
    width: 20px;
    height: 20px;
  }
`

const AiSlot = styled.div`
  position: absolute;
  z-index: 21;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0 16px calc(72px + env(safe-area-inset-bottom) + 12px);
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
`

const Body = styled.div<{ $expanded: boolean }>`
  min-height: 0;
  flex: 1;
  display: ${props => (props.$expanded ? 'block' : 'none')};
  overflow: hidden;

  > section {
    height: 100%;
  }
`

export default function AnalysisMobileSheet({
  stepLabel,
  summary,
  aiReportSlot,
  children,
}: AnalysisMobileSheetProps) {
  const [expanded, setExpanded] = useState(false)
  const bodyId = useId()

  return (
    <>
      {aiReportSlot ? <AiSlot>{aiReportSlot}</AiSlot> : null}
      <Sheet $expanded={expanded}>
        <Handle
          type="button"
          aria-controls={bodyId}
          aria-expanded={expanded}
          aria-label={expanded ? '선택 패널 접기' : '선택 패널 펼치기'}
          onClick={() => setExpanded(value => !value)}
        >
          <HandleCopy>
            <strong>{stepLabel}</strong>
            <small>{summary}</small>
          </HandleCopy>
          <Icon aria-hidden>{expanded ? <ChevronDown /> : <ChevronUp />}</Icon>
        </Handle>
        <Body id={bodyId} $expanded={expanded} aria-hidden={!expanded}>
          {children}
        </Body>
      </Sheet>
    </>
  )
}
