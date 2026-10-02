'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import styled from 'styled-components'

import AnalysisMiniDemo from '@/components/home/analysis-mini-demo'
import BreakEvenChart, {
  BREAK_EVEN_MONTHS,
  buildCumulativeProfit,
  findBreakEvenMonth,
} from '@/components/home/break-even-chart'
import {
  HEADER_HEIGHT,
  HOME_COLUMN,
  HOME_FULL_SCREEN_SECTION,
} from '@/components/home/layout-constants'
import MetricRankingBoard from '@/components/home/metric-ranking-board'
import RecommendPreview, {
  toNarrowingSegments,
} from '@/components/home/recommend-preview'
import StepTabs, {
  STORY_PANEL_ID,
  storyTabId,
} from '@/components/home/step-tabs'
import {
  STORY_PIN_QUERY,
  STORY_STEP_SCROLL_DVH,
} from '@/components/home/story-scroll'
import { STORY_STEPS, type StoryDemo } from '@/components/home/story-steps'
import { useStoryPin } from '@/components/home/use-story-pin'
import {
  DEFAULT_SELECTION,
  findDistrictOption,
  findIndustryOption,
  getDemoSample,
  type DemoSelection,
} from '@/data/home-demo'
import { districts } from '@/data/districts'
import {
  useRecommendPreview,
  type RecommendPreviewState,
} from '@/hooks/use-recommend-preview'
import { trackAttrs, trackEvent } from '@/lib/analytics/events'

/*
  판단 흐름 — 네 단계를 탭으로 바꿔 보는 섹션(home-restructure.md).

  예전엔 네 도구 보드 · 앵커 문장 · 스티키 스토리(400dvh)가 같은 네 단계를 세 번
  말했다. 지금은 여기 한 번이고, 스크롤을 붙잡지 않는다. 전폭 배경 밴드(#223)는 유지한다.
*/
const Container = styled.section`
  ${HOME_FULL_SCREEN_SECTION}
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

/*
  머리말은 고정 칸(PinSticky) 안에 있다 — 01~04 를 넘기는 동안 무엇의 단계인지 보여야 한다
  (full-screen-sections-and-live-tooltip.md D4-2). 고정 모드에서는 제목을 한 줄로 펴고 간격을
  줄여 높이를 62px 로 묶는다. 그 값이 STORY_PIN_QUERY 최소 높이(800)의 근거다.
*/
const Lead = styled.div`
  display: grid;
  gap: 10px;

  @media ${STORY_PIN_QUERY} {
    gap: 6px;
  }
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

  @media ${STORY_PIN_QUERY} {
    max-width: none;
  }
`

/*
  넓고 높은 화면에서 탭+패널을 화면에 고정하고, 스크롤한 만큼 01 → 04 로 넘긴다
  (story-scroll-pin.md). 레이아웃은 **CSS 미디어 쿼리로만** 정한다 — JS 가 모드를 판정하기
  전(서버 렌더·첫 페인트)에도 트랙 높이가 맞아 페이지 높이가 튀지 않는다. JS(useStoryPin)는
  같은 쿼리 문자열로 선택만 스크롤에 맞춘다.

  트랙 = 고정 칸 높이(100dvh - 헤더) + 단계당 60dvh × 4. 앞의 몫은 sticky 가 붙어 있는 칸
  자체이고, 뒤의 몫이 스크롤로 단계를 넘기는 구간(pinSpan)이다.
*/
const PinTrack = styled.div`
  @media ${STORY_PIN_QUERY} {
    height: calc(
      100dvh - ${HEADER_HEIGHT} +
        ${STORY_STEP_SCROLL_DVH * STORY_STEPS.length}dvh
    );
  }
`

const PinSticky = styled.div`
  display: grid;
  gap: 24px;

  @media ${STORY_PIN_QUERY} {
    position: sticky;
    top: ${HEADER_HEIGHT};
    height: calc(100dvh - ${HEADER_HEIGHT});
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 16px;
  }
