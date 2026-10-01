'use client'

import { ArrowRight } from 'lucide-react'
import styled from 'styled-components'

import DemoFrame, { SampleBadge } from '@/components/home/demo-frame'
import { barPercent } from '@/components/home/rank-bar-list'
import { findDistrictOption, findIndustryOption } from '@/data/home-demo'
import type { DemoSelection } from '@/data/home-demo'
import { useRecommendPreview } from '@/hooks/use-recommend-preview'

/**
 * 판단 흐름 03 단계 데모 — **후보가 좁혀진 결과**를 보여 준다.
 *
 * 예전엔 도넛(「상권 9곳 중 5곳」)이 주인공이었다. 두 조각이 비슷한 파랑이라 구분되지
 * 않았고, 정작 이 단계의 결과물인 후보 5곳은 작은 칩으로 밀려 있었다. 좁혀진 폭은 패널
 * 왼쪽 큰 숫자(`9 → 5곳`)와 머리줄 퍼널이 말하므로, 여기는 **후보 목록**을 주인공으로
 * 둔다(story-panel-redesign.md D4-8).
 *
 * 01 과 같은 순위 막대를 쓰지 않는다 — 홈에 같은 모양이 세 번 나오던 문제(story-and-
 * rankings)를 되살리지 않도록, 행을 카드로 띄우고 막대는 점수 옆 짧은 보조 표시로 둔다.
 */
const Funnel = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-700);
  font-size: 13px;
  line-height: 20px;
  white-space: nowrap;

  strong {
    color: var(--color-text-900);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

const Candidates = styled.ol`
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Candidate = styled.li`
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) minmax(0, 160px) 64px;
  align-items: center;
  gap: 14px;
  min-height: 52px;
  padding: 10px 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);

  @media (max-width: 480px) {
    grid-template-columns: 28px minmax(0, 1fr) 56px;
    gap: 10px;
  }
`

const Rank = styled.span<{ $first: boolean }>`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-control);
  /* 1위 배지는 글자를 얹는 채움이다 — primary-700·600 위 흰 글자는 2.77 / 4.49:1 로 AA 미달이다. */
  background: ${p =>
    p.$first ? 'var(--color-fill-primary-text)' : 'var(--color-surface-muted)'};
  color: ${p => (p.$first ? '#ffffff' : 'var(--color-text-700)')};
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`

const Name = styled.span`
  overflow: hidden;
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* 이름 옆 보조 표시라 짧고 얇다(160px · 8px). 좁은 화면에서는 뺀다 — 점수 숫자가 남는다. */
const ScoreTrack = styled.span`
  display: block;
  height: 8px;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  overflow: hidden;

  @media (max-width: 480px) {
    display: none;
  }
`

const ScoreFill = styled.span<{ $first: boolean }>`
  display: block;
  height: 100%;
  border-radius: var(--radius-control);
  background: ${p =>
    p.$first ? 'var(--color-primary-600)' : 'var(--color-grey-300)'};
`

const Score = styled.span`
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const Aside = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

export type RecommendPreviewProps = {
  /** `ProductStory` 가 소유한 선택 — 02단계·카운터와 같은 값을 본다(D8-3). */
  selection: DemoSelection
}

/**
 * 도넛에 넣을 두 조각. **후보 총계를 모를 때는 도넛을 그리지 않는다.**
 *
 * `commercialsCount` 가 0 인 경우가 있다(행정동을 못 정했거나 예시 폴백). 그때 「0 곳
 * 중 5 곳」을 그리면 **화면이 거짓말을 한다** — 남는 조각을 음수로 만들거나 비율이
 * 100% 를 넘는다. 총계가 추천 수보다 작으면 그린 값을 믿을 수 없으므로 null 을 낸다.
 */
export const toNarrowingSegments = (
  total: number,
  picked: number,
): { segments: { label: string; value: number }[]; total: number } | null => {
  if (picked <= 0 || total < picked) return null

  const rest = total - picked
  const segments = [{ label: '조건에 맞는 상권', value: picked }]
  if (rest > 0) segments.push({ label: '조건에서 빠진 상권', value: rest })

  return { segments, total }
}

export default function RecommendPreview({ selection }: RecommendPreviewProps) {
  const { administrationName, isLoading, commercialsCount, view } =
    useRecommendPreview(selection)
  const districtName = findDistrictOption(selection.districtId)?.name ?? ''
  const industryName = findIndustryOption(selection.industryId)?.name ?? ''

  /*
   * 행정동을 아직 못 정했으면(로딩/실패) 지역·업종만 적는다 — 실제로 쓰지 않은
   * 행정동 이름을 지어내지 않는다.
   */
  const label = administrationName
    ? `${districtName} ${administrationName} · ${industryName}`
    : `${districtName} · ${industryName}`

  const picked = view.rows.length
  const narrowing = toNarrowingSegments(commercialsCount, picked)
  const showSample = view.isSample && !isLoading

  return (
    <DemoFrame
      title={`추천 후보 ${picked}곳`}
      subtitle={label}
      aside={
        narrowing || showSample ? (
          <Aside>
            {/* 총계를 모르면 비율을 말하지 않는다 — 고른 결과만 보여 준다. */}
            {narrowing ? (
              <Funnel>
                상권 <strong>{narrowing.total}곳</strong>
                <ArrowRight role="img" aria-label="에서" />
                추천 <strong>{picked}곳</strong>
              </Funnel>
            ) : null}
            {showSample ? <SampleBadge>예시 데이터</SampleBadge> : null}
          </Aside>
        ) : null
      }
      footer={view.reason}
    >
      <Candidates aria-label={`추천 후보 ${picked}곳`}>
        {view.rows.map((row, index) => (
          <Candidate key={row.key}>
            <Rank $first={index === 0} aria-hidden="true">
              {row.rank}
            </Rank>
            <Name>{row.name}</Name>
            {/* 점수는 0~100 이다(metric-polarity 의 clamp 범위). 1위 대비가 아니라 절대 길이. */}
            <ScoreTrack aria-hidden="true">
              <ScoreFill
                $first={index === 0}
                style={{ width: `${barPercent(row.score, 100)}%` }}
              />
            </ScoreTrack>
            <Score>{row.scoreLabel}</Score>
          </Candidate>
        ))}
      </Candidates>
    </DemoFrame>
  )
}
