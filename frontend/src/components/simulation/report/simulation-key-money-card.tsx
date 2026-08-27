'use client'

import styled from 'styled-components'

import { Badge } from '@/components/ui/badge'
import { formatLargeWon } from '@/lib/format'
import type { SimulationKeyMoney } from '@/types/simulation'

export type SimulationKeyMoneyCardProps = { keyMoney: SimulationKeyMoney }

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
`

const Head = styled.header`
  display: flex;
  align-items: center;
  gap: 8px;

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;
  }
`

const Metrics = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr);
  }

  > div {
    display: grid;
    gap: 2px;
    border-radius: var(--radius-control);
    background: var(--color-surface-muted);
    padding: 12px;
  }

  dt {
    color: var(--color-text-600);
    font-size: 12px;
    line-height: 18px;
  }

  dd {
    color: var(--color-text-900);
    font-size: 16px;
    font-weight: 700;
    line-height: 24px;
    font-variant-numeric: tabular-nums;
  }
`

const Note = styled.p`
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
  word-break: keep-all;
`

/**
 * 권리금. 총 창업 비용에 포함되지 않는다 — 배지와 각주 둘 다로 밝힌다.
 * 하나만 두면 배지를 못 본 사용자가 총비용에 더해 읽는다.
 */
export default function SimulationKeyMoneyCard({
  keyMoney,
}: SimulationKeyMoneyCardProps) {
  return (
    <Root aria-label="권리금 참고">
      <Head>
        <h2>권리금</h2>
        <Badge $tone="grey">참고</Badge>
      </Head>

      <Metrics>
        <div>
          <dt>권리금 있는 점포 비율</dt>
          <dd>{keyMoney.keyMoneyRatio.toLocaleString()}%</dd>
        </div>
        <div>
          <dt>평균 권리금</dt>
          <dd>{formatLargeWon(keyMoney.keyMoneyAverage)}</dd>
        </div>
        <div>
          <dt>㎡당 권리금</dt>
          <dd>{keyMoney.keyMoneyLevel.toLocaleString()}만원</dd>
        </div>
      </Metrics>

      <Note>
        권리금은 위 예상 총 창업 비용에 포함되지 않은 참고 값이에요. 실제
        점포마다 크게 달라져요.
      </Note>
    </Root>
  )
}
