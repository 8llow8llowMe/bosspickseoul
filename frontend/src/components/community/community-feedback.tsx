'use client'

import styled from 'styled-components'

export type CommunityFeedbackProps = {
  kind: 'loading' | 'error' | 'empty'
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

const FeedbackCard = styled.section`
  min-height: 220px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 12px;
  padding: 32px 24px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);
  text-align: center;

  @media (max-width: 640px) {
    min-height: 196px;
    padding: 24px 18px;
  }
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.45;
`

const Description = styled.p`
  max-width: 480px;
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 1.65;
  word-break: keep-all;
`

const ActionButton = styled.button`
  min-height: 48px;
  margin-top: 4px;
  padding: 0 18px;
  border: 1px solid var(--color-primary-700);
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: var(--color-surface);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

const SkeletonList = styled.ul`
  width: min(100%, 560px);
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const SkeletonRow = styled.li`
  height: 64px;
  overflow: hidden;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);

  &::after {
    content: '';
    display: block;
    width: 42%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      var(--color-border-200),
      transparent
    );
  }
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
`

const defaults = {
  error: {
    title: '커뮤니티를 불러오지 못했어요',
    description: '잠시 후 다시 시도해 주세요.',
    actionLabel: '다시 시도',
  },
  empty: {
    title: '아직 등록된 이야기가 없어요',
    description: '사장님들과 나누고 싶은 첫 번째 이야기를 남겨 보세요.',
    actionLabel: '글쓰기',
  },
} as const

export default function CommunityFeedback({
  kind,
  title,
  description,
  actionLabel,
  onAction,
}: CommunityFeedbackProps) {
  if (kind === 'loading') {
    return (
      <FeedbackCard aria-busy="true" aria-live="polite">
        <VisuallyHidden>
          {[title, description ?? '커뮤니티를 불러오는 중이에요.']
            .filter(Boolean)
            .join(' ')}
        </VisuallyHidden>
        <SkeletonList aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonRow data-community-skeleton-row="true" key={index} />
          ))}
        </SkeletonList>
      </FeedbackCard>
    )
  }

  const copy = defaults[kind]

  return (
    <FeedbackCard
      aria-live={kind === 'error' ? 'assertive' : 'polite'}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      <Title>{title ?? copy.title}</Title>
      <Description>{description ?? copy.description}</Description>
      {onAction ? (
        <ActionButton type="button" onClick={onAction}>
          {actionLabel ?? copy.actionLabel}
        </ActionButton>
      ) : null}
    </FeedbackCard>
  )
}
