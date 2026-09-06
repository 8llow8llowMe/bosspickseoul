'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import AnalysisMiniDemo from '@/components/home/analysis-mini-demo'
import BreakEvenChart from '@/components/home/break-even-chart'
import { HEADER_HEIGHT } from '@/components/home/layout-constants'
import MetricRankingBoard from '@/components/home/metric-ranking-board'
import RecommendPreview from '@/components/home/recommend-preview'
import { activeStepFromProgress } from '@/components/home/scroll-fill'
import { scrollToPinnedStep } from '@/components/home/scroll-to-pinned-step'
import {
  STORY_STEPS,
  type StoryDemo,
  type StoryStep,
} from '@/components/home/story-steps'
import { useScrollProgress } from '@/components/home/use-scroll-progress'
import {
  DEFAULT_SELECTION,
  findDistrictOption,
  findIndustryOption,
  type DemoSelection,
} from '@/data/home-demo'
import { districts } from '@/data/districts'
import {
  useRecommendPreview,
  type RecommendPreviewState,
} from '@/hooks/use-recommend-preview'
import { useStackedMode } from '@/hooks/use-stacked-mode'
import { centeredColumn } from '@/styles/layout'

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
  /*
    min 과 max 를 함께 준다. min 만 있으면 컨테이너가 콘텐츠 높이만큼 커져서 줄일
    여유분이 생기지 않고, StoryRow 의 flex 축소가 발동하지 않는다 — 실측(1100x800)
    으로 콘텐츠 762px 가 가용 띠 735px 를 27px 넘겼다. 상한을 두면 그 27px 이
    부족분이 되어 StoryRow 가 그만큼 줄어든다.
  */
  min-height: calc(100dvh - ${HEADER_HEIGHT});
  max-height: calc(100dvh - ${HEADER_HEIGHT});
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 32px;
  /*
    스토리만 중앙 컬럼이다. 스티키 스텝목록 + 패널 구조인데 패널을 flex: 0 1 600px
    으로 늘어나지 않게 못박아 뒀다(R5 가로 스택 바가 짧아 늘리면 헐렁해진다).
    셸 전폭으로 열면 그 결정 때문에 우측이 크게 빈다. 패널 확장 재설계는 04단계
    패널 여백 문제와 한 덩어리라 따로 다룬다.
  */
  ${centeredColumn('var(--w-wide)')}
  padding: 32px 0;
`

/*
  데모 박스 높이를 고정해 스텝마다 지도/미니데모/막대차트로 바뀌어도 위쪽 리드
  타이틀·스텝 목록이 흔들리지 않게 한다.

  다만 `height: 600px` 고정은 낮은 뷰포트에서 스티키 콘텐츠를 화면 밖으로 밀어냈다
  (실측 1440x900: 콘텐츠 877px vs 쓸 수 있는 띠 835px → 바닥 42px 이 잘렸다).
  `flex: 0 1 600px` 은 **기본 600px 이되 줄어들 수는 있고 늘어나지는 않는다** —
  늘어나게 두면 큰 화면에서 패널이 과하게 커져 데모가 헐렁해진다.
*/
const StoryRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
  /*
    행도 묶어야 한다. 행을 명시하지 않으면 암시적 행이 max-content 로 잡혀서,
    컨테이너가 줄어도 행은 콘텐츠 크기를 유지하고 자식이 박스 밖으로 그려진다
    (실측 1280x620: 컨테이너 393px 인데 행 534px). minmax 의 0 이 필수다 —
    1fr 만 쓰면 최소 콘텐츠 크기가 하한이 되어 축소가 일어나지 않는다.
  */
  grid-template-rows: minmax(0, 1fr);
  align-items: stretch;
  gap: 40px;
  flex: 0 1 600px;
  min-height: 0;
`

const StepList = styled.ol`
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  /*
    낮은 뷰포트에서 StoryRow 가 줄어들면 네 행(약 494px)이 그 안에 안 들어간다.
    넘침 처리가 없으면 목록이 박스 밖으로 그려져 화면 아래로 삐져나간다
    (실측 1280x620: 행 393px 안에 목록 534px). 밖으로 새는 대신 목록이 스크롤된다.
    min-height: 0 이 없으면 그리드 자식의 최소 콘텐츠 크기가 하한이 되어 축소 자체가
    일어나지 않는다.
  */
  min-height: 0;
  overflow: auto;
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

// 스텝 제목과 그 단계의 수치를 한 줄에 둔다 — 숫자가 그 숫자를 만든 단계 옆에
// 붙어야 「왜 25인가」를 위쪽에서 따로 읽지 않는다.
const StepTitleRow = styled.span`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
`

const StepValue = styled.span`
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-900);
  font-variant-numeric: tabular-nums;
  word-break: keep-all;
  text-align: right;
