'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import {
  DEFAULT_SELECTION,
  DISTRICTS,
  INDUSTRIES,
  getDemoSample,
  type CompetitionLevel,
} from '@/data/home-demo'
import LineChart from '@/components/analysis/charts/line-chart'

const competitionLabel: Record<CompetitionLevel, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
}

const TREND_LABELS = [
  '6개월 전',
  '5개월 전',
  '4개월 전',
  '3개월 전',
  '2개월 전',
  '이번 달',
] as const

function useRovingRadioGroup(
  items: readonly { id: string }[],
  selectedId: string,
  onSelect: (id: string) => void,
) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = items.findIndex(item => item.id === selectedId)
    let nextIndex = currentIndex

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % items.length
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + items.length) % items.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = items.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    onSelect(items[nextIndex].id)
    refs.current[nextIndex]?.focus()
  }

  return { refs, handleKeyDown }
}

const Wrapper = styled.div`
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(0, 200px) minmax(0, 1fr);
  align-items: start;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const SelectorColumn = styled.div`
  display: grid;
  gap: 20px;
`

const SelectorGroup = styled.div`
  display: grid;
  gap: 8px;
  align-content: start;
`

const SelectorLabel = styled.span`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const OptionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (max-width: 640px) {
    flex-direction: row;
    flex-wrap: wrap;
  }
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
  text-align: left;
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

const ChartCard = styled.div`
  display: grid;
  gap: 10px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface-muted);
  padding: 16px;
`

const ChartHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
`

const ChartLabel = styled.span`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const ChartChange = styled.span<{ $positive: boolean }>`
  color: ${props =>
    props.$positive ? 'var(--color-success)' : 'var(--color-danger)'};
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  transition: color var(--motion-fast) var(--ease-standard);
`

const MetricGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
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
  background: var(--color-surface-muted);
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

  const districtGroup = useRovingRadioGroup(DISTRICTS, sel.districtId, id =>
    setSel(prev => ({ ...prev, districtId: id })),
  )
  const industryGroup = useRovingRadioGroup(INDUSTRIES, sel.industryId, id =>
    setSel(prev => ({ ...prev, industryId: id })),
  )

  return (
    <Wrapper>
      <SelectorColumn>
        <SelectorGroup role="radiogroup" aria-label="지역 선택">
          <SelectorLabel>지역</SelectorLabel>
          <OptionList onKeyDown={districtGroup.handleKeyDown}>
            {DISTRICTS.map((district, index) => (
              <Option
                key={district.id}
                ref={el => {
                  districtGroup.refs.current[index] = el
                }}
                type="button"
                role="radio"
                aria-checked={sel.districtId === district.id}
                tabIndex={sel.districtId === district.id ? 0 : -1}
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
          <OptionList onKeyDown={industryGroup.handleKeyDown}>
            {INDUSTRIES.map((industry, index) => (
              <Option
                key={industry.id}
                ref={el => {
                  industryGroup.refs.current[index] = el
                }}
                type="button"
                role="radio"
                aria-checked={sel.industryId === industry.id}
                tabIndex={sel.industryId === industry.id ? 0 : -1}
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
      </SelectorColumn>

      <ResultCard aria-live="polite">
        <ResultHeader>
          <ResultTitle>
            {districtName} · {industryName}
          </ResultTitle>
          <SampleBadge>대표 예시 데이터</SampleBadge>
        </ResultHeader>

        <ChartCard>
          <ChartHeader>
            <ChartLabel>매출 추이 (최근 6개월)</ChartLabel>
            <ChartChange $positive={isPositive}>{changeLabel}</ChartChange>
          </ChartHeader>
          <LineChart
            points={sample.salesTrend.map((value, index) => ({
              periodLabel: TREND_LABELS[index] ?? '',
              value,
              changeRate: null,
            }))}
            unit=""
            direction={null}
            height={150}
            ariaLabel={`${districtName} ${industryName} 매출 추이`}
          />
        </ChartCard>

        <MetricGrid>
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

          <MetricBlock>
            <MetricLabel>폐업률</MetricLabel>
            <MetricValue>{sample.closureRate}</MetricValue>
          </MetricBlock>

          <MetricBlock>
            <MetricLabel>매출 증감%</MetricLabel>
            <ChartChange $positive={isPositive}>{changeLabel}</ChartChange>
          </MetricBlock>
        </MetricGrid>

        <Insight>{sample.insight}</Insight>

        <Cta href="/analysis">이 조건으로 실제 분석하기</Cta>
      </ResultCard>
    </Wrapper>
  )
}
