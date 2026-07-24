'use client'

import styled from 'styled-components'

export type RecommendFeedbackProps = {
  tone: 'info' | 'error'
  title: string
  description?: string
  actionLabel?: string
  isActionDisabled?: boolean
  onAction?: () => void
}

const Feedback = styled.div<{ $tone: RecommendFeedbackProps['tone'] }>`
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid
    ${props =>
      props.$tone === 'error'
        ? 'var(--color-danger)'
        : 'var(--color-border-200)'};
  border-radius: var(--radius-card);
  background: ${props =>
    props.$tone === 'error'
      ? 'var(--color-surface)'
      : 'var(--color-surface-muted)'};
`

const Title = styled.p`
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
  line-height: 22px;
`

const Description = styled.p<{ $tone: RecommendFeedbackProps['tone'] }>`
  color: ${props =>
    props.$tone === 'error'
      ? 'var(--color-text-900)'
      : 'var(--color-text-600)'};
  font-size: 14px;
  line-height: 21px;
`

const ActionButton = styled.button`
  width: fit-content;
  min-height: 44px;
  margin-top: 4px;
  padding: 0 14px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

export default function RecommendFeedback({
  tone,
  title,
  description,
  actionLabel,
  isActionDisabled = false,
  onAction,
}: RecommendFeedbackProps) {
  return (
    <Feedback
      $tone={tone}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      data-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Title>{title}</Title>
      {description ? (
        <Description $tone={tone}>{description}</Description>
      ) : null}
      {actionLabel && onAction ? (
        <ActionButton
          disabled={isActionDisabled}
          type="button"
          onClick={onAction}
        >
          {actionLabel}
        </ActionButton>
      ) : null}
    </Feedback>
  )
}
