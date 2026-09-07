import styled from 'styled-components'
import type { LucideIcon } from 'lucide-react'

import { formatAnalysisValue } from '@/lib/analysis/presentation'

/**
 * 요약 카드 — **숫자 하나에 「그래서 어느 정도인가」를 붙인다.**
 *
 * 전에는 라벨과 값 두 줄이 전부였다. 「월 매출 17억 9393만원」은 그 자체로는 좋은지
 * 나쁜지 알 수 없는 수다 — 읽는 사람이 비교할 것을 갖고 있지 않기 때문이다. 요약 탭이
 * 이미 받아 둔 응답(`salesSummary`·`stores`)에 비교 대상이 들어 있는데도 카드가 값만
 * 꺼내 쓰고 있었다. **새 호출 없이** 그 맥락을 붙인다.
 */

export type SummaryCardContext = {
  /** 값 아래 한 줄. 무엇과 견준 것인지가 드러나야 한다. */
  text: string
  /**
   * 0~1 비율. 있으면 막대를 그린다.
   *
   * **1 을 넘거나 비교 대상이 없는 값에는 넣지 않는다** — 막대는 「전체 중 이만큼」을
   * 뜻하므로, 배수(유동인구가 상주인구의 1,021배)를 막대로 그리면 거짓이 된다.
   * 그런 값은 `text` 만 쓴다.
   */
  ratio?: number
}

export type SummaryCard = {
  label: string
  value: number | null | undefined
  unit: string
  /** 훑는 눈이 멈출 자리. 지표의 성격에서 곧장 오는 것만 쓴다. */
  icon?: LucideIcon
  context?: SummaryCardContext | null
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
  }
`

const Card = styled.div`
  display: grid;
  align-content: start;
  gap: 6px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  padding: 16px;
`

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-caption);
  font-size: 12px;

  svg {
    width: 14px;
    height: 14px;
    flex: none;
    stroke: currentColor;
  }
`

const Value = styled.strong`
  color: var(--color-text-900);
  font-size: 21px;
  font-weight: 700;
  line-height: 30px;
  word-break: keep-all;
`

/*
  맥락 줄은 **자리를 늘 차지한다.** 값마다 있고 없고 하면 카드 높이가 들쭉날쭉해져
  같은 행의 숫자들이 서로 다른 높이에 놓인다(홈 인사이트 슬롯 R2 와 같은 이유).
*/
const Context = styled.div`
  display: grid;
  gap: 4px;
  min-height: 26px;
  margin-top: 2px;
`

const Track = styled.div`
  height: 4px;
  border-radius: var(--radius-pill);
  background: var(--color-border-200);
  overflow: hidden;
`

const Fill = styled.div<{ $width: number }>`
  width: ${props => `${props.$width}%`};
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary-600);
`

const ContextText = styled.span`
  color: var(--color-text-600);
  font-size: 12px;
  line-height: 18px;
  word-break: keep-all;
`

/** 막대 폭. 0~1 밖의 값은 그리지 않는다(호출부 실수를 화면이 삼키지 않게). */
export const toBarWidth = (ratio: number | undefined): number | null => {
  if (typeof ratio !== 'number' || !Number.isFinite(ratio)) return null
  if (ratio < 0 || ratio > 1) return null
  // 0 이 아닌 값은 최소 2% 를 줘서 「있는데 안 보이는」 막대를 없앤다.
  return ratio === 0 ? 0 : Math.max(2, ratio * 100)
}

export default function AnalysisSummaryCards({
  cards,
}: {
  cards: readonly SummaryCard[]
}) {
  return (
    <Grid>
      {cards.map(card => {
        const Icon = card.icon
        const width = toBarWidth(card.context?.ratio)

        return (
          <Card key={card.label}>
            <Head>
              {Icon ? <Icon aria-hidden="true" /> : null}
              <span>{card.label}</span>
            </Head>
            <Value>{formatAnalysisValue(card.value, card.unit)}</Value>
            <Context>
              {width === null ? null : (
                <Track aria-hidden="true">
                  <Fill $width={width} />
                </Track>
              )}
              {card.context ? (
                <ContextText>{card.context.text}</ContextText>
              ) : null}
            </Context>
          </Card>
        )
      })}
    </Grid>
  )
}
