'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useId } from 'react'
import styled from 'styled-components'
import {
  selectStatusTopTen,
  STATUS_TOP_TEN_SIZE,
} from '@/lib/status/status-adapter'
import {
  formatStatusValue,
  presentStatusChange,
  STATUS_CHANGE_BASIS,
  STATUS_CHANGE_TONE_COLOR,
  STATUS_METRIC_LABELS,
  type StatusChangeTone,
} from '@/lib/status/status-formatters'
import type { StatusMetric, StatusRankedItem } from '@/types/status'

type StatusTopTenProps = {
  metric: StatusMetric
  /**
   * 현재 지표의 전체 순위(25개 구). 접힌 상태에서는 앞 10개만 그린다(#565). 펼침 버튼은
   * 10개보다 많고 `onExpandedChange` 가 있을 때만 둔다.
   */
  items: StatusRankedItem[]
  /** 25개 구를 모두 펼쳤는지. 페이지가 URL(`?list=all`)에 들고 있다 — 상세에서 돌아와도 유지된다. */
  isExpanded?: boolean
  onExpandedChange?: (isExpanded: boolean) => void
  selectedDistrictCode: string | null
  onSelect: (districtCode: string) => void
  /** 지도와 함께 강조할 구. 목록 ↔ 지도 hover 연동용이며 없으면 연동하지 않는다. */
  highlightedDistrictCode?: string | null
  onHighlightEnter?: (districtCode: string) => void
  onHighlightLeave?: (districtCode: string) => void
}

const Section = styled.section`
  min-width: 0;
`

const Heading = styled.h2`
  margin: 0 4px;
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
`

// 변화율의 비교 기준(#560). 행마다 적으면 숫자 열이 넓어져 제목 아래 한 번만 적는다.
const BasisCaption = styled.p`
  margin: 2px 4px 6px;
  color: var(--color-text-600);
  font-size: 12px;
  line-height: 16px;
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
    props.$selected
      ? 'var(--color-text-primary-on-light)'
      : 'var(--color-text-600)'};
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

/*
 * 증감은 알약 배경 없이 글자색·▲▼·「개선/악화」로 쓴다. 한 행에 굵은 숫자는 값 하나다.
 * 색은 좋고 나쁨을 따르고(폐업은 반대, DESIGN.md §Charts), 같은 뜻을 글자로도 적는다 — 색만으로
 * 좋고 나쁨을 전하지 않는다(WCAG 1.4.1).
 */
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

const ExpandButton = styled.button`
  width: 100%;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 4px;
  padding: 10px 12px;
  border: 0;
  border-top: 1px solid var(--color-border-200);
  border-radius: 0;
  background: transparent;
  color: var(--color-text-primary-on-light);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);

  @media (hover: hover) {
    &:hover {
      background: var(--color-surface-muted);
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
  isExpanded = false,
  onExpandedChange,
  selectedDistrictCode,
  onSelect,
  highlightedDistrictCode = null,
  onHighlightEnter,
  onHighlightLeave,
}: StatusTopTenProps) {
  const headingId = useId()
  const listId = useId()
  const canExpand =
    onExpandedChange !== undefined && items.length > STATUS_TOP_TEN_SIZE
  const isShowingAll = canExpand && isExpanded
  const visibleItems = isShowingAll ? items : selectStatusTopTen(items)
  const metricLabel = STATUS_METRIC_LABELS[metric]

  return (
    <Section aria-labelledby={headingId}>
      <Heading id={headingId}>
        {isShowingAll
          ? `${metricLabel} 전체 ${items.length}개 구`
          : `${metricLabel} 상위 10개 구`}
      </Heading>
      {visibleItems.length > 0 ? (
        <>
          <BasisCaption>증감은 {STATUS_CHANGE_BASIS}예요.</BasisCaption>
          <RankingList id={listId}>
            {visibleItems.map(item => {
              const isSelected = item.districtCode === selectedDistrictCode
              const change = presentStatusChange(metric, item.changeRate)

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
                      <Change $tone={change.tone}>
                        {change.arrow ? (
                          <span aria-hidden="true">{change.arrow} </span>
                        ) : null}
                        {/* ▲▼ 는 읽지 않는다. 기준과 방향은 숨긴 글자로 읽힌다(#560). 값이 없으면
                          보이는 글자 「변화율 데이터 없음」이 그대로 읽힌다. */}
                        <VisuallyHidden>
                          {STATUS_CHANGE_BASIS}{' '}
                          {change.directionLabel
                            ? `${change.directionLabel} `
                            : null}
                        </VisuallyHidden>
                        {change.rateText}
                        {change.qualityLabel ? ` ${change.qualityLabel}` : null}
                      </Change>
                    </Figures>
                  </RankingButton>
                </RankingItem>
              )
            })}
          </RankingList>
          {canExpand ? (
            <ExpandButton
              aria-controls={listId}
              aria-expanded={isShowingAll}
              type="button"
              onClick={() => onExpandedChange?.(!isShowingAll)}
            >
              {isShowingAll
                ? '상위 10개 구만 보기'
                : `전체 ${items.length}개 구 보기`}
              {isShowingAll ? (
                <ChevronUp aria-hidden="true" size={16} strokeWidth={2} />
              ) : (
                <ChevronDown aria-hidden="true" size={16} strokeWidth={2} />
              )}
            </ExpandButton>
          ) : null}
        </>
      ) : (
        <EmptyMessage>
          선택한 지표의 상위 자치구 데이터가 아직 없어요.
        </EmptyMessage>
      )}
    </Section>
  )
}