`

/**
 * 1100px 이상 패널 높이 예약(px). 실측(2026-09-30) 최댓값 — 1100px 에서 02 칩이 두 줄로
 * 접힐 때 570, 1280 이상은 538. 데모가 바뀌면 story-panel-redesign D7 TC-SP-103 으로 다시 잰다.
 */
const PANEL_MIN_HEIGHT = 570

/*
  2열 4:8 — 왼쪽은 큰 숫자 한 개와 짧은 설명, 오른쪽은 데모(story-panel-redesign.md D4-2).
  예전 5:7 은 왼쪽 글이 위쪽 200px 남짓만 차지해 칸의 60% 넘게 비었다. 글을 세로
  가운데 두고 칸을 줄여 데모에 폭을 준다.

  넓은 화면(1100px 이상)은 가장 큰 데모 높이를 예약한다 — 탭을 바꿔도 아래 랭킹 섹션이
  밀리지 않는다. 1099px 이하는 예약하지 않는다: 데모가 좁은 칸에서 세로로 쌓여 커지는데,
  그만큼 예약하면 다른 탭에 큰 빈칸이 생긴다(home-restructure.md D4-2 의 판단 승계).
  데모가 바뀌면 이 값을 다시 잰다.
*/
const Panel = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
  gap: 48px;
  min-height: ${PANEL_MIN_HEIGHT}px;
  padding: 32px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }

  @media (max-width: 1099px) {
    min-height: 0;
    gap: 32px;
    padding: 24px;
  }

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
    padding: 16px;
  }
`

const Copy = styled.div`
  display: flex;
  flex-direction: column;
  align-self: center;
  min-width: 0;
  padding: 8px 8px 8px 0;

  @media (max-width: 768px) {
    padding: 4px;
  }
`

/*
  단계명. 탭이 이미 크게 말하므로 작게 — 패널의 제목(h3) 구조만 지킨다.
  primary-700(#0ea5e9)은 흰 바탕 2.77:1 이라 글자에 쓰지 않는다.
*/
const StepLabel = styled.h3`
  color: var(--color-text-600);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  word-break: keep-all;
`

/*
  큰 숫자는 DESIGN.md §3 Number Display(30px · 700 · tabular)다. 시안은 48px 이었지만 스케일
  (12·13·14·16·20·22·26·30) 밖이라 e2e `offScaleFontSizes` 가 늘었다 — 스케일 안에서 가장
  큰 값을 쓰고, 둘레의 글자를 16px 이하로 두어 대비를 만든다.
*/
const Highlight = styled.p`
  margin-top: 12px;
  color: var(--color-text-900);
  font-size: 30px;
  font-weight: 700;
  line-height: 40px;
  font-variant-numeric: tabular-nums;
  word-break: keep-all;
`

const HighlightUnit = styled.span`
  margin-left: 2px;
  font-size: 20px;
`

const HighlightArrow = styled.span`
  margin: 0 8px;
  color: var(--color-text-caption);
  font-weight: 500;
`

/* 자간을 물려받지 않게 큰 숫자 밖에 둔다 — 시안에서 캡션이 뭉개졌다. */
const HighlightCaption = styled.p`
  margin-top: 4px;
  color: var(--color-text-600);
  font-size: 15px;
  font-weight: 500;
  line-height: 22px;
  word-break: keep-all;
`

const Body = styled.p`
  margin-top: 20px;
  color: var(--color-text-700);
  font-size: 16px;
  line-height: 24px;
  word-break: keep-all;
`

const Outcome = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 16px;
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  word-break: keep-all;

  svg {
    flex: none;
    width: 18px;
    height: 18px;
    margin-top: 2px;
    color: var(--color-primary-700);
  }
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

const Note = styled.p`
  margin-top: 8px;
  color: var(--color-text-caption);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

const Cta = styled(Link)`
  margin-top: 28px;
  min-height: 48px;
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 20px;
  border-radius: var(--radius-control);
  background: var(--color-fill-primary-text);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  transition: background-color var(--motion-fast) var(--ease-standard);

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: var(--color-fill-primary-text-hover);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }

  @media (max-width: 768px) {
    margin-top: 20px;
  }
