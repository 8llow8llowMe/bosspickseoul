'use client'

import styled from 'styled-components'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isRetryable, type NormalizedApiError } from '@/lib/api/api-error'

type LoadingFeedbackProps = {
  state: 'loading'
  message?: string
}

type EmptyFeedbackProps = {
  state: 'empty'
  title?: string
  description?: string
}

type ErrorFeedbackProps = {
  state: 'error'
  title?: string
  /**
   * 정규화된 API 오류(`resolveApiError(query)`).
   * `kind === 'not-found'`면 데이터 부재이므로 재시도 버튼 없이 서버 문구만 노출한다.
   * null이면 종류를 모르는 실패로 보고 기존 UX(재시도 노출)를 유지한다.
   */
  error: NormalizedApiError | null
  onRetry: () => void
}

export type StatusFeedbackProps =
  | LoadingFeedbackProps
  | EmptyFeedbackProps
  | ErrorFeedbackProps

const FeedbackCard = styled.section`
  min-height: 240px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 12px;
  padding: 32px 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);
  text-align: center;
`

const LoadingLayout = styled.div`
  width: min(100%, 560px);
  display: grid;
  gap: 16px;
`

const LoadingColumns = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 18px;
  font-weight: 700;
  line-height: 26px;
`

const Description = styled.p`
  max-width: 420px;
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
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

export default function StatusFeedback(props: StatusFeedbackProps) {
  if (props.state === 'loading') {
    return (
      <FeedbackCard aria-busy="true" aria-live="polite">
        <VisuallyHidden>
          {props.message ?? '서울 자치구 상권 현황을 불러오는 중입니다.'}
        </VisuallyHidden>
        <LoadingLayout aria-hidden="true">
          <Skeleton $height="28px" $width="44%" />
          <Skeleton $height="18px" $width="72%" />
          <LoadingColumns>
            <Skeleton $height="128px" />
            <Skeleton $height="128px" />
          </LoadingColumns>
        </LoadingLayout>
      </FeedbackCard>
    )
  }

  if (props.state === 'empty') {
    return (
      <FeedbackCard aria-live="polite">
        <Title>{props.title ?? '표시할 상권 현황이 없어요'}</Title>
        <Description>
          {props.description ?? '조회할 수 있는 자치구 데이터가 아직 없습니다.'}
        </Description>
      </FeedbackCard>
    )
  }

  const { error } = props
  const isNotFound = error?.kind === 'not-found'

  return (
    // not-found 는 실패가 아니라 데이터 부재라 의미가 `empty` 분기에 가깝다.
    // assertive 로 두면 스크린리더 발화를 가로채므로 polite 로 낮춘다.
    <FeedbackCard aria-live={isNotFound ? 'polite' : 'assertive'}>
      <Title>
        {props.title ??
          (isNotFound
            ? '표시할 상권 현황이 없어요'
            : '상권 현황을 불러오지 못했어요')}
      </Title>
      <Description>
        {error?.message ?? '잠시 후 다시 시도해 주세요.'}
      </Description>
      {!error || isRetryable(error.kind) ? (
        <Button
          size="large"
          type="button"
          variant="dark"
          onClick={props.onRetry}
        >
          다시 시도
        </Button>
      ) : null}
    </FeedbackCard>
  )
}
