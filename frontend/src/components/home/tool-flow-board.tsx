import Link from 'next/link'
import {
  ArrowRight,
  Calculator,
  LineChart,
  Map,
  Target,
  type LucideIcon,
} from 'lucide-react'
import styled from 'styled-components'

import { STORY_STEPS } from '@/components/home/story-steps'
import { shellWidth } from '@/styles/layout'

/**
 * 네 도구 요약 보드 — 「무엇을 · 어디로」.
 *
 * <b>왜 히어로 바로 뒤인가.</b> 이 서비스가 네 도구로 이루어져 있다는 사실을 말하는 곳이
 * 판단 흐름 섹션 하나뿐이었고, 그것이 `y=3,456`(3.2 화면)에서 시작했다. 과업 흐름 감사가
 * 2,966 으로 잰 값보다 오히려 멀어진 상태였다 — 개편이 스토리 안쪽만 좋게 만들고 도달
 * 거리는 손대지 않았기 때문이다. 이 보드가 그 거리를 1.0 화면으로 당긴다.
 *
 * <b>스토리와의 역할 경계(설계 §3 B2).</b> 보드는 **이름과 링크**만 말하고, 각 단계가
 * 어떻게 도는지(데모·좁혀지는 수치)는 스토리가 말한다. 둘이 같은 것을 말하기 시작하면
 * D9-1 의 「카운터 vs 스텝 목록」 중복이 그대로 재현된다. 그래서 두 요소는 `story-steps.ts`
 * 한 정본을 공유하되 **보드는 `tool`, 스토리는 `cta`** 로 나눠 쓴다.
 *
 * 스크롤에 기대는 동작을 두지 않는다 — 자동화 브라우저가 숨겨지면 rAF·scroll 이 멈춰
 * 검증할 수 없다(`interaction-polish.md` D8-10). 이 섹션은 그냥 보이면 된다.
 */
const Section = styled.section`
  padding: 96px 0;

  @media (max-width: 900px) {
    padding: 72px 0;
  }

  @media (max-width: 640px) {
    padding: 56px 0;
  }
`

const Inner = styled.div`
  ${shellWidth}
`

const Header = styled.div`
  max-width: 680px;
  display: grid;
  gap: 10px;
  margin-bottom: 28px;
`

const Eyebrow = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 26px;
  font-weight: 700;
  line-height: 36px;
  word-break: keep-all;

  @media (max-width: 640px) {
    font-size: 22px;
    line-height: 30px;
  }
`

const Row = styled.ol`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: stretch;
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`

const Item = styled.li`
  position: relative;
  display: grid;
`

/*
  진행 방향 표시. 4열일 때만 둔다 — 2열·1열에서는 카드가 줄바꿈되어 화살표가 다음 줄을
  가리키게 되고, D9-1 에서 겪은 「화살표가 다음 노드 배경에 덮여 잘리는」 문제도 같은
  조건에서 생긴다. 장식이므로 스크린리더에서 숨긴다.
*/
const Arrow = styled.span`
  position: absolute;
  top: 50%;
  right: -12px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  transform: translate(50%, -50%);
  color: var(--color-text-caption);

  svg {
    width: 16px;
    height: 16px;
    stroke: currentColor;
  }

  @media (max-width: 900px) {
    display: none;
  }
`

const Card = styled(Link)`
  display: grid;
  align-content: start;
  gap: 8px;
  /* 터치 영역(DESIGN.md §8): 카드 전체가 링크이므로 행 높이로 확보된다. */
  min-height: 44px;
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard),
    transform var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-600);
    box-shadow: var(--shadow-level-2);
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-700);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`

const CardHead = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
`

const IconBadge = styled.span`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-control);
  background: var(--color-primary-100);
  color: var(--color-primary-700);

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }
`

const Step = styled.span`
  color: var(--color-primary-700);
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
`

const CardTitle = styled.span`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
  word-break: keep-all;
`

const CardBody = styled.span`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

/*
  이 단계를 마치면 손에 남는 것. 위 `CardBody`(동작)와 시각적으로 갈라 놓아야 두 줄이
  같은 말의 반복으로 읽히지 않는다 — 그래서 위에 경계선을 두고 라벨을 붙인다.
*/
const Outcome = styled.span`
  display: grid;
  gap: 2px;
  margin-top: 12px;
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
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  word-break: keep-all;
`

const CardTool = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 600;

  svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
  }
`

/*
  카피 규칙: **주어·목적어를 생략하지 않는다.** 이전 제목 「네 단계로 좁힙니다」는
  무엇을 좁히는지가 문장에 없었다 — 수식어가 없어도 목적어가 빠지면 같은 공허함이
  남고, 그것이 곧 「AI 가 쓴 티」다. `home.md` S2 #3 이 수식어만 금지 대상으로
  적어 둔 탓에 이 형태를 못 걸렀다.
*/
/*
  단계별 아이콘. 카드 네 장이 글자만 다르면 한 덩어리로 읽혀 훑는 눈에 걸리지 않는다 —
  아이콘이 각 카드에 **눈이 멈출 자리**를 만든다. 의미는 도구가 하는 일에서 곧장 온다
  (지도=구별현황 · 추이=상권분석 · 과녁=상권추천 · 계산=시뮬레이션). 장식이므로
  스크린리더에서는 숨긴다 — 카드 제목이 이미 같은 것을 말한다.
*/
const STEP_ICONS: Record<string, LucideIcon> = {
  '01': Map,
  '02': LineChart,
  '03': Target,
  '04': Calculator,
}

export const TOOL_BOARD_TITLE = '창업할 지역과 업종을 네 단계로 좁힙니다.'

export default function ToolFlowBoard() {
  return (
    <Section aria-label="네 도구 요약">
      <Inner>
        <Header>
          <Eyebrow>이 서비스가 하는 일</Eyebrow>
          <Title>{TOOL_BOARD_TITLE}</Title>
        </Header>

        <Row>
          {STORY_STEPS.map((step, index) => (
            <Item key={step.step}>
              <Card href={step.tool.href}>
                <CardHead>
                  <IconBadge aria-hidden="true">
                    {(() => {
                      const Icon = STEP_ICONS[step.step]
                      return Icon ? <Icon /> : null
                    })()}
                  </IconBadge>
                  <Step>{step.step}</Step>
                </CardHead>
                <CardTitle>{step.title}</CardTitle>
                <CardBody>{step.body}</CardBody>
                <Outcome>
                  <OutcomeLabel>손에 남는 것</OutcomeLabel>
                  <OutcomeText>{step.outcome}</OutcomeText>
                </Outcome>
                <CardTool>
                  {step.tool.label}
                  <ArrowRight aria-hidden="true" />
                </CardTool>
              </Card>
              {index < STORY_STEPS.length - 1 ? (
                <Arrow aria-hidden="true">
                  <ArrowRight />
                </Arrow>
              ) : null}
            </Item>
          ))}
        </Row>
      </Inner>
    </Section>
  )
}
