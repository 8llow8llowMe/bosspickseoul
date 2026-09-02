import styled from 'styled-components'

import type {
  CommercialReportView,
  ComparisonReportView,
  RegionReportView,
  ReportBlockList,
} from '@/lib/analysis/ai-report-presentation'

const Block = styled.section`
  display: grid;
  gap: 8px;
  padding: 16px 0;
  border-top: 1px solid var(--color-border-200);

  &:first-child {
    border-top: none;
  }
`

const BlockTitle = styled.h4`
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-700);
`

const Summary = styled.p`
  font-size: 15px;
  line-height: 22px;
  color: var(--color-text-900);
`

const Insight = styled.p`
  font-size: 13px;
  line-height: 20px;
  color: var(--color-text-600);
`

const Chips = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Chip = styled.li`
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  color: var(--color-text-700);
  font-size: 12px;
`

const Bullets = styled.ul`
  display: grid;
  gap: 6px;
  padding-left: 16px;
  list-style: disc;
  color: var(--color-text-700);
  font-size: 13px;
  line-height: 20px;
`

function ChipList({ block }: { block: ReportBlockList }) {
  return (
    <Block>
      <BlockTitle>{block.title}</BlockTitle>
      <Chips>
        {block.items.map(item => (
          <Chip key={item}>{item}</Chip>
        ))}
      </Chips>
    </Block>
  )
}

function BulletBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <Block>
      <BlockTitle>{title}</BlockTitle>
      <Bullets>
        {items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </Bullets>
    </Block>
  )
}

export function CommercialReportBlocks({
  view,
}: {
  view: CommercialReportView
}) {
  return (
    <div>
      <Block>
        {view.headline.summary ? (
          <Summary>{view.headline.summary}</Summary>
        ) : null}
        {view.headline.insight ? (
          <Insight>{view.headline.insight}</Insight>
        ) : null}
      </Block>
      <BulletBlock title="강점" items={view.strengths} />
      <BulletBlock title="주의" items={view.risks} />
      {view.actions.map(block => (
        <ChipList key={block.title} block={block} />
      ))}
    </div>
  )
}

const Recommended = styled.p`
  font-size: 14px;
  font-weight: 700;
  line-height: 21px;
  color: var(--color-text-900);
`

/**
 * 상권 비교 AI 리포트 본문.
 *
 * 단일 상권과 같은 블록 원시 요소를 쓴다 — 두 리포트가 서로 다른 화면처럼 보이면
 * 사용자는 같은 기능의 두 버전이라고 읽지 않는다.
 *
 * 비교만의 것은 「추천」 한 줄이다. 이 값은 **AI 가 고른 쪽**이고, 같은 화면 위쪽
 * 비교 리포트(`/commercials/compare` 의 `recommendedSide`)와 출처가 다르다.
 * 둘이 어긋날 수 있으므로 여기서는 근거(추천 이유)를 반드시 함께 세운다.
 */
export function ComparisonReportBlocks({
  view,
}: {
  view: ComparisonReportView
}) {
  return (
    <div>
      <Block>
        {view.recommendedSide ? (
          <Recommended>AI 추천: {view.recommendedSide}</Recommended>
        ) : null}
        {view.headline.summary ? (
          <Summary>{view.headline.summary}</Summary>
        ) : null}
        {view.headline.insight ? (
          <Insight>{view.headline.insight}</Insight>
        ) : null}
      </Block>
      <BulletBlock title="추천 이유" items={view.reasons} />
      {view.blocks.map(block => (
        <BulletBlock
          key={block.title}
          title={block.title}
          items={block.items}
        />
      ))}
    </div>
  )
}

export function RegionReportBlocks({ view }: { view: RegionReportView }) {
  return (
    <div>
      <Block>
        {view.headline.summary ? (
          <Summary>{view.headline.summary}</Summary>
        ) : null}
        {view.headline.marketStatus ? (
          <Insight>{view.headline.marketStatus}</Insight>
        ) : null}
      </Block>
      {view.recommended.length > 0 ? (
        <ChipList block={{ title: '추천 업종군', items: view.recommended }} />
      ) : null}
      {view.caution.length > 0 ? (
        <ChipList block={{ title: '주의 업종군', items: view.caution }} />
      ) : null}
      <BulletBlock title="코멘트" items={view.insight ? [view.insight] : []} />
    </div>
  )
}
