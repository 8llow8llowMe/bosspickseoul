'use client'

import { useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import {
  DEFAULT_SELECTION,
  DISTRICTS,
  INDUSTRIES,
  getDemoSample,
  type CompetitionLevel,
} from '@/data/home-demo'
import Sparkline from '@/components/home/sparkline'

const competitionLabel: Record<CompetitionLevel, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
}

const Wrapper = styled.div`
  display: grid;
  gap: 20px;
`

const SelectorRow = styled.div`
  display: grid;
  gap: 12px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const SelectorGroup = styled.div`
  display: grid;
  gap: 8px;
`

const SelectorLabel = styled.span`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const OptionList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const Option = styled.button<{ $active: boolean }>`
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid
    ${props =>
      props.$active ? 'var(--color-primary-700)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$active ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-700);
    color: var(--color-primary-700);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }
`

const ResultCard = styled.div`
  display: grid;
  gap: 18px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-2);
  padding: 24px;
  transition: background-color var(--motion-fast) var(--ease-standard);

  @media (max-width: 640px) {
    padding: 20px;
  }
`

const ResultHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
`

const ResultTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 18px;
  font-weight: 700;
  line-height: 26px;
`

const SampleBadge = styled.span`
  color: var(--color-text-caption);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
`

const MetricGrid = styled.div`
  display: grid;
  gap: 16px;

  @media (min-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const MetricBlock = styled.div`
  display: grid;
  gap: 6px;
`

const MetricLabel = styled.span`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const SalesRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const SalesTrend = styled.span<{ $positive: boolean }>`
  display: inline-flex;
  color: ${props =>
    props.$positive ? 'var(--color-success)' : 'var(--color-danger)'};
  transition: color var(--motion-fast) var(--ease-standard);
`

const SalesChange = styled.span<{ $positive: boolean }>`
  color: ${props =>
    props.$positive ? 'var(--color-success)' : 'var(--color-danger)'};
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  transition: color var(--motion-fast) var(--ease-standard);
`

const MetricValue = styled.span`
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 600;
  line-height: 24px;
`

const CompetitionBadge = styled.span<{ $level: CompetitionLevel }>`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: ${props => {
    if (props.$level === 'low') return 'var(--color-primary-100)'
    if (props.$level === 'high') return 'var(--color-surface-muted)'
    return 'var(--color-surface-muted)'
  }};
  color: ${props => {
    if (props.$level === 'low') return 'var(--color-success)'
    if (props.$level === 'high') return 'var(--color-danger)'
    return 'var(--color-text-700)'
  }};
  font-size: 13px;
  font-weight: 700;
`

const Insight = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

const Cta = styled(Link)`
  min-height: 48px;
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  transition: background-color var(--motion-fast) var(--ease-standard);

  &:hover {
    background: var(--color-primary-600);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }
`

export default function AnalysisMiniDemo() {
  const [sel, setSel] = useState(DEFAULT_SELECTION)
  const sample = getDemoSample(sel.districtId, sel.industryId)
  const districtName =
    DISTRICTS.find(district => district.id === sel.districtId)?.name ?? ''
  const industryName =
    INDUSTRIES.find(industry => industry.id === sel.industryId)?.name ?? ''
  const isPositive = sample.salesChangePct >= 0
  const changeLabel = `${isPositive ? '+' : ''}${sample.salesChangePct}%`

  return (
    <Wrapper>
      <SelectorRow>
        <SelectorGroup role="radiogroup" aria-label="지역 선택">
          <SelectorLabel>지역</SelectorLabel>
          <OptionList>
            {DISTRICTS.map(district => (
              <Option
                key={district.id}
                type="button"
                role="radio"
                aria-checked={sel.districtId === district.id}
                $active={sel.districtId === district.id}
                onClick={() =>
                  setSel(prev => ({ ...prev, districtId: district.id }))
                }
              >
                {district.name}
              </Option>
            ))}
          </OptionList>
        </SelectorGroup>

        <SelectorGroup role="radiogroup" aria-label="업종 선택">
          <SelectorLabel>업종</SelectorLabel>
          <OptionList>
            {INDUSTRIES.map(industry => (
              <Option
                key={industry.id}
                type="button"
                role="radio"
                aria-checked={sel.industryId === industry.id}
                $active={sel.industryId === industry.id}
                onClick={() =>
                  setSel(prev => ({ ...prev, industryId: industry.id }))
                }
              >
                {industry.name}
              </Option>
            ))}
          </OptionList>
        </SelectorGroup>
      </SelectorRow>

      <ResultCard aria-live="polite">
        <ResultHeader>
          <ResultTitle>
            {districtName} · {industryName}
          </ResultTitle>
          <SampleBadge>대표 예시 데이터</SampleBadge>
        </ResultHeader>

        <MetricGrid>
          <MetricBlock>
            <MetricLabel>매출 추이</MetricLabel>
            <SalesRow>
              <SalesTrend $positive={isPositive}>
                <Sparkline values={sample.salesTrend} />
              </SalesTrend>
              <SalesChange $positive={isPositive}>{changeLabel}</SalesChange>
            </SalesRow>
          </MetricBlock>

          <MetricBlock>
            <MetricLabel>유동인구</MetricLabel>
            <MetricValue>{sample.footTraffic}</MetricValue>
          </MetricBlock>

          <MetricBlock>
            <MetricLabel>경쟁 강도</MetricLabel>
            <CompetitionBadge $level={sample.competition}>
              {competitionLabel[sample.competition]}
            </CompetitionBadge>
          </MetricBlock>
        </MetricGrid>

        <Insight>{sample.insight}</Insight>

        <Cta href="/analysis">이 조건으로 실제 분석하기</Cta>
      </ResultCard>
    </Wrapper>
  )
}
