'use client'

import { ChevronDown } from 'lucide-react'
import styled from 'styled-components'

import {
  ANALYSIS_PERIOD_QUARTERS,
  ANALYSIS_PERIOD_YEARS,
  buildAnalysisPeriod,
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

const Select = styled.select`
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

  &:hover {
    border-color: var(--color-primary-600);
  }

  &:focus-visible {
    border-color: var(--color-primary-600);
    outline: none;
  }
`

export type AnalysisPeriodSelectProps = {
  value: string
  onChange: (periodCode: string) => void
}

export default function AnalysisPeriodSelect({
  value,
  onChange,
}: AnalysisPeriodSelectProps) {
  const { year, quarter } = parseAnalysisPeriod(value)

  return (
    <Row>
      <Field>
        <Select
          aria-label="분석 연도"
          value={year}
          onChange={event =>
            onChange(buildAnalysisPeriod(Number(event.target.value), quarter))
          }
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
          aria-label="분석 분기"
          value={quarter}
          onChange={event =>
            onChange(buildAnalysisPeriod(year, Number(event.target.value)))
          }
        >
          {ANALYSIS_PERIOD_QUARTERS.map(option => (
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
