import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
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

export const TOOL_BOARD_TITLE = '네 단계로 좁힙니다.'

export default function ToolFlowBoard() {
  return (
    <Section aria-label="네 도구 요약">
      <Inner>
        <Header>
          <Eyebrow>어떻게 쓰나요</Eyebrow>
          <Title>{TOOL_BOARD_TITLE}</Title>
        </Header>

        <Row>
          {STORY_STEPS.map((step, index) => (
            <Item key={step.step}>
              <Card href={step.tool.href}>
                <Step>{step.step}</Step>
                <CardTitle>{step.title}</CardTitle>
                <CardBody>{step.body}</CardBody>
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
