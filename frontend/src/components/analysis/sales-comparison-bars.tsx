'use client'

import styled from 'styled-components'

import { formatAnalysisValue } from '@/lib/analysis/presentation'

export type SalesComparisonItem = {
  label: string
  value: number | null | undefined
  /** 비교의 주인공(선택한 상권). 색을 한 단계 진하게 준다. */
  strong?: boolean
}

/*
  DESIGN.md 「Charts」의 두 규칙을 이 컴포넌트가 지킨다.

  ① 가로 막대는 폭에 상한을 둔다. 상한이 없으면 넓은 칸에서 막대가 하나의 긴 선이
     되고 왼쪽 라벨과 오른쪽 값을 눈으로 이을 수 없다. 이 미터는 예전에 리포트의
     full 스팬 카드 안에 있어서 1300px 칸에서 약 110:1 이 됐다 — 규칙을 만들게 한
     `/status` 「업종별 점포수」의 31:1 보다 나쁜 값이다.
  ② 가로 막대는 카드 하나를 가로지르게(full) 두지 않는다 — 호출부가 일반 그리드
     칸에 둔다.
*/
const List = styled.div`
  display: grid;
  gap: 12px;
  padding: 6px 2px 2px;
  /*
    360px 은 임의 값이 아니다. 이 폭에서 트랙은 360 − 라벨 84 − gap 12 − 값(약 70)
    − gap 12 ≈ 182px 이고, 두께 14px 에 대해 약 13:1 이다 — DESIGN.md 가 요구하는
    「15:1 을 넘지 않는다」 안이다. 상한이 없던 full 스팬 시절에는 약 108:1 이었다.
  */
  max-width: 360px;
`

const Row = styled.div`
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;

  @media (max-width: 480px) {
    grid-template-columns: 64px minmax(0, 1fr) auto;
    gap: 8px;
  }
`

const Label = styled.span`
  overflow: hidden;
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Track = styled.div`
  /* 두께는 가로세로비의 분모다 — 얇으면 같은 길이에서도 선처럼 읽힌다. */
  height: 14px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  overflow: hidden;
`

const Fill = styled.div<{ $percent: number; $strong?: boolean }>`
  height: 100%;
  width: ${props => Math.max(0, Math.min(100, props.$percent))}%;
  border-radius: var(--radius-pill);
  background: ${props =>
    props.$strong ? 'var(--color-primary-700)' : 'var(--color-primary-600)'};
  transition: width var(--motion-slow) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Value = styled.span`
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
`

export default function SalesComparisonBars({
  items,
}: {
  items: readonly SalesComparisonItem[]
}) {
  const max = Math.max(
    0,
    ...items.map(item => (typeof item.value === 'number' ? item.value : 0)),
  )

  return (
    <List>
      {items.map(item => {
        const hasValue = typeof item.value === 'number'
        const percent = hasValue && max > 0 ? (item.value! / max) * 100 : 0

        return (
          <Row key={item.label}>
            <Label>{item.label}</Label>
            <Track>
              <Fill $percent={percent} $strong={item.strong} />
            </Track>
            <Value>
              {hasValue ? formatAnalysisValue(item.value, '원') : '데이터 없음'}
            </Value>
          </Row>
        )
      })}
    </List>
  )
}
