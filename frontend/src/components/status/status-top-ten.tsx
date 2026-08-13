'use client'

import { useId } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
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

const getChangeCue = (metric: StatusMetric, changeRate: number): string => {
  if (!Number.isFinite(changeRate)) return '변화율'
  if (changeRate === 0) return '변동 없음'
  if (metric === 'closed') return changeRate > 0 ? '주의' : '개선'
  return changeRate > 0 ? '증가' : '감소'
}

const CHANGE_TONE_COLOR: Record<ChangeTone, string> = {
  danger: 'var(--color-danger)',
  neutral: 'var(--color-text-600)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
}

const Section = styled.section`
  min-width: 0;
`

const Heading = styled.h2`
  margin-bottom: 10px;
  color: var(--color-text-900);
  font-size: 17px;
  font-weight: 700;
  line-height: 24px;
`

const RankingList = styled.ol`
  display: grid;
  gap: 6px;
`

const RankingButton = styled.button<{ $selected: boolean }>`
  width: 100%;
  min-height: 52px;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
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

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }
`

const RankBadge = styled.span<{ $selected: boolean; $top: boolean }>`
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-compact);
  background: ${props => {
    if (props.$selected) return 'var(--color-primary-600)'
    if (props.$top) return 'var(--color-primary-100)'
    return 'var(--color-surface-muted)'
  }};
  color: ${props => {
    if (props.$selected) return '#ffffff'
    if (props.$top) return 'var(--color-primary-700)'
    return 'var(--color-text-600)'
  }};
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
`

const Main = styled.span`
  min-width: 0;
  display: grid;
  gap: 5px;
`

const MainTop = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

// 값과 크기 막대를 한 줄에 둔다. 값은 고정 폭, 막대가 남는 폭을 채운다.
const MainBottom = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
`

const DistrictName = styled.span`
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
`

const DistrictValue = styled.span`
  flex: none;
  color: var(--color-text-600);
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

// 값의 상대 크기(1위 대비)를 막대로 보여줘 자치구 간 규모 비교를 한눈에 돕는다.
const ValueBarTrack = styled.span`
  flex: 1;
  min-width: 24px;
  height: 5px;
  display: block;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  overflow: hidden;
`

const ValueBarFill = styled.span<{ $selected: boolean }>`
  height: 100%;
  display: block;
  border-radius: var(--radius-pill);
  background: ${props =>
    props.$selected ? 'var(--color-primary-700)' : 'var(--color-primary-600)'};
`

const ChangeBadge = styled.span<{ $tone: ChangeTone }>`
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px 8px 3px 6px;
  border-radius: var(--radius-pill);
  background: ${props =>
    `color-mix(in srgb, ${CHANGE_TONE_COLOR[props.$tone]} 12%, var(--color-surface))`};
  color: ${props => CHANGE_TONE_COLOR[props.$tone]};
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;

  svg {
    width: 13px;
    height: 13px;
    stroke: currentColor;
  }
`

const EmptyMessage = styled.p`
  padding: 24px 16px;
  border: 1px dashed var(--color-border-300);
  border-radius: var(--radius-control);
  color: var(--color-text-600);
  font-size: 14px;
  text-align: center;
`

function ChangeArrow({ changeRate }: { changeRate: number }) {
  if (!Number.isFinite(changeRate) || changeRate === 0) {
    return <Minus aria-hidden="true" />
  }

  return changeRate > 0 ? (
    <ArrowUpRight aria-hidden="true" />
  ) : (
    <ArrowDownRight aria-hidden="true" />
  )
}

export default function StatusTopTen({
  metric,
  items,
  selectedDistrictCode,
  onSelect,
}: StatusTopTenProps) {
  const headingId = useId()
  const topTenItems = items.slice(0, 10)
  const maxValue = topTenItems.reduce(
    (max, item) => (item.value > max ? item.value : max),
    0,
  )

  return (
    <Section aria-labelledby={headingId}>
      <Heading id={headingId}>{METRIC_LABELS[metric]} TOP 10</Heading>
      {topTenItems.length > 0 ? (
        <RankingList>
          {topTenItems.map(item => {
            const isSelected = item.districtCode === selectedDistrictCode
            const tone = getChangeTone(metric, item.changeRate)
            const ratio =
              maxValue > 0
                ? Math.max(4, Math.round((item.value / maxValue) * 100))
                : 0

            return (
              <li key={item.districtCode}>
                <RankingButton
                  $selected={isSelected}
                  aria-pressed={isSelected}
                  type="button"
                  onClick={() => onSelect(item.districtCode)}
                >
                  <RankBadge $selected={isSelected} $top={item.rank <= 3}>
                    {item.rank}
                  </RankBadge>
                  <Main>
                    <MainTop>
                      <DistrictName>{item.districtName}</DistrictName>
                      <ChangeBadge
                        $tone={tone}
                        aria-label={`${getChangeCue(metric, item.changeRate)} ${formatStatusChange(item.changeRate)}`}
                      >
                        <ChangeArrow changeRate={item.changeRate} />
                        {formatStatusChange(item.changeRate)}
                      </ChangeBadge>
                    </MainTop>
                    <MainBottom>
                      <DistrictValue>
                        {formatStatusValue(metric, item.value)}
                      </DistrictValue>
                      <ValueBarTrack aria-hidden="true">
                        <ValueBarFill
                          $selected={isSelected}
                          style={{ width: `${ratio}%` }}
                        />
                      </ValueBarTrack>
                    </MainBottom>
                  </Main>
                </RankingButton>
              </li>
            )
          })}
        </RankingList>
      ) : (
        <EmptyMessage>
          선택한 지표의 상위 자치구 데이터가 아직 없습니다.
        </EmptyMessage>
      )}
    </Section>
  )
}
