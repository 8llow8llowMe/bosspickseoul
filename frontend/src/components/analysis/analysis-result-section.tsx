import type { ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import styled from 'styled-components'

import { Button } from '@/components/ui/button'
import EmptyState from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'

export type AnalysisResultSectionProps = {
  title: string
  description?: string
  loading: boolean
  error: boolean
  empty: boolean
  emptyDescription?: string
  onRetry?: () => void
  children?: ReactNode
}

const Section = styled.section`
  display: grid;
  gap: 18px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);
  padding: 22px;

  @media (max-width: 640px) {
    padding: 18px;
  }
`

const Header = styled.header`
  display: grid;
  gap: 5px;

  h2 {
    color: var(--color-text-900);
    font-size: 18px;
    font-weight: 750;
    line-height: 27px;
  }

  p {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
  }
`

const Loading = styled.div`
  display: grid;
  gap: 10px;
`

export default function AnalysisResultSection({
  title,
  description,
  loading,
  error,
  empty,
  emptyDescription = '이 조건에서 제공되는 데이터가 없어요.',
  onRetry,
  children,
}: AnalysisResultSectionProps) {
  return (
    <Section>
      <Header>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </Header>

      {loading ? (
        <Loading role="status" aria-label={`${title} 불러오는 중`}>
          <Skeleton $height="18px" $width="42%" />
          <Skeleton $height="96px" />
        </Loading>
      ) : error ? (
        <EmptyState
          title={`${title} 정보를 불러오지 못했어요`}
          description="잠시 후 다시 시도해 주세요."
          action={
            onRetry ? (
              <Button
                size="medium"
                variant="secondary"
                leftIcon={<RotateCcw />}
                onClick={onRetry}
              >
                다시 시도
              </Button>
            ) : undefined
          }
        />
      ) : empty ? (
        <EmptyState
          title={`${title} 데이터가 없어요`}
          description={emptyDescription}
        />
      ) : (
        children
      )}
    </Section>
  )
}
