'use client'

import { useRef, type KeyboardEvent } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import {
  DISTRICTS,
  INDUSTRIES,
  getDemoSample,
  type CompetitionLevel,
  type DemoSelection,
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
  gap: 16px;
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

/*
  스토리 02 단계의 데모다. **패널 높이(데모 영역 494px)에 맞춰 접는다.**

  이전에는 이 카드가 587px 이라 패널 안에서 세로 스크롤이 생겼다 — 스토리는 스크롤로
  단계를 넘기는 구간이라, 그 안에서 또 스크롤되는 영역은 휠이 어느 쪽을 움직일지
  모호해진다(단계가 안 넘어가거나 카드가 안 내려간다). 여백·차트 높이를 줄여
  **한 화면에 담기게** 한다.

  줄인 곳: gap 18 → 12 · padding 24 → 20 · 차트 150 → 128. 셋을 조금씩 나눠 줄인 이유는
  한 곳만 크게 줄이면 그 요소만 눈에 띄게 답답해지기 때문이다.
*/
const ResultCard = styled.div`
  display: grid;
  gap: 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-2);
  padding: 20px;
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
  gap: 8px;
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

/*
  지표 4개. `repeat(2, 1fr)` 고정이면 **패널이 아무리 넓어도 2행**이라 데스크톱에서
  한 행치(약 58px)를 그냥 버렸다 — 02 패널이 넘치던 높이의 대부분이 이것이다.
  `auto-fit` 으로 바꿔 폭이 되면 4열 1행, 좁으면 2열로 접힌다.
*/
const MetricGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));

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

const InsightLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-caption);
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

export type AnalysisMiniDemoProps = {
  /** `ProductStory` 가 소유한 선택 — 03단계·카운터와 같은 값을 본다(D8-3). */
  selection: DemoSelection
  onSelectionChange: (selection: DemoSelection) => void
}

export default function AnalysisMiniDemo({
  selection: sel,
  onSelectionChange,
}: AnalysisMiniDemoProps) {
  const sample = getDemoSample(sel.districtId, sel.industryId)
  const districtName =
    DISTRICTS.find(district => district.id === sel.districtId)?.name ?? ''
  const industryName =
    INDUSTRIES.find(industry => industry.id === sel.industryId)?.name ?? ''
  const isPositive = sample.salesChangePct >= 0
  const changeLabel = `${isPositive ? '+' : ''}${sample.salesChangePct}%`

  const districtGroup = useRovingRadioGroup(DISTRICTS, sel.districtId, id =>
    onSelectionChange({ ...sel, districtId: id }),
  )
  const industryGroup = useRovingRadioGroup(INDUSTRIES, sel.industryId, id =>
    onSelectionChange({ ...sel, industryId: id }),
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
                  onSelectionChange({ ...sel, districtId: district.id })
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
                  onSelectionChange({ ...sel, industryId: industry.id })
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
            height={128}
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

        {/*
          「예시」를 라벨 안에 넣는 것이 요점이다. 이 문장은 home-demo.ts 의 하드코딩
          문자열이라, 「AI 리포트 요약」이라고만 쓰면 하드코딩이 AI 출력인 척하게 된다.
        */}
        <InsightLabel>AI 리포트 요약 · 예시</InsightLabel>
        <Insight>{sample.insight}</Insight>

        <Cta href="/analysis">이 조건으로 AI 리포트 받기</Cta>
      </ResultCard>
    </Wrapper>
  )
}
