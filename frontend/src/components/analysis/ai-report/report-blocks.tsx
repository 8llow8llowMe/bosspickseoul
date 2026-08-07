import styled from 'styled-components'

import type {
  CommercialReportView,
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

export function CommercialReportBlocks({ view }: { view: CommercialReportView }) {
  return (
    <div>
      <Block>
        {view.headline.summary ? <Summary>{view.headline.summary}</Summary> : null}
        {view.headline.insight ? <Insight>{view.headline.insight}</Insight> : null}
      </Block>
      <BulletBlock title="강점" items={view.strengths} />
      <BulletBlock title="주의" items={view.risks} />
      {view.actions.map(block => (
        <ChipList key={block.title} block={block} />
      ))}
    </div>
  )
}

export function RegionReportBlocks({ view }: { view: RegionReportView }) {
  return (
    <div>
      <Block>
        {view.headline.summary ? <Summary>{view.headline.summary}</Summary> : null}
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
