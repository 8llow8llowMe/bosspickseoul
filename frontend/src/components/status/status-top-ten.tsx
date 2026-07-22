'use client'

import { useId } from 'react'
import styled from 'styled-components'
import {
  formatStatusChange,
  formatStatusValue,
} from '@/lib/status/status-formatters'
import type { StatusMetric, StatusRankedItem } from '@/types/status'

type StatusTopTenProps = {
  metric: StatusMetric
  items: StatusRankedItem[]
  selectedDistrictCode: string | null
  onSelect: (districtCode: string) => void
}

type ChangeTone = 'danger' | 'neutral' | 'success' | 'warning'

const METRIC_LABELS: Record<StatusMetric, string> = {
  footTraffic: '유동인구',
  sales: '매출',
  opened: '개업',
  closed: '폐업',
}

const getChangeTone = (
  metric: StatusMetric,
  changeRate: number,
): ChangeTone => {
  if (!Number.isFinite(changeRate) || changeRate === 0) {
    return 'neutral'
  }

  if (metric === 'closed') {
    return changeRate > 0 ? 'danger' : 'success'
  }

  return changeRate > 0 ? 'success' : 'warning'
}

const Section = styled.section`
  min-width: 0;
`

const Heading = styled.h2`
  margin-bottom: 16px;
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
`

const RankingList = styled.ol`
  display: grid;
  gap: 8px;
`

const RankingButton = styled.button<{ $selected: boolean }>`
  width: 100%;
  min-height: 64px;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: ${props => (props.$selected ? '2px' : '1px')} solid
    ${props =>
      props.$selected ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  text-align: left;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-600);
  }

  @media (max-width: 420px) {
    grid-template-columns: 28px minmax(0, 1fr);
  }
`

const Rank = styled.span`
  color: var(--color-text-500);
  font-size: 14px;
  font-weight: 700;
  text-align: center;
`

const District = styled.span`
  min-width: 0;
  display: grid;
  gap: 2px;
`

const DistrictName = styled.span`
  overflow: hidden;
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DistrictValue = styled.span`
  color: var(--color-text-600);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
`

const Change = styled.span<{ $tone: ChangeTone }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-left: 8px;
  border-left: 3px solid
    ${props => {
      if (props.$tone === 'danger') return 'var(--color-danger)'
      if (props.$tone === 'success') return 'var(--color-success)'
      if (props.$tone === 'warning') return 'var(--color-warning)'
      return 'var(--color-border-300)'
    }};
  color: var(--color-text-800);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;

  @media (max-width: 420px) {
    grid-column: 2;
    justify-self: start;
    text-align: left;
  }
`

const ChangeCue = styled.span`
  font-weight: 600;
`

const getChangeCue = (metric: StatusMetric, changeRate: number): string => {
  if (!Number.isFinite(changeRate)) return '변화율'
  if (changeRate === 0) return '변동 없음'
  if (metric === 'closed') return changeRate > 0 ? '주의' : '개선'
  return changeRate > 0 ? '증가' : '감소'
}

const EmptyMessage = styled.p`
  padding: 24px 16px;
  border: 1px dashed var(--color-border-300);
  border-radius: var(--radius-control);
  color: var(--color-text-600);
  font-size: 14px;
  text-align: center;
`

export default function StatusTopTen({
  metric,
  items,
  selectedDistrictCode,
  onSelect,
}: StatusTopTenProps) {
  const headingId = useId()
  const topTenItems = items.slice(0, 10)

  return (
    <Section aria-labelledby={headingId}>
      <Heading id={headingId}>{METRIC_LABELS[metric]} 상위 10개 자치구</Heading>
      {topTenItems.length > 0 ? (
        <RankingList>
          {topTenItems.map(item => {
            const isSelected = item.districtCode === selectedDistrictCode

            return (
              <li key={item.districtCode}>
                <RankingButton
                  $selected={isSelected}
                  aria-pressed={isSelected}
                  type="button"
                  onClick={() => onSelect(item.districtCode)}
                >
                  <Rank>{item.rank}위</Rank>
                  <District>
                    <DistrictName>{item.districtName}</DistrictName>
                    <DistrictValue>
                      {formatStatusValue(metric, item.value)}
                    </DistrictValue>
                  </District>
                  <Change $tone={getChangeTone(metric, item.changeRate)}>
                    <ChangeCue>
                      {getChangeCue(metric, item.changeRate)}
                    </ChangeCue>
                    <span>{formatStatusChange(item.changeRate)}</span>
                  </Change>
                </RankingButton>
              </li>
            )
          })}
        </RankingList>
      ) : (
        <EmptyMessage>데이터 없음</EmptyMessage>
      )}
    </Section>
  )
}
