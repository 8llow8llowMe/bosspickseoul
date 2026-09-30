'use client'

import { useRef, type KeyboardEvent } from 'react'
import { Sparkles } from 'lucide-react'
import styled from 'styled-components'

import DemoFrame, { SampleBadge } from '@/components/home/demo-frame'
import StoryLineChart from '@/components/home/story-line-chart'
import {
  DISTRICTS,
  INDUSTRIES,
  getDemoSample,
  type CompetitionLevel,
  type DemoSelection,
} from '@/data/home-demo'

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

/*
  지역·업종 선택은 머리줄 한 줄의 칩이다(story-panel-redesign.md D4-7). 예전엔 왼쪽
  200px 세로 버튼 목록이라 데모 폭의 3분의 1 을 선택지가 먹었고, 차트는 카드 안의 카드
  안의 회색 박스에 들어가 있었다. 칩 모양은 01 지표 칩(`MetricToggleGroup`)과 같다 —
  두 데모가 같은 조작 문법을 써야 한 제품처럼 보인다.
*/
const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const ChipGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Divider = styled.span`
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: var(--color-border-200);

  @media (max-width: 480px) {
    display: none;
  }
`

const Chip = styled.button<{ $active: boolean }>`
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid
    ${p => (p.$active ? 'var(--color-primary-600)' : 'var(--color-border-200)')};
  border-radius: var(--radius-pill);
  background: ${p =>
    p.$active ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${p =>
    p.$active ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  font-size: 13px;
  font-weight: ${p => (p.$active ? 700 : 600)};
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-600);
    color: var(--color-primary-700);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Result = styled.div`
  display: grid;
  gap: 16px;
`

const ChartBlock = styled.div`
  display: grid;
  gap: 8px;
`

const ChartLabel = styled.span`
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

/*
  지표 3칸. 매출 증감은 뺐다 — 패널 왼쪽의 큰 숫자가 같은 값을 말한다. 예전엔 차트
  머리와 지표 칸에 한 번씩, 두 번 나왔다.
*/
const MetricGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0;

  @media (max-width: 480px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const MetricBlock = styled.div`
  display: grid;
  align-content: start;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
`

const MetricLabel = styled.dt`
  color: var(--color-text-600);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
`

const MetricValue = styled.dd`
  margin: 0;
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
  font-variant-numeric: tabular-nums;
`

const CompetitionBadge = styled.span<{ $level: CompetitionLevel }>`
  display: inline-flex;
  width: fit-content;
  padding: 0 8px;
  border-radius: var(--radius-compact);
  background: var(--color-surface-muted);
  color: ${props => {
    if (props.$level === 'low') return 'var(--color-success)'
    if (props.$level === 'high') return 'var(--color-danger)'
    return 'var(--color-text-700)'
  }};
  font-size: 14px;
  font-weight: 700;
  line-height: 24px;
`

const Insight = styled.p`
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-700);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;

  svg {
    flex: none;
    width: 18px;
    height: 18px;
    margin-top: 2px;
    color: var(--color-primary-700);
  }

  strong {
    color: var(--color-text-900);
    font-weight: 700;
  }
`

/** 02 차트 플롯 높이(px). 패널 높이 예약(product-story)이 이 값에 묶여 있다. */
export const MINI_DEMO_CHART_HEIGHT = 160

export type AnalysisMiniDemoProps = {
  /** `ProductStory` 가 소유한 선택 — 03단계·큰 숫자와 같은 값을 본다(D8-3). */
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
  const lastIndex = sample.salesTrend.length - 1

  const districtGroup = useRovingRadioGroup(DISTRICTS, sel.districtId, id =>
    onSelectionChange({ ...sel, districtId: id }),
  )
  const industryGroup = useRovingRadioGroup(INDUSTRIES, sel.industryId, id =>
    onSelectionChange({ ...sel, industryId: id }),
  )

  const chips = (
    <Chips>
      <ChipGroup
        role="radiogroup"
        aria-label="지역 선택"
        onKeyDown={districtGroup.handleKeyDown}
      >
        {DISTRICTS.map((district, index) => (
          <Chip
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
          </Chip>
        ))}
      </ChipGroup>
      <Divider aria-hidden="true" />
      <ChipGroup
        role="radiogroup"
        aria-label="업종 선택"
        onKeyDown={industryGroup.handleKeyDown}
      >
        {INDUSTRIES.map((industry, index) => (
          <Chip
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
          </Chip>
        ))}
      </ChipGroup>
    </Chips>
  )

  return (
    <DemoFrame leading={chips} aside={<SampleBadge>예시 데이터</SampleBadge>}>
      <Result aria-live="polite">
        <ChartBlock>
          <ChartLabel>매출 추이 · 최근 6개월</ChartLabel>
          <StoryLineChart
            points={sample.salesTrend.map((value, index) => ({
              label: TREND_LABELS[index] ?? '',
              value,
            }))}
            height={MINI_DEMO_CHART_HEIGHT}
            tickCount={3}
            fill="area"
            highlight={{
              index: lastIndex,
              label: String(sample.salesTrend[lastIndex]),
              tone: 'value',
            }}
            ariaLabel={`${districtName} ${industryName} 최근 6개월 매출 추이`}
          />
        </ChartBlock>
        <MetricGrid>
          <MetricBlock>
            <MetricLabel>유동인구</MetricLabel>
            <MetricValue>{sample.footTraffic}</MetricValue>
          </MetricBlock>
          <MetricBlock>
            <MetricLabel>경쟁 강도</MetricLabel>
            <MetricValue>
              <CompetitionBadge $level={sample.competition}>
                {competitionLabel[sample.competition]}
              </CompetitionBadge>
            </MetricValue>
          </MetricBlock>
          <MetricBlock>
            <MetricLabel>폐업률</MetricLabel>
            <MetricValue>{sample.closureRate}</MetricValue>
          </MetricBlock>
        </MetricGrid>
        {/*
          「예시」를 라벨 안에 넣는 것이 요점이다. 이 문장은 home-demo.ts 의 하드코딩
          문자열이라, 「AI 리포트 요약」이라고만 쓰면 하드코딩이 AI 출력인 척하게 된다.
        */}
        <Insight>
          <Sparkles aria-hidden="true" />
          <span>
            <strong>AI 리포트 요약 · 예시</strong> {sample.insight}
          </span>
        </Insight>
      </Result>
    </DemoFrame>
  )
}
