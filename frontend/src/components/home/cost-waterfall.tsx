'use client'

import styled from 'styled-components'

/**
 * 대표 예시 수치 — 실데이터가 아니다.
 *
 * 실 API 를 쓰지 않는 이유: `POST /simulations/reports` 는 쓰기 동사이고
 * `store-sizes` GET 이 선행돼야 해서, 랜딩 방문자마다 계산 요청이 나간다.
 * 데모 하나가 치를 값이 아니다.
 */
const STEPS = [
  { key: 'revenue', label: '월매출', amount: 4200, kind: 'base' },
  { key: 'rent', label: '임차료', amount: 1050, kind: 'cost' },
  { key: 'labor', label: '인건비', amount: 1200, kind: 'cost' },
  { key: 'etc', label: '기타', amount: 350, kind: 'cost' },
  { key: 'net', label: '순이익', amount: 1600, kind: 'net' },
] as const

const MAX = 4200

const Wrap = styled.div`
  display: grid;
  gap: 10px;
`

const Row = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 160px;
`

const Column = styled.div`
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
`

const Amount = styled.span`
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-700);
`

const Bar = styled.span<{ $kind: 'base' | 'cost' | 'net' }>`
  display: block;
  width: 100%;
  border-radius: var(--radius-control) var(--radius-control) 0 0;
  background: ${p =>
    p.$kind === 'net'
      ? 'var(--color-primary-600)'
      : p.$kind === 'cost'
        ? 'var(--color-border-200)'
        : 'var(--color-primary-100)'};
  transition: height var(--motion-slow) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Label = styled.span`
  font-size: 12px;
  color: var(--color-text-600);
  white-space: nowrap;
`

const Caption = styled.p`
  margin: 0;
  font-size: 12px;
  color: var(--color-text-caption);
`

export default function CostWaterfall() {
  return (
    <Wrap>
      <Row
        role="img"
        aria-label="월 손익 구조 예시. 월매출 4,200만원에서 임차료·인건비·기타를 빼면 순이익 1,600만원입니다."
      >
        {STEPS.map(step => (
          <Column key={step.key}>
            <Amount aria-hidden="true">
              {step.amount.toLocaleString('ko-KR')}
            </Amount>
            <Bar
              aria-hidden="true"
              $kind={step.kind}
              style={{ height: `${(step.amount / MAX) * 100}%` }}
            />
            <Label aria-hidden="true">{step.label}</Label>
          </Column>
        ))}
      </Row>
      <Caption>단위: 만원 · 대표 예시 데이터</Caption>
    </Wrap>
  )
}
