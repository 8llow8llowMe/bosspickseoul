'use client'

import { ChevronDown } from 'lucide-react'
import styled from 'styled-components'

import {
  ANALYSIS_PERIOD_YEARS,
  analysisPeriodQuartersOf,
  buildAnalysisPeriod,
  clampQuarterToYear,
  parseAnalysisPeriod,
} from '@/lib/analysis/selection'

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

  &:hover {
    border-color: var(--color-primary-600);
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
  value: string
  onChange: (periodCode: string) => void
  /** 두 select 의 접근성 이름. 기본은 상권 분석 문맥(「분석 연도」·「분석 분기」). */
  yearLabel?: string
  quarterLabel?: string
  size?: AnalysisPeriodSelectSize
}

export default function AnalysisPeriodSelect({
  value,
  onChange,
  yearLabel = '분석 연도',
  quarterLabel = '분석 분기',
  size = 'sm',
}: AnalysisPeriodSelectProps) {
  const { year, quarter } = parseAnalysisPeriod(value)
  const quarters = analysisPeriodQuartersOf(year)

  return (
    <Row>
      <Field>
        <Select
          $size={size}
          aria-label={yearLabel}
          value={year}
          onChange={event => {
            const nextYear = Number(event.target.value)
            onChange(
              buildAnalysisPeriod(
                nextYear,
                clampQuarterToYear(nextYear, quarter),
              ),
            )
          }}
        >
          {ANALYSIS_PERIOD_YEARS.map(option => (
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
          value={quarter}
          onChange={event =>
            onChange(buildAnalysisPeriod(year, Number(event.target.value)))
          }
        >
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
