'use client'

import styled from 'styled-components'

import { Badge } from '@/components/ui/badge'
import {
  describeSeasonMonths,
  describeSimulationPeriod,
} from '@/lib/simulation/report-presentation'
import type {
  SimulationCondition,
  SimulationSeasonAnalysis,
} from '@/types/simulation'

export type SimulationSeasonCardProps = {
  condition: SimulationCondition
  analysis: SimulationSeasonAnalysis
}

const Root = styled.section`
  display: grid;
  gap: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 24px;

  @media (max-width: 640px) {
    padding: 20px;
  }

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;
  }
`

const Caption = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
`

const Rows = styled.dl`
  display: grid;
  gap: 12px;

  > div {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  dt {
    flex: 0 0 auto;
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
  }

  dd {
    color: var(--color-text-900);
    font-size: 14px;
    font-weight: 600;
    line-height: 22px;
  }
`

/** 성수기·비성수기. 한쪽만 값이 오는 경우가 있어 있는 쪽만 그린다. */
export default function SimulationSeasonCard({
  condition,
  analysis,
}: SimulationSeasonCardProps) {
  const period = describeSimulationPeriod(condition.periodCode)
  const peak = describeSeasonMonths(analysis.peakMonths)
  const offPeak = describeSeasonMonths(analysis.offPeakMonths)

  return (
    <Root aria-label="성수기 참고">
      <h2>성수기</h2>
      {period ? <Caption>{period}</Caption> : null}

      <Rows>
        {peak ? (
          <div>
            <dt>
              <Badge $tone="blue">성수기</Badge>
            </dt>
            <dd>{peak}</dd>
          </div>
        ) : null}
        {offPeak ? (
          <div>
            <dt>
              <Badge $tone="grey">비성수기</Badge>
            </dt>
            <dd>{offPeak}</dd>
          </div>
        ) : null}
      </Rows>
    </Root>
  )
}
