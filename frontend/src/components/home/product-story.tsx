'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import AnalysisMiniDemo from '@/components/home/analysis-mini-demo'
import CostBreakdownBar from '@/components/home/cost-breakdown-bar'
import FunnelCounter from '@/components/home/funnel-counter'
import { HEADER_HEIGHT } from '@/components/home/layout-constants'
import MetricRankingBoard from '@/components/home/metric-ranking-board'
import RecommendPreview from '@/components/home/recommend-preview'
import { activeStepFromProgress } from '@/components/home/scroll-fill'
import {
  STORY_STEPS,
  type StoryDemo,
  type StoryStep,
} from '@/components/home/story-steps'
import { useScrollProgress } from '@/components/home/use-scroll-progress'
import { DEFAULT_SELECTION, type DemoSelection } from '@/data/home-demo'
import { useRecommendPreview } from '@/hooks/use-recommend-preview'

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

  @media (max-width: 768px) {
    font-size: 24px;
    line-height: 34px;
  }

  @media (max-width: 480px) {
    font-size: 21px;
    line-height: 30px;
  }
`

const Track = styled.div`
  height: calc(100dvh * ${STORY_STEPS.length});

  @media (max-width: 768px) {
    height: auto;
  }
`

const Sticky = styled.div`
  position: sticky;
  /* top 을 헤더 높이로 내려 pin 된 박스 상단 자체를 헤더 아래로 보낸다 — 내부
     콘텐츠(아이브로·h2)가 헤더 밴드로 올라갈 하한이 없어진다(R3, 명세 D4-1). */
  top: ${HEADER_HEIGHT};
  min-height: calc(100dvh - ${HEADER_HEIGHT});
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

const Stack = styled.div`
  width: min(760px, 100%);
  margin: 0 auto;
  padding: 0 20px;

  @media (max-width: 480px) {
    padding: 0 16px;
  }
`

// 스택 모드는 Sticky처럼 flex gap이 없어, 카운터와 첫 스텝 사이에 직접 여백을 준다.
const CounterWrap = styled.div`
  margin-bottom: 24px;
`

// 리드(섹션 표제)는 짧은 인트로로만 두고, 각 스텝만 한 화면(100dvh - 헤더)씩
// 차지하게 해 "한 화면 = 한 스텝" 슬라이드로 스크롤되게 한다(단순 나열 개선).
const StackLead = styled.div`
  padding: 56px 0 8px;

  @media (max-width: 480px) {
    padding: 40px 0 8px;
  }
`

const StackItem = styled.article`
  min-height: calc(100dvh - ${HEADER_HEIGHT});
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
`

const StackHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
`

// CTA 규격은 `analysis-mini-demo` 의 것과 맞춘다 — 같은 스토리 안에서 버튼이 달라 보이면
// 단계마다 다른 종류의 행동처럼 읽힌다.
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

const PanelWithCta = styled.div`
  display: grid;
  /* 행을 명시하지 않으면 부모(StoryRow, height:600px + align-items:stretch)가 준
     남는 높이가 두 행에 분배되고, align-self 가 없는 CTA 가 행 높이만큼 늘어난다
     (실측: min-height 48px 선언이 120px 로 렌더됐다). 남는 공간은 패널이 전부 갖는다.
     minmax(0, 1fr) 의 0 은 필수다 — 1fr 만 쓰면 최소 콘텐츠 크기가 하한이 되어
     좁은 폭에서 패널이 넘친다. */
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 16px;
  min-width: 0;

  /* justify-items: start 를 쓰면 안 된다 — 데모 패널까지 내용 폭으로 줄어든다
     (실측: 343px 자리에서 121px 로 찌그러졌다). 폭을 좁히는 건 CTA 뿐이다.
     CSS 주석 안에 백틱을 넣으면 styled 템플릿이 거기서 끊긴다. */
  > a {
    justify-self: start;
  }