`

/*
  값을 한정하는 주석(03 「예시」·04 「선택과 무관한 고정 예시」). 값 칸 안에 두면
  칸이 좁아 두 줄로 접히고, 그 행만 6px 높아져 네 행의 높이가 어긋났다 — 값 아래
  전체 폭으로 내려 한 줄에 들어가게 한다.

  주석이 없는 행도 이 줄을 비워 예약한다. 예약하지 않으면 주석이 있는 행만 높아진다
  (인사이트 슬롯과 같은 이유). 스텝 목록은 StoryRow 안이므로 스티키 전체 높이는
  늘어나지 않는다.
*/
const StepNote = styled.span`
  display: block;
  min-height: 16px;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;
  color: var(--color-text-caption);
  text-align: right;
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
  return <BreakEvenChart />
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
    각 데모가 자기 라벨을 스스로 판단해 붙인다 — BreakEvenChart 는 캡션에 항상,
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

/**
 * 각 단계가 「지금 몇 개로 좁혀졌는가」. 옛 `FunnelCounter` 의 네 노드 값을 그대로
 * 옮긴 것이다 — 모든 숫자는 화면에서 유도한다(하드코딩 금지).
 */
function stepFigure(
  index: number,
  selection: DemoSelection,
  recommend: RecommendPreviewState,
): { value: string; note?: string } {
  if (index === 0) return { value: `${districts.length}개 자치구` }

  if (index === 1) {
    const district = findDistrictOption(selection.districtId)?.name ?? '—'
    const industry = findIndustryOption(selection.industryId)?.name ?? '—'
    return { value: `${district} · ${industry}` }
  }

  if (index === 2) {
    if (recommend.isLoading) return { value: '—' }
    const picked = recommend.view.rows.length
    if (recommend.view.isSample)
      return { value: `추천 ${picked}곳`, note: '예시' }
    return { value: `상권 ${recommend.commercialsCount}곳 중 추천 ${picked}곳` }
  }

  /*
    04는 POST /simulations/reports 가 필요해 앞 세 단계처럼 선택을 이어받을 수 없다
    (랜딩 방문자마다 쓰기 요청을 보내지 않기로 한 결정) — 앞 단계는 선택을 따라
    움직이는데 04만 고정이라는 사실을 감추지 않고 그대로 적는다.
  */
  return { value: '1개 예시', note: '선택과 무관한 고정 예시' }
}

function StoryLead() {
  return (
    <Lead>
      <Eyebrow>이렇게 판단합니다</Eyebrow>
      <LeadTitle>
        자치구 25곳에서 시작해 가게 하나의 손익까지, 네 단계로 좁힙니다.
      </LeadTitle>
    </Lead>
  )
}

export default function ProductStory() {
  const { ref: trackRef, progress, element: trackElement } = useScrollProgress()
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
  // pin 구간 클램프 공식은 랭킹 섹션과 공유한다(scroll-to-pinned-step.ts).
  const scrollToStep = (index: number) => {
    if (!trackElement) return
    scrollToPinnedStep(trackElement, index, STORY_STEPS.length)
  }

  if (stacked) {
    return (
      <Container>
        <Stack>
          <StackLead>
            <StoryLead />
          </StackLead>
          {STORY_STEPS.map((item, index) => {
            const figure = stepFigure(index, selection, recommendState)
            return (
              <StackItem key={item.step}>
                <StackHead>
                  <StepNum $active>{item.step}</StepNum>
                  <StepTitle $active>{item.title}</StepTitle>
                </StackHead>
                <StepValue>{figure.value}</StepValue>
                {figure.note ? <StepNote>{figure.note}</StepNote> : null}
                <StepBody>{item.body}</StepBody>
                <PanelCard
                  step={item}
                  selection={selection}
                  onSelectionChange={setSelection}
                />
              </StackItem>
            )
          })}
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
            ref 는 03 연쇄를 언제 켤지 판정하는 IntersectionObserver 앵커다
            (위 storyInView 주석). 카운터가 있던 자리를 대신한다 — 스토리 본문이
            뷰포트에 들어온 시점을 재는 것이 원래 의도였다.
          */}
          <StoryRow ref={counterAnchorRef}>
            <StepList>
              {STORY_STEPS.map((item, index) => {
                const isActive = index === active
                const figure = stepFigure(index, selection, recommendState)
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
                        <StepTitleRow>
                          <StepTitle as="span" $active={isActive}>
                            {item.title}
                          </StepTitle>
                          <StepValue>{figure.value}</StepValue>
                        </StepTitleRow>
                        <StepNote>{figure.note ?? ''}</StepNote>
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
