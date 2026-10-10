'use client'

import { useState } from 'react'
import { ArrowRight, Calculator } from 'lucide-react'
import styled from 'styled-components'

import { Button, ButtonLink } from '@/components/ui/button'
import {
  SimulationBottomBarAmount,
  SimulationBottomBarFrame,
  SimulationBottomBarSpacer,
} from '@/components/simulation/simulation-bottom-bar'
import { formatLargeWon } from '@/lib/format'

export type SimulationSummaryBarProps = {
  /** 계산이 끝났으면 만원 단위 총비용. 아직이면 null. */
  totalPrice: number | null
  /** 상세 리포트 경로. 결과가 있어도 조건이 URL로 못 옮겨지면 null일 수 있다. */
  reportHref: string | null
  /** 남은 조건 한 줄. 완료면 null. */
  gap: string | null
  /** 진행도. total 은 지금 화면에 놓인 섹션 수(개인 4 · 프랜차이즈 5). */
  progress: { done: number; total: number }
  isPending: boolean
  /** 계산 버튼 라벨. 이미 보낸 조건이면 「다시 계산」(#604). 기본은 「계산하기」. */
  calculateLabel?: string
  onCalculate: () => void
  /** 결과 패널로 데려간다. 결과가 있을 때만 쓰인다. */
  onViewResult: () => void
}

/* 틀(위치·바탕·데스크톱 숨김)은 리포트 바와 같이 쓴다. 여기서는 안쪽 한 줄 배치만 정한다. */
const Root = styled(SimulationBottomBarFrame)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

/*
  계산 전에는 금액이 없으므로 진행도 + 남은 조건 한 줄만 둔다 — 빈 금액 자리를 만들지 않는다.
  1023px 이하에서 이 바가 계산 전의 유일한 안내다(본문 결과 패널은 숨는다). 그래서 「얼마나
  남았는지」를 숫자로 함께 보여 준다.
*/
const Pending = styled.p`
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  word-break: keep-all;
`

/*
  「3/5」는 화면에서는 짧고 분명하지만 낭독기가 날짜(3월 5일)나 분수로 읽을 수 있다.
  보이는 숫자는 aria-hidden 으로 두고 낭독용 문장을 따로 준다.
*/
const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

const Progress = styled.span`
  flex: 0 0 auto;
  color: var(--color-text-900);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`

const Action = styled.div`
  flex: 0 0 auto;
`

/**
 * 모바일 하단 sticky 요약 바.
 *
 * 계산 **전**에는 남은 조건 + `계산하기`, 계산 **후**에는 총비용 + `리포트 보기`(상세 리포트로
 * 가는 링크)다. 모바일에서는 결과가 입력 섹션 아래에 오므로, 이 바가 없으면 계산 버튼과
 * 금액이 둘 다 화면 밖에 있게 된다.
 */
export default function SimulationSummaryBar({
  totalPrice,
  reportHref,
  gap,
  progress,
  isPending,
  calculateLabel = '계산하기',
  onCalculate,
  onViewResult,
}: SimulationSummaryBarProps) {
  const calculated = totalPrice !== null
  // 문서 끝에 바 높이만큼 자리를 두려고 바를 잰다(#605).
  const [bar, setBar] = useState<HTMLDivElement | null>(null)

  return (
    <>
      {/* 역할 없는 div 의 aria-label 은 낭독기가 무시한다(ARIA 1.2). 바 전체를 이름 있는 영역으로 둔다. */}
      <Root ref={setBar} role="region" aria-label="시뮬레이션 요약">
        {calculated ? (
          <SimulationBottomBarAmount>
            <span>예상 총 창업 비용</span>
            <strong>{formatLargeWon(totalPrice)}</strong>
          </SimulationBottomBarAmount>
        ) : (
          <Pending>
            {gap ? (
              <>
                <Progress aria-hidden="true">{`${progress.done}/${progress.total}`}</Progress>
                <VisuallyHidden>{`${progress.total}단계 중 ${progress.done}단계 완료.`}</VisuallyHidden>
                <span>{gap}</span>
              </>
            ) : isPending ? (
              '조건을 다 골랐어요. 비용을 계산하고 있어요'
            ) : (
              '조건을 다 골랐어요. 계산해 보세요'
            )}
          </Pending>
        )}
        <Action>
          {calculated && reportHref ? (
            <ButtonLink
              href={reportHref}
              size="medium"
              variant="secondary"
              rightIcon={<ArrowRight />}
            >
              리포트 보기
            </ButtonLink>
          ) : calculated ? (
            <Button
              size="medium"
              variant="secondary"
              rightIcon={<ArrowRight />}
              onClick={onViewResult}
            >
              결과 보기
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
              {calculateLabel}
            </Button>
          )}
        </Action>
      </Root>
      <SimulationBottomBarSpacer bar={bar} />
    </>
  )
}