`

function DemoPanel({
  demo,
  selection,
  onSelectionChange,
}: {
  demo: StoryDemo
  selection: DemoSelection
  onSelectionChange: (selection: DemoSelection) => void
}) {
  if (demo === 'metrics') return <MetricRankingBoard />
  if (demo === 'mini-demo') {
    return (
      <AnalysisMiniDemo
        selection={selection}
        onSelectionChange={onSelectionChange}
      />
    )
  }
  if (demo === 'recommend') return <RecommendPreview selection={selection} />
  return <CostBreakdownBar />
}

function PanelCard({
  step,
  selection,
  onSelectionChange,
}: {
  step: StoryStep
  selection: DemoSelection
  onSelectionChange: (selection: DemoSelection) => void
}) {
  const { demo, cta } = step
  /*
    각 데모가 자기 라벨을 스스로 판단해 붙인다 — CostBreakdownBar 는 캡션에 항상,
    MetricRankingBoard 와 RecommendPreview 는 폴백일 때만, AnalysisMiniDemo 는
    자체 SampleBadge 로. 여기서 또 그리면 라벨이 두 번 찍힌다.
  */
  return (
    <PanelWithCta>
      <Panel>
        <DemoArea>
          <DemoPanel
            demo={demo}
            selection={selection}
            onSelectionChange={onSelectionChange}
          />
        </DemoArea>
      </Panel>
      {/*
        각 단계에서 그 도구로 나가는 길. 없으면 스토리가 「무엇을 해 주는지」만 말하고
        끝나 막다른 길이 된다(이슈 #176). 미니데모 단계는 데모 안에 이미 CTA 가 있다.
      */}
      {cta ? <Cta href={cta.href}>{cta.label}</Cta> : null}
    </PanelWithCta>
  )
}

// 마운트 후에만 true가 될 수 있는 "스택 모드" 판정(reduced-motion 또는 모바일 폭).
// 초기값 false로 SSR/첫 렌더는 항상 스티키 모드 → hydration 일치.
function useStackedMode(): boolean {
  const [stacked, setStacked] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const narrow = window.matchMedia('(max-width: 768px)')
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

  /*
    스티키/스택 두 렌더 분기 위에 둔다 — 02(미니데모)·03(추천 미리보기)·카운터가
    같은 선택을 봐야 "네 단계로 좁힙니다"가 실제로 좁혀진다(D8-3). 분기 안에서
    각자 useState를 두면 스텝을 넘나들 때 값이 서로 다른 걸 보게 된다.
  */
  const [selection, setSelection] = useState<DemoSelection>(DEFAULT_SELECTION)

  /*
    카운터는 스티키 모드에서 01단계와 함께 즉시 마운트되지만, 트랙은 히어로
    아래(y≈835px)에서 시작해 **랜딩 첫 화면엔 보이지 않는다.** 마운트 == 화면에
    보임이 아니다 — 여기서 곧장 useRecommendPreview를 부르면 방문자가 스크롤을
    한 번도 안 해도 행정동·상권·추천 GET 3개가 나간다(최종 리뷰가 지켜온
    "데스크톱 첫 페인트 = GET 2개"를 되돌리는 회귀).
    그래서 스티키 모드는 카운터(정확히는 아래 counterAnchorRef)가 실제로
    뷰포트에 들어온 뒤에만 연쇄를 켠다. 한 번 켜지면(storyInView=true) 다시
    끄지 않는다 — 스크롤을 올렸다고 진행 중인 요청을 취소하면 안 된다.
    스택 모드는 애초에 모든 스텝이 항상 함께 렌더되므로(기존 동작) 게이트가
    필요 없다.
  */
  const [storyInView, setStoryInView] = useState(false)
  const counterAnchorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (storyInView) return
    const el = counterAnchorRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setStoryInView(true)
          observer.disconnect()
        }
      })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [storyInView])

  /*
    RecommendPreview(03 패널)도 같은 훅을 같은 selection으로 부른다 — 캐시를
    공유하므로 네트워크 요청은 1회다. 그 컴포넌트는 스티키 모드에서 active===2일
    때만 마운트되므로(=사용자가 이미 그 스텝에 있으므로) 자기 호출은 게이트가
    필요 없다. 여기 카운터용 호출만 storyInView로 늦춘다.
  */
  const recommendState = useRecommendPreview(selection, {
    enabled: stacked || storyInView,
  })

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
          <StackLead>
            <StoryLead />
          </StackLead>
          {/* 스택 모드는 "지금 보는 단계" 개념이 없어 강조 없이 1회만 그린다. */}
          <CounterWrap>
            <FunnelCounter selection={selection} recommend={recommendState} />
          </CounterWrap>
          {STORY_STEPS.map(item => (
            <StackItem key={item.step}>
              <StackHead>
                <StepNum $active>{item.step}</StepNum>
                <StepTitle $active>{item.title}</StepTitle>
              </StackHead>
              <StepBody>{item.body}</StepBody>
              <PanelCard
                step={item}
                selection={selection}
                onSelectionChange={setSelection}
              />
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
          {/*
            활성 스텝 노드를 강조해, 스크롤로 넘길 때 어느 단계가 좁혀지는지
            보여준다. ref는 03 연쇄를 언제 켤지 판정하는 IntersectionObserver
            앵커다(위 storyInView 주석) — 스타일에 관여하지 않는다.
          */}
          <div ref={counterAnchorRef}>
            <FunnelCounter
              selection={selection}
              recommend={recommendState}
              active={active}
            />
          </div>
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
            <PanelCard
              step={STORY_STEPS[active]}
              selection={selection}
              onSelectionChange={setSelection}
            />
          </StoryRow>
        </Sticky>
      </Track>
    </Container>
  )
}
