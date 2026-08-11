'use client'

import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import AnalysisMiniDemo from '@/components/home/analysis-mini-demo'
import SeoulDistrictsMap from '@/components/home/seoul-districts-map'
import BarChart from '@/components/analysis/charts/bar-chart'
import { activeStepFromProgress } from '@/components/home/scroll-fill'
import { STORY_STEPS, type StoryDemo } from '@/components/home/story-steps'
import { useScrollProgress } from '@/components/home/use-scroll-progress'

const Container = styled.section`
  position: relative;
`

const Lead = styled.div`
  width: 100%;
  margin: 0;
  display: grid;
  gap: 10px;
`

const Eyebrow = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const LeadTitle = styled.h2`
  max-width: 680px;
  color: var(--color-text-900);
  font-size: 26px;
  font-weight: 700;
  line-height: 36px;
  word-break: keep-all;
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
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 32px;
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 32px 20px;
`

// 데모 박스 높이를 고정해 스텝마다 지도/미니데모/막대차트로 바뀌어도
// 위쪽 리드 타이틀·스텝 목록이 흔들리지 않게 한다.
const StoryRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
  align-items: stretch;
  gap: 40px;
  height: 600px;
`

const StepList = styled.ol`
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const StepButton = styled.button<{ $active: boolean }>`
  width: 100%;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  padding: 14px 16px;
  border: none;
  border-radius: var(--radius-card);
  background: ${p => (p.$active ? 'var(--color-primary-100)' : 'transparent')};
  text-align: left;
  cursor: pointer;
  transition: background-color var(--motion-standard) var(--ease-standard);

  &:hover {
    background: ${p =>
      p.$active ? 'var(--color-primary-100)' : 'var(--color-background-muted)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const StepNum = styled.span<{ $active: boolean }>`
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${p =>
    p.$active ? 'var(--color-primary-700)' : 'var(--color-text-caption)'};
`

const StepText = styled.span`
  display: grid;
  gap: 2px;
`

const StepTitle = styled.h3<{ $active: boolean }>`
  display: block;
  font-size: 17px;
  font-weight: 600;
  line-height: 24px;
  color: ${p =>
    p.$active ? 'var(--color-text-900)' : 'var(--color-text-700)'};
`

const StepBody = styled.p`
  display: block;
  margin: 0;
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
  height: 100%;
  min-height: 320px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const DemoArea = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
`

const SampleLabel = styled.span`
  align-self: flex-start;
  font-size: 12px;
  color: var(--color-text-caption);
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
    return (
      <BarChart
        items={[
          { label: '역삼동', value: 92 },
          { label: '서교동', value: 88 },
          { label: '연남동', value: 85 },
          { label: '성수동', value: 83 },
          { label: '망원동', value: 79 },
        ]}
        unit="점"
        emphasisLabels={['역삼동']}
        maxBarSize={44}
        height={320}
        ariaLabel="추천 상권 종합 점수 막대 차트"
      />
    )
  }
  return (
    <BarChart
      items={[
        { label: '월매출', value: 4200 },
        { label: '고정비', value: 2600 },
        { label: '순이익', value: 1600 },
      ]}
      unit="만원"
      emphasisLabels={['순이익']}
      maxBarSize={64}
      height={320}
      ariaLabel="창업 비용·매출 시뮬레이션 막대 차트"
    />
  )
}

function PanelCard({ demo }: { demo: StoryDemo }) {
  // 미니데모는 자체적으로 "대표 예시 데이터" 배지를 가지므로 중복 라벨을 숨긴다.
  return (
    <Panel>
      {demo === 'mini-demo' ? null : (
        <SampleLabel>대표 예시 데이터</SampleLabel>
      )}
      <DemoArea>
        <DemoPanel demo={demo} />
      </DemoArea>
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

function StoryLead() {
  return (
    <Lead>
      <Eyebrow>이렇게 판단합니다</Eyebrow>
      <LeadTitle>
        현황 확인부터 창업 시뮬레이션까지, 네 단계로 좁힙니다.
      </LeadTitle>
    </Lead>
  )
}

export default function ProductStory() {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const progress = useScrollProgress(trackRef)
  const active = activeStepFromProgress(progress, STORY_STEPS.length)
  const stacked = useStackedMode()

  // 스텝 클릭 시 해당 스텝 구간의 중앙으로 스크롤한다.
  // useScrollProgress의 진행도 정의: progress = (vh - top) / (H + vh).
  // 스티키가 고정(pin)되는 구간은 progress ∈ [vh/(H+vh), H/(H+vh)]이므로,
  // 스텝 중앙 목표를 그 범위로 클램프해야 트랙 위/아래로 튀지 않는다.
  const scrollToStep = (index: number) => {
    const el = trackRef.current
    if (!el) return
    const vh = window.innerHeight
    const trackHeight = el.offsetHeight
    const trackTop = el.getBoundingClientRect().top + window.scrollY
    const denom = trackHeight + vh
    const pinStart = vh / denom
    const pinEnd = trackHeight / denom
    const margin = 0.02
    const center = (index + 0.5) / STORY_STEPS.length
    const targetProgress = Math.min(
      pinEnd - margin,
      Math.max(pinStart + margin, center),
    )
    const target = targetProgress * denom - vh + trackTop
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({
      top: Math.max(0, target),
      behavior: reduce ? 'auto' : 'smooth',
    })
  }

  if (stacked) {
    return (
      <Container>
        <Stack>
          <StoryLead />
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
          <StoryLead />
          <StoryRow>
            <StepList>
              {STORY_STEPS.map((item, index) => {
                const isActive = index === active
                return (
                  <li key={item.step}>
                    <StepButton
                      type="button"
                      $active={isActive}
                      aria-current={isActive ? 'true' : undefined}
                      onClick={() => scrollToStep(index)}
                    >
                      <StepNum as="span" $active={isActive}>
                        {item.step}
                      </StepNum>
                      <StepText>
                        <StepTitle as="span" $active={isActive}>
                          {item.title}
                        </StepTitle>
                        <StepBody as="span">{item.body}</StepBody>
                      </StepText>
                    </StepButton>
                  </li>
                )
              })}
            </StepList>
            <PanelCard demo={STORY_STEPS[active].demo} />
          </StoryRow>
        </Sticky>
      </Track>
    </Container>
  )
}