`

/*
  데모 틀은 칸 높이를 채운다. 가운데 정렬로 두면 틀 높이가 탭마다 달라(384~504px)
  탭을 넘길 때 틀이 출렁였다 — 「네 데모가 같은 틀」이라는 D4-4 가 화면에서 깨진다.
  틀 안의 꼬리는 바닥에 붙는다(DemoFrame).
*/
const DemoArea = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  > * {
    flex: 1 1 auto;
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

export type StepHighlight = { value: string; unit: string; caption: string }

/**
 * 패널 왼쪽의 큰 숫자(story-panel-redesign.md D4-3). **모든 값은 화면에서 유도한다** —
 * 여기 고정 문자열로 박으면 데모와 어긋난다(D5-6 에서 시안의 `25→8→3→1` 을 폐기한 이유).
 */
export function stepHighlight(
  index: number,
  selection: DemoSelection,
  recommend: RecommendPreviewState,
): StepHighlight {
  if (index === 0) {
    return {
      value: String(districts.length),
      unit: '곳',
      caption: '서울 자치구 전체',
    }
  }

  if (index === 1) {
    const { salesChangePct } = getDemoSample(
      selection.districtId,
      selection.industryId,
    )
    const district = findDistrictOption(selection.districtId)?.name ?? ''
    const industry = findIndustryOption(selection.industryId)?.name ?? ''
    return {
      value: `${salesChangePct >= 0 ? '+' : ''}${salesChangePct}`,
      unit: '%',
      caption: `${district} ${industry} · 최근 6개월 매출`,
    }
  }

  if (index === 2) {
    if (recommend.isLoading) {
      return {
        value: '—',
        unit: '',
        caption: '조건에 맞는 상권을 찾고 있어요',
      }
    }
    const picked = recommend.view.rows.length
    if (recommend.view.isSample) {
      return { value: String(picked), unit: '곳', caption: '추천 후보 · 예시' }
    }
    // 총계가 추천 수보다 작으면 비율을 믿을 수 없다 — 03 데모의 퍼널과 같은 판정이다.
    if (toNarrowingSegments(recommend.commercialsCount, picked)) {
      return {
        value: `${recommend.commercialsCount} → ${picked}`,
        unit: '곳',
        caption: `상권 ${recommend.commercialsCount}곳 중 조건에 맞는 곳`,
      }
    }
    return { value: String(picked), unit: '곳', caption: '조건에 맞는 상권' }
  }

  // 04 는 POST 가 필요해 선택을 이어받지 않는다 — 「예시」라고 적고 이유는 패널 note 가 말한다.
  const breakEven = findBreakEvenMonth(buildCumulativeProfit())
  if (breakEven === null) {
    return {
      value: `${BREAK_EVEN_MONTHS}+`,
      unit: '개월',
      caption: '이 기간 안에는 회수하지 못해요 · 예시',
    }
  }
  return {
    value: String(breakEven),
    unit: '개월',
    caption: '투자금을 회수하는 시점 · 예시',
  }
}

export default function ProductStory() {
  const [selected, setSelected] = useState(0)

  /*
    고정 모드에서는 스크롤 위치가 선택의 정본이다. 탭 클릭·키보드는 state 를 바로 바꾸지
    않고 그 단계 몫으로 스크롤한다 — 선택이 스크롤 결과로 따라와 둘이 어긋나지 않는다.
  */
  const { pinned, attachTrack, scrollToStep } = useStoryPin(
    STORY_STEPS.length,
    setSelected,
  )
  const handleSelect = (index: number) => {
    if (pinned) scrollToStep(index)
    else setSelected(index)
  }

  /* 02(미니데모)·03(추천)·탭 수치가 같은 선택을 봐야 네 단계가 실제로 이어진다. */
  const [selection, setSelection] = useState<DemoSelection>(DEFAULT_SELECTION)
  const handleSelectionChange = (next: DemoSelection) => {
    // 칩 하나가 바뀌면 바뀐 쪽만 보낸다. 같은 칩을 다시 눌러도 이벤트를 남기지 않는다.
    if (next.districtId !== selection.districtId) {
      const code = findDistrictOption(next.districtId)?.code
      if (code) {
        trackEvent('home_story_demo_select', { field: 'district', value: code })
      }
    }
    if (next.industryId !== selection.industryId) {
      const code = findIndustryOption(next.industryId)?.code
      if (code) {
        trackEvent('home_story_demo_select', { field: 'industry', value: code })
      }
    }
    setSelection(next)
  }

  /*
    활성 단계가 바뀔 때마다 한 번. 탭 클릭이든 고정 스크롤이든 「그 단계를 봤다」가 같다.
    첫 렌더(01)는 보낸 게 아니라 놓인 것이라 빼고, 같은 단계로의 재설정도 세지 않는다.
  */
  const viewedStepRef = useRef(selected)
  useEffect(() => {
    if (viewedStepRef.current === selected) return
    viewedStepRef.current = selected
    trackEvent('home_story_step_view', { step: STORY_STEPS[selected].step })
  }, [selected])

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
    /*
      「다 보인다」는 ratio 1 이다. 다만 탭 목록이 뷰포트보다 크면(400% 확대 등) ratio 1 에
      영영 닿지 않으므로, 그때는 들어오기만 하면 켠다. 그래서 문턱을 0 과 1 둘 다 건다.
    */
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.some(entry => {
          if (!entry.isIntersecting) return false
          if (entry.intersectionRatio >= 1) return true
          const rootHeight = entry.rootBounds?.height ?? window.innerHeight
          return entry.boundingClientRect.height >= rootHeight
        })
        if (visible) {
          setTabsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: [0, 1] },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [tabsVisible])

  /* 03 패널의 RecommendPreview 도 같은 훅·같은 selection 이라 캐시를 공유한다(요청 1회). */
  const recommendState = useRecommendPreview(selection, {
    enabled: tabsVisible,
  })

  const step = STORY_STEPS[selected]
  const highlight = stepHighlight(selected, selection, recommendState)

  return (
    <Container aria-label="판단 흐름">
      <Inner>
        <PinTrack ref={attachTrack}>
          <PinSticky>
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
                onSelect={handleSelect}
              />
            </div>

            {/*
          활성 패널만 렌더한다 — 비활성 패널을 hidden 으로 두면 데모가 모두 마운트돼
          요청이 늘어난다. CTA 는 네 단계 모두 같은 자리(왼쪽 묶음 끝)에 있다.
        */}
            <Panel
              role="tabpanel"
              id={STORY_PANEL_ID}
              aria-labelledby={storyTabId(step.step)}
              tabIndex={0}
            >
              <Copy>
                <StepLabel>
                  {step.step} {step.title}
                </StepLabel>
                <Highlight>
                  {/* 03 의 「9 → 5」 화살표는 숫자가 아니다 — 흐리게 해 두 숫자가 주인공이 되게 한다. */}
                  {highlight.value.split(' → ').map((part, index) => (
                    <Fragment key={part + index}>
                      {index > 0 ? <HighlightArrow>→</HighlightArrow> : null}
                      {part}
                    </Fragment>
                  ))}
                  {highlight.unit ? (
                    <HighlightUnit>{highlight.unit}</HighlightUnit>
                  ) : null}
                </Highlight>
                <HighlightCaption>{highlight.caption}</HighlightCaption>
                <Body>{step.body}</Body>
                {/* 라벨 글자 대신 체크가 「이걸 얻는다」를 말한다. 보조기기에는 라벨을 읽힌다. */}
                <Outcome>
                  <Check aria-hidden="true" />
                  <span>
                    <VisuallyHidden>손에 남는 것: </VisuallyHidden>
                    {step.outcome}
                  </span>
                </Outcome>
                {step.note ? <Note>{step.note}</Note> : null}
                <Cta
                  href={step.cta.href}
                  {...trackAttrs('home_story_cta_click', {
                    step: step.step,
                    carried: false,
                  })}
                >
                  {step.cta.label}
                  <ArrowRight aria-hidden="true" />
                </Cta>
              </Copy>
              <DemoArea>
                <DemoPanel
                  demo={step.demo}
                  selection={selection}
                  onSelectionChange={handleSelectionChange}
                />
              </DemoArea>
            </Panel>
          </PinSticky>
        </PinTrack>
      </Inner>
    </Container>
  )
}
