'use client'

import type { ReactNode } from 'react'
import styled from 'styled-components'

export type EmptyStateProps = {
  action?: ReactNode
  description: ReactNode
  title?: ReactNode
  /** 제목 요소 레벨. 화면의 주 제목이면 'h1'. 기본은 목록 속 빈 상태용 h3. */
  titleAs?: 'h1' | 'h2' | 'h3'
}

const Root = styled.div`
  display: grid;
  justify-items: center;
  gap: 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 32px 20px;
  text-align: center;
`

const Title = styled.h3`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
`

const Description = styled.p`
  max-width: 320px;
  color: var(--color-text-700);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

const Action = styled.div`
  margin-top: 4px;
`

export default function EmptyState({
  action,
  description,
  title,
  titleAs = 'h3',
}: EmptyStateProps) {
  return (
    <Root>
      {title ? <Title as={titleAs}>{title}</Title> : null}
      <Description>{description}</Description>
      {action ? <Action>{action}</Action> : null}
    </Root>
  )
}
