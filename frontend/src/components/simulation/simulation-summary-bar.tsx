'use client'

import { ArrowRight, Calculator } from 'lucide-react'
import styled from 'styled-components'

import { Button, ButtonLink } from '@/components/ui/button'
import { formatLargeWon } from '@/lib/format'

export type SimulationSummaryBarProps = {
  /** 계산이 끝났으면 만원 단위 총비용. 아직이면 null. */
  totalPrice: number | null
  /** 상세 리포트 경로. 결과가 있어도 조건이 URL로 못 옮겨지면 null일 수 있다. */
  reportHref: string | null
  /** 남은 조건 한 줄. 완료면 null. */
  gap: string | null
  isPending: boolean
  onCalculate: () => void
  /** 결과 패널로 데려간다. 결과가 있을 때만 쓰인다. */
  onViewResult: () => void
}

/* 모바일·태블릿 전용. 데스크탑은 오른쪽 sticky 결과 패널이 같은 역할을 한다. */
const Root = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--color-border-200);
  background: var(--color-surface);
  padding: 12px 16px max(12px, env(safe-area-inset-bottom));
  box-shadow: var(--shadow-level-3);

  @media (min-width: 1024px) {
    display: none;
  }
`

const Copy = styled.div`
  min-width: 0;
  display: grid;
  gap: 2px;

  span {
    overflow: hidden;
    color: var(--color-text-caption);
    font-size: 12px;
    line-height: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    overflow: hidden;
    color: var(--color-text-900);
    font-size: 18px;
    font-weight: 700;
    line-height: 26px;
    font-variant-numeric: tabular-nums;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

/* 계산 전에는 금액이 없으므로 남은 조건 한 줄만 둔다 — 빈 금액 자리를 만들지 않는다. */
const Pending = styled.p`
  min-width: 0;
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  word-break: keep-all;
`

const Action = styled.div`
  flex: 0 0 auto;
`

/**
 * 모바일 하단 sticky 요약 바.
 *
 * 계산 **전**에는 남은 조건 + `계산하기`, 계산 **후**에는 총비용 + `자세히`(상세 리포트로
 * 가는 링크)다. 모바일에서는 결과가 입력 4섹션 아래에 오므로, 이 바가 없으면 계산 버튼과
 * 금액이 둘 다 화면 밖에 있게 된다.
 */
export default function SimulationSummaryBar({
  totalPrice,
  reportHref,
  gap,
  isPending,
  onCalculate,
  onViewResult,
}: SimulationSummaryBarProps) {
  const calculated = totalPrice !== null

  return (
    <Root aria-label="시뮬레이션 요약">
      {calculated ? (
        <Copy>
          <span>예상 총 창업 비용</span>
          <strong>{formatLargeWon(totalPrice)}</strong>
        </Copy>
      ) : (
        <Pending>{gap ?? '조건을 다 골랐어요. 계산해 보세요'}</Pending>
      )}
      <Action>
        {calculated && reportHref ? (
          <ButtonLink
            href={reportHref}
            size="medium"
            variant="secondary"
            rightIcon={<ArrowRight />}
          >
            자세히
          </ButtonLink>
        ) : calculated ? (
          <Button
            size="medium"
            variant="secondary"
            rightIcon={<ArrowRight />}
            onClick={onViewResult}
          >
            자세히
          </Button>
        ) : (
          <Button
            size="medium"
            leftIcon={<Calculator />}
            disabled={gap !== null}
            isLoading={isPending}
            loadingLabel="계산 중"
            onClick={onCalculate}
          >
            계산하기
          </Button>
        )}
      </Action>
    </Root>
  )
}
