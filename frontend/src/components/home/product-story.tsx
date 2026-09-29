'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'

import AnalysisMiniDemo from '@/components/home/analysis-mini-demo'
import BreakEvenChart from '@/components/home/break-even-chart'
import { HOME_COLUMN } from '@/components/home/layout-constants'
import MetricRankingBoard from '@/components/home/metric-ranking-board'
import RecommendPreview from '@/components/home/recommend-preview'
import StepTabs, {
  STORY_PANEL_ID,
  storyTabId,
} from '@/components/home/step-tabs'
import { STORY_STEPS, type StoryDemo } from '@/components/home/story-steps'
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

/*
  판단 흐름 — 네 단계를 탭으로 바꿔 보는 섹션(home-restructure.md).

  예전엔 네 도구 보드 · 앵커 문장 · 스티키 스토리(400dvh)가 같은 네 단계를 세 번
  말했다. 지금은 여기 한 번이고, 스크롤을 붙잡지 않는다. 전폭 배경 밴드(#223)는 유지한다.
*/
const Container = styled.section`
  position: relative;
  background: var(--color-background-muted);
  padding: 96px 0;

  @media (max-width: 900px) {
    padding: 72px 0;
  }

  @media (max-width: 640px) {
    padding: 56px 0;
  }
`

const Inner = styled.div`
  ${HOME_COLUMN}
  display: grid;
  gap: 24px;
`

const Lead = styled.div`
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

/*
  넓은 화면(1100px 이상)은 가장 큰 데모(02 미니데모 실측 563px, 패널 테두리 포함)를
  예약한다. 탭을 바꿔도 아래 랭킹 섹션이 밀리지 않는다(명세 D4-2).

  1099px 이하는 예약하지 않는다. 데모 칸이 약 560px 보다 좁아지면 미니데모가 세로로
  쌓여 706(1024) · 805px(780)까지 커지는데, 그만큼 예약하면 다른 탭에 200px 넘는
  빈칸이 생긴다. 밀리는 것은 보고 있는 패널 아래다(모바일과 같은 판단).
  데모가 커지면 이 값을 다시 잰다.
*/
const Panel = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 40px;
  min-height: 564px;
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }

  @media (max-width: 1099px) {
    min-height: 0;
  }

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
    padding: 16px;
  }
`

const Copy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 8px 4px;
`

const PanelTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
  word-break: keep-all;
`

const Body = styled.p`
  color: var(--color-text-600);
  font-size: 15px;
  line-height: 24px;
  word-break: keep-all;
`

const Outcome = styled.div`
  display: grid;
  gap: 2px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-200);
`

const OutcomeLabel = styled.span`
  color: var(--color-text-caption);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
`

const OutcomeText = styled.span`
  color: var(--color-text-700);
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  word-break: keep-all;
`

const Note = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

/*
  CTA 는 설명 묶음 바로 뒤에 둔다. 패널 바닥(margin-top: auto)에 붙이면 01 처럼 데모가
  긴 단계에서 「손에 남는 것」과 버튼 사이가 300px 가까이 비어 끊겨 보였다.
*/
const Cta = styled(Link)`
  margin-top: 8px;
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

/*
  데모는 세로 가운데. justify-content: center 대신 자식 margin-block: auto — 넘칠 때
  위쪽이 잘리지 않는다(PR #424 규칙 승계).
*/
const DemoArea = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  > * {
    margin-block: auto;
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

/**
 * 탭에 싣는 수치. 모든 숫자는 화면에서 유도한다(하드코딩 금지).
 * 04 는 POST 가 필요해 선택을 이어받지 않는다 — 「예시」라고만 적고 이유는 패널 note 가 말한다.
 */
function stepFigure(
  index: number,
  selection: DemoSelection,
  recommend: RecommendPreviewState,
): string {
  if (index === 0) return `${districts.length}개 자치구`

  if (index === 1) {
    const district = findDistrictOption(selection.districtId)?.name ?? '—'
    const industry = findIndustryOption(selection.industryId)?.name ?? '—'
    return `${district} · ${industry}`
  }

  if (index === 2) {
    if (recommend.isLoading) return '—'
    const picked = recommend.view.rows.length
    if (recommend.view.isSample) return `추천 ${picked}곳 · 예시`
    return `상권 ${recommend.commercialsCount}곳 중 추천 ${picked}곳`
  }

  return '예시'
}

export default function ProductStory() {
  const [selected, setSelected] = useState(0)

  /* 02(미니데모)·03(추천)·탭 수치가 같은 선택을 봐야 네 단계가 실제로 이어진다. */
  const [selection, setSelection] = useState<DemoSelection>(DEFAULT_SELECTION)

  /*
    03 탭 수치를 위해 추천 연쇄를 섹션 수준에서 부른다. 곧장 켜면 스크롤을 안 해도
    GET 3개가 나가 「첫 페인트 = GET 2개」가 깨진다.

    섹션이 아니라 **탭 목록이 다 보일 때** 켠다. 판단 흐름이 히어로 바로 뒤라 1440x900
    에서 섹션 윗단 65px 가 첫 화면에 걸리고, 섹션 기준이면 스크롤 없이 요청이 나갔다
    (e2e bffRequests 2 → 5). 그 수치가 실제로 보이는 곳이 탭이다. 한 번 켜면 다시
    끄지 않는다 — 스크롤을 올렸다고 진행 중인 요청을 취소하지 않는다.
  */
  const [tabsVisible, setTabsVisible] = useState(false)
  const tabsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (tabsVisible) return
    const element = tabsRef.current
    if (!element) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setTabsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 1 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [tabsVisible])

  /* 03 패널의 RecommendPreview 도 같은 훅·같은 selection 이라 캐시를 공유한다(요청 1회). */
  const recommendState = useRecommendPreview(selection, {
    enabled: tabsVisible,
  })

  const step = STORY_STEPS[selected]
  const figures = STORY_STEPS.map((_, index) =>
    stepFigure(index, selection, recommendState),
  )

  return (
    <Container aria-label="판단 흐름">
      <Inner>
        <Lead>
          <Eyebrow>이렇게 판단해요</Eyebrow>
          <LeadTitle>
            자치구 25곳에서 시작해 가게 하나의 손익까지, 네 단계로 좁혀요.
          </LeadTitle>
        </Lead>

        <div ref={tabsRef}>
          <StepTabs
            steps={STORY_STEPS}
            selected={selected}
            figures={figures}
            onSelect={setSelected}
          />
        </div>

        {/*
          활성 패널만 렌더한다 — 비활성 패널을 hidden 으로 두면 데모가 모두 마운트돼
          요청이 늘어난다. 02 는 미니데모가 CTA 를 들고 있어 여기 CTA 가 없다.
        */}
        <Panel
          role="tabpanel"
          id={STORY_PANEL_ID}
          aria-labelledby={storyTabId(step.step)}
          tabIndex={0}
        >
          <Copy>
            <PanelTitle>{step.title}</PanelTitle>
            <Body>{step.body}</Body>
            <Outcome>
              <OutcomeLabel>손에 남는 것</OutcomeLabel>
              <OutcomeText>{step.outcome}</OutcomeText>
            </Outcome>
            {step.note ? <Note>{step.note}</Note> : null}
            {step.cta ? <Cta href={step.cta.href}>{step.cta.label}</Cta> : null}
          </Copy>
          <DemoArea>
            <DemoPanel
              demo={step.demo}
              selection={selection}
              onSelectionChange={setSelection}
            />
          </DemoArea>
        </Panel>
      </Inner>
    </Container>
  )
}
