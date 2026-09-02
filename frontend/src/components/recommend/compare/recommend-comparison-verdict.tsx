'use client'

import styled from 'styled-components'

import type { ComparisonVerdict } from '@/lib/recommend/comparison-presentation'

export type RecommendComparisonVerdictProps = {
  verdict: ComparisonVerdict
  leftName: string | null
  rightName: string | null
}

const Root = styled.section`
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

const Heading = styled.h2`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
`

const Recommended = styled.p`
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
  line-height: 24px;
  word-break: keep-all;
`

const Body = styled.p`
  color: var(--color-text-700);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

const Block = styled.div`
  display: grid;
  gap: 6px;
`

const BlockTitle = styled.h3`
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
`

const List = styled.ul`
  display: grid;
  gap: 4px;
  padding-left: 18px;
  list-style: disc;
`

const Item = styled.li`
  color: var(--color-text-700);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

const Caveat = styled.p`
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
`

/**
 * 비교 리포트 — **판단이 사는 유일한 자리**다.
 *
 * 지표 표는 값만 적고 승패를 칠하지 않는다. 판단은 근거(추천 이유·주의사항)와
 * 함께 있을 때만 읽을 만하므로 여기에 모았다. 두 원칙이 한 화면에 공존하되
 * 서로 침범하지 않게 하는 것이 이 컴포넌트의 존재 이유다.
 *
 * 백엔드가 어느 쪽도 추천하지 않거나 본문이 비면 그 블록은 그리지 않는다 —
 * 빈 제목만 남으면 "분석이 실패했나" 로 읽힌다.
 */
export default function RecommendComparisonVerdict({
  verdict,
  leftName,
  rightName,
}: RecommendComparisonVerdictProps) {
  const { recommendedSideName, summary, businessFitSummary } = verdict

  return (
    <Root aria-label="비교 리포트">
      <Heading>비교 리포트</Heading>

      {recommendedSideName ? (
        <Recommended>추천: {recommendedSideName}</Recommended>
      ) : null}

      {summary ? <Body>{summary}</Body> : null}
      {businessFitSummary ? <Body>{businessFitSummary}</Body> : null}

      {verdict.reasons.length > 0 ? (
        <Block>
          <BlockTitle>추천 이유</BlockTitle>
          <List>
            {verdict.reasons.map(reason => (
              <Item key={reason}>{reason}</Item>
            ))}
          </List>
        </Block>
      ) : null}

      {verdict.cautions.length > 0 ? (
        <Block>
          <BlockTitle>주의할 점</BlockTitle>
          <List>
            {verdict.cautions.map(caution => (
              <Item key={caution}>{caution}</Item>
            ))}
          </List>
        </Block>
      ) : null}

      {verdict.highlights.length > 0 ? (
        <Block>
          <BlockTitle>핵심 요약</BlockTitle>
          <List>
            {verdict.highlights.map(highlight => (
              <Item key={highlight}>{highlight}</Item>
            ))}
          </List>
        </Block>
      ) : null}

      {/*
        판단의 출처와 한계를 밝힌다. 아래 지표 표가 중립인 이유이기도 하다 —
        두 영역이 다르게 말하는 것이 아니라, 판단에는 근거가 필요하다는 뜻이다.
      */}
      <Caveat>
        {leftName && rightName
          ? `${leftName}·${rightName}의 분기 데이터로 계산한 결과예요. `
          : ''}
        업종과 창업 계획에 따라 다르게 읽힐 수 있어요.
      </Caveat>
    </Root>
  )
}
