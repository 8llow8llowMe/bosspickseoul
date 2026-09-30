'use client'

import { useId } from 'react'
import styled from 'styled-components'
import {
  formatStatusChange,
  formatStatusValue,
  getStatusChangeTone,
  STATUS_CHANGE_TONE_COLOR,
  STATUS_METRIC_LABELS,
  type StatusChangeTone,
} from '@/lib/status/status-formatters'
import type { StatusMetric, StatusRankedItem } from '@/types/status'

type StatusTopTenProps = {
  metric: StatusMetric
  items: StatusRankedItem[]
  selectedDistrictCode: string | null
  onSelect: (districtCode: string) => void
  /** 지도와 함께 강조할 구. 목록 ↔ 지도 hover 연동용이며 없으면 연동하지 않는다. */
  highlightedDistrictCode?: string | null
  onHighlightEnter?: (districtCode: string) => void
  onHighlightLeave?: (districtCode: string) => void
}

const getChangeCue = (metric: StatusMetric, changeRate: number): string => {
  if (!Number.isFinite(changeRate)) return '변화율'
  if (changeRate === 0) return '변동 없음'
  if (metric === 'closed') return changeRate > 0 ? '주의' : '개선'
  return changeRate > 0 ? '증가' : '감소'
}

const getChangeArrow = (changeRate: number): string => {
  if (!Number.isFinite(changeRate) || changeRate === 0) return '–'
  return changeRate > 0 ? '▲' : '▼'
}

const Section = styled.section`
  min-width: 0;
`

const Heading = styled.h2`
  margin: 0 4px 6px;
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
`

/*
 * 카드 10개가 아니라 구분선 행 10개다. 예전엔 행마다 테두리를 둘러 한 화면에 6개 남짓만
 * 보였다. 1위 대비 막대도 뺐다 — 크기 비교는 지도의 단계 색이 맡는다.
 */
const RankingList = styled.ol`
  display: grid;
`

const RankingItem = styled.li`
  & + & {
    border-top: 1px solid var(--color-border-200);
  }
`

const RankingButton = styled.button<{
  $selected: boolean
  $highlighted: boolean
}>`
  position: relative;
  width: 100%;
  min-height: 56px;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 8px 6px;
  border: 0;
  border-radius: var(--radius-control);
  background: ${props => {
    if (props.$selected) return 'var(--color-primary-100)'
    if (props.$highlighted) return 'var(--color-surface-muted)'
    return 'transparent'
  }};
  text-align: left;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);

  @media (hover: hover) {
    &:hover {
      background: ${props =>
        props.$selected
          ? 'var(--color-primary-100)'
          : 'var(--color-surface-muted)'};
    }
  }

  &:focus-visible {
    outline: 2px solid var(--color-blue-500);
    outline-offset: -2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const RankNumber = styled.span<{ $selected: boolean }>`
  color: ${props =>
    props.$selected ? 'var(--color-primary-600)' : 'var(--color-text-600)'};
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
`

const DistrictName = styled.span`
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
`

const Figures = styled.span`
  display: grid;
  justify-items: end;
  gap: 2px;
`

const DistrictValue = styled.span`
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

// 증감은 알약 배경 없이 글자색과 ▲▼ 만 쓴다. 한 행에 굵은 숫자는 값 하나다.
const Change = styled.span<{ $tone: StatusChangeTone }>`
  color: ${props => STATUS_CHANGE_TONE_COLOR[props.$tone]};
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
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

const EmptyMessage = styled.p`
  padding: 24px 16px;
  border: 1px solid var(--color-border-200);
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
  highlightedDistrictCode = null,
  onHighlightEnter,
  onHighlightLeave,
}: StatusTopTenProps) {
  const headingId = useId()
  const topTenItems = items.slice(0, 10)

  return (
    <Section aria-labelledby={headingId}>
      <Heading id={headingId}>
        {STATUS_METRIC_LABELS[metric]} 상위 10개 구
      </Heading>
      {topTenItems.length > 0 ? (
        <RankingList>
          {topTenItems.map(item => {
            const isSelected = item.districtCode === selectedDistrictCode

            return (
              <RankingItem key={item.districtCode}>
                <RankingButton
                  $highlighted={item.districtCode === highlightedDistrictCode}
                  $selected={isSelected}
                  aria-pressed={isSelected}
                  data-district-code={item.districtCode}
                  type="button"
                  onClick={() => onSelect(item.districtCode)}
                  onPointerEnter={event => {
                    if (event.pointerType === 'touch') return
                    onHighlightEnter?.(item.districtCode)
                  }}
                  onPointerLeave={() => onHighlightLeave?.(item.districtCode)}
                >
                  <RankNumber $selected={isSelected}>{item.rank}</RankNumber>
                  <DistrictName>{item.districtName}</DistrictName>
                  <Figures>
                    <DistrictValue>
                      {formatStatusValue(metric, item.value)}
                    </DistrictValue>
                    <Change
                      $tone={getStatusChangeTone(metric, item.changeRate)}
                    >
                      <span aria-hidden="true">
                        {getChangeArrow(item.changeRate)}{' '}
                      </span>
                      <VisuallyHidden>
                        {getChangeCue(metric, item.changeRate)}{' '}
                      </VisuallyHidden>
                      {formatStatusChange(item.changeRate)}
                    </Change>
                  </Figures>
                </RankingButton>
              </RankingItem>
            )
          })}
        </RankingList>
      ) : (
        <EmptyMessage>
          선택한 지표의 상위 자치구 데이터가 아직 없어요.
        </EmptyMessage>
      )}
    </Section>
  )
}
