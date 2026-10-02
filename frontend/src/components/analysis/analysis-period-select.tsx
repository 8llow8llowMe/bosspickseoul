'use client'

import { ChevronDown } from 'lucide-react'
import styled from 'styled-components'

import {
  buildAnalysisPeriod,
  parseAnalysisPeriod,
  type AnalysisPeriodRange,
} from '@/lib/analysis/period-catalog'

const Row = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
`

const Field = styled.label`
  position: relative;
  display: inline-flex;
  align-items: center;

  svg {
    position: absolute;
    right: 8px;
    width: 14px;
    height: 14px;
    color: var(--color-text-600);
    pointer-events: none;
  }
`

const Select = styled.select<{ $size: AnalysisPeriodSelectSize }>`
  appearance: none;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  background: var(--color-surface);
  color: var(--color-text-800);
  padding: 5px 26px 5px 10px;
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  cursor: pointer;
  ${props => (props.$size === 'md' ? 'min-height: 36px;' : '')}

  &:hover:not(:disabled) {
    border-color: var(--color-primary-600);
  }

  /* 서버 기본 분기를 받기 전·못 받았을 때. 값은 그대로 읽히되 누를 수 없다는 것만 드러낸다. */
  &:disabled {
    cursor: default;
    color: var(--color-text-600);
  }

  /* 포커스는 hover 와 같은 색이면 구별되지 않는다 — 포커스 색 + 글로우로 갈라 놓는다. */
  &:focus-visible {
    border-color: var(--color-primary-700);
    box-shadow: var(--shadow-focus-primary);
    outline: none;
  }
`

/**
 * `sm` 은 상권 분석 결과의 그룹 머리(28px)다. `md` 는 터치 타깃 최소 36px 을 맞춘다
 * (DESIGN.md §Touch target) — 구별현황처럼 모바일에서 주 조작부 옆에 올 때 쓴다.
 */
export type AnalysisPeriodSelectSize = 'sm' | 'md'

export type AnalysisPeriodSelectProps = {
  /** 지금 분기. 아직 정하지 못했으면(최신을 해석하는 중) null. */
  value: string | null
  /**
   * 선택지 범위(2021 ~ 서버 기본 분기, period-catalog.md D4-1). 카탈로그 대기·실패면 null 이고, 그때는
   * 지금 분기 하나만 보이고 비활성이다 — URL 에 분기가 있는 화면은 카탈로그 없이도 동작해야 한다.
   */
  range: AnalysisPeriodRange | null
  onChange: (periodCode: string) => void
  /** 두 select 의 접근성 이름. 기본은 상권 분석 문맥(「분석 연도」·「분석 분기」). */
  yearLabel?: string
  quarterLabel?: string
  size?: AnalysisPeriodSelectSize
}

export default function AnalysisPeriodSelect({
  value,
  range,
  onChange,
  yearLabel = '분석 연도',
  quarterLabel = '분석 분기',
  size = 'sm',
}: AnalysisPeriodSelectProps) {
  const parsed = value !== null ? parseAnalysisPeriod(value) : null
  const disabled = range === null || parsed === null
  /*
    범위를 모르면 지금 값 하나만 옵션으로 둔다. `<select>` 는 옵션에 없는 값을 주면 조용히 첫 옵션을
    그리므로, 값과 옵션이 늘 같이 있어야 헤더와 드롭다운이 어긋나지 않는다.
  */
  const years = range && parsed ? range.years : parsed ? [parsed.year] : []
  const quarters =
    range && parsed
      ? range.quartersOf(parsed.year)
      : parsed
        ? [parsed.quarter]
        : []

  return (
    <Row>
      <Field>
        <Select
          $size={size}
          aria-label={yearLabel}
          value={parsed?.year ?? ''}
          disabled={disabled}
          onChange={event => {
            if (!range || !parsed) return
            const nextYear = Number(event.target.value)
            onChange(
              buildAnalysisPeriod(
                nextYear,
                range.clampQuarter(nextYear, parsed.quarter),
              ),
            )
          }}
        >
          {years.length === 0 ? <option value="">연도</option> : null}
          {years.map(option => (
            <option key={option} value={option}>
              {option}년
            </option>
          ))}
        </Select>
        <ChevronDown aria-hidden />
      </Field>
      <Field>
        <Select
          $size={size}
          aria-label={quarterLabel}
          value={parsed?.quarter ?? ''}
          disabled={disabled}
          onChange={event => {
            if (!parsed) return
            onChange(
              buildAnalysisPeriod(parsed.year, Number(event.target.value)),
            )
          }}
        >
          {quarters.length === 0 ? <option value="">분기</option> : null}
          {quarters.map(option => (
            <option key={option} value={option}>
              {option}분기
            </option>
          ))}
        </Select>
        <ChevronDown aria-hidden />
      </Field>
    </Row>
  )
}
