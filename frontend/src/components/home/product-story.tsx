// src/components/home/product-story.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import AnalysisMiniDemo from '@/components/home/analysis-mini-demo'
import MiniAreaChart from '@/components/home/mini-area-chart'
import SeoulDistrictsMap from '@/components/home/seoul-districts-map'
import { activeStepFromProgress } from '@/components/home/scroll-fill'
import { STORY_STEPS, type StoryDemo } from '@/components/home/story-steps'
import { useScrollProgress } from '@/components/home/use-scroll-progress'

const Container = styled.section`
  position: relative;
`

const Track = styled.div`
  height: calc(100dvh * ${STORY_STEPS.length});

  @media (max-width: 640px) {
    height: auto;
  }
`

const Sticky = styled.div`
  position: sticky;
  top: 0;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
  align-items: center;
  gap: 40px;
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 64px 20px;

  @media (max-width: 640px) {
    position: static;
    min-height: auto;
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 48px 16px;
  }
`

const StepList = styled.ol`
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const StepItem = styled.li<{ $active: boolean }>`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius-card);
  background: ${p => (p.$active ? 'var(--color-primary-100)' : 'transparent')};
  transition: background-color var(--motion-standard) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const StepNum = styled.span<{ $active: boolean }>`
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${p => (p.$active ? 'var(--color-primary-700)' : 'var(--color-text-caption)')};
`

const StepTitle = styled.h3<{ $active: boolean }>`
  font-size: 17px;
  font-weight: 600;
  line-height: 24px;
  color: ${p => (p.$active ? 'var(--color-text-900)' : 'var(--color-text-700)')};
`

const StepBody = styled.p`
  margin-top: 4px;
  font-size: 14px;
  line-height: 21px;
  color: var(--color-text-600);
  word-break: keep-all;
`

const Panel = styled.div`
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 20px;
  min-height: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const SampleLabel = styled.span`
  align-self: flex-start;
  font-size: 12px;
  color: var(--color-text-caption);
`

const RecommendRow = styled.div<{ $lead: boolean }>`
  display: flex;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: var(--radius-control);
  border: 1px solid var(--color-border-200);
  background: ${p => (p.$lead ? 'var(--color-primary-100)' : 'var(--color-surface)')};
  color: ${p => (p.$lead ? 'var(--color-primary-700)' : 'var(--color-text-700)')};
  font-size: 14px;
`

const SimGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

const SimCard = styled.div`
  border-radius: var(--radius-control);
  background: var(--color-background-muted);
  padding: 14px;
`

const SimLabel = styled.p`
  font-size: 12px;
  color: var(--color-text-600);
  margin: 0 0 4px;
`

const SimValue = styled.p`
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  font-variant-numeric: tabular-nums;
`

const ChartWrap = styled.div`
  color: var(--color-primary-700);
`

const Stack = styled.div`
  width: min(760px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 32px;
  padding: 48px 16px;
`

const StackItem = styled.article`
  display: grid;
  gap: 12px;
`

const StackHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
`

function DemoPanel({ demo }: { demo: StoryDemo }) {
  if (demo === 'map') return <SeoulDistrictsMap />
  if (demo === 'mini-demo') return <AnalysisMiniDemo />
  if (demo === 'recommend') {
    const rows = [
      { name: '역삼동 상권', score: '92점', lead: true },
      { name: '서교동 상권', score: '88점', lead: false },
      { name: '연남동 상권', score: '85점', lead: false },
    ]
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map(row => (
          <RecommendRow key={row.name} $lead={row.lead}>
            <span>{row.name}</span>
            <span style={{ fontWeight: 600 }}>{row.score}</span>
          </RecommendRow>
        ))}
      </div>
    )
  }
  return (
    <div>
      <ChartWrap>
        <MiniAreaChart values={[32, 40, 38, 52, 60, 74]} />
      </ChartWrap>
      <SimGrid>
        <SimCard>
          <SimLabel>예상 월매출</SimLabel>
          <SimValue>4,200만</SimValue>
        </SimCard>
        <SimCard>
          <SimLabel>고정비</SimLabel>
          <SimValue>2,600만</SimValue>
        </SimCard>
      </SimGrid>
    </div>
  )
}

function PanelCard({ demo }: { demo: StoryDemo }) {
  return (
    <Panel>
      <SampleLabel>대표 예시 데이터</SampleLabel>
      <DemoPanel demo={demo} />
    </Panel>
  )
}

// 마운트 후에만 true가 될 수 있는 "스택 모드" 판정(reduced-motion 또는 모바일 폭).
// 초기값 false로 SSR/첫 렌더는 항상 스티키 모드 → hydration 일치.
function useStackedMode(): boolean {
  const [stacked, setStacked] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const narrow = window.matchMedia('(max-width: 640px)')
    const update = () => setStacked(reduced.matches || narrow.matches)
    update()
    reduced.addEventListener('change', update)
    narrow.addEventListener('change', update)
    return () => {
      reduced.removeEventListener('change', update)
      narrow.removeEventListener('change', update)
    }
  }, [])
  return stacked
}

export default function ProductStory() {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const progress = useScrollProgress(trackRef)
  const active = activeStepFromProgress(progress, STORY_STEPS.length)
  const stacked = useStackedMode()

  if (stacked) {
    return (
      <Container>
        <Stack>
          {STORY_STEPS.map(item => (
            <StackItem key={item.step}>
              <StackHead>
                <StepNum $active>{item.step}</StepNum>
                <StepTitle $active>{item.title}</StepTitle>
              </StackHead>
              <StepBody>{item.body}</StepBody>
              <PanelCard demo={item.demo} />
            </StackItem>
          ))}
        </Stack>
      </Container>
    )
  }

  return (
    <Container>
      <Track ref={trackRef}>
        <Sticky>
          <StepList>
            {STORY_STEPS.map((item, index) => {
              const isActive = index === active
              return (
                <StepItem key={item.step} $active={isActive}>
                  <StepNum $active={isActive}>{item.step}</StepNum>
                  <div>
                    <StepTitle $active={isActive}>{item.title}</StepTitle>
                    <StepBody>{item.body}</StepBody>
                  </div>
                </StepItem>
              )
            })}
          </StepList>
          <PanelCard demo={STORY_STEPS[active].demo} />
        </Sticky>
      </Track>
    </Container>
  )
}
