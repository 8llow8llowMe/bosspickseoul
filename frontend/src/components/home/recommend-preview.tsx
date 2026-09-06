'use client'

import styled from 'styled-components'

import DonutChart from '@/components/analysis/charts/donut-chart'
import { findDistrictOption, findIndustryOption } from '@/data/home-demo'
import type { DemoSelection } from '@/data/home-demo'
import { useRecommendPreview } from '@/hooks/use-recommend-preview'

/**
 * 스토리 03 단계 데모 — **후보가 좁혀지는 것**을 보여 준다.
 *
 * 전에는 01 단계와 **같은 `RankBarList`** 를 썼다. 그래서 홈에 똑같이 생긴 순위 막대가
 * 세 번(01 · 03 · 「지금 많이 본 지역」) 나왔고, 단계가 넘어가도 화면이 바뀐 것처럼
 * 보이지 않았다.
 *
 * 이 단계가 실제로 하는 일은 **줄 세우기가 아니라 걸러내기**다(상권 N 곳 중 조건에 맞는
 * M 곳). 그래서 비율을 보여 주는 도넛이 맞다 — 순위 막대는 걸러진 결과의 순서만 말하고
 * "몇 개에서 몇 개로 줄었는지"는 말하지 못한다.
 */
const SeedLabel = styled.p`
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-caption);
`

const Narrowing = styled.p`
  margin: 0 0 4px;
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;

  strong {
    color: var(--color-primary-700);
    font-variant-numeric: tabular-nums;
  }
`

const Picked = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
`

const PickedItem = styled.li`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  color: var(--color-text-700);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
`

const PickedRank = styled.span`
  color: var(--color-primary-700);
  font-variant-numeric: tabular-nums;
`

const Reason = styled.p`
  margin-top: 10px;
  font-size: 13px;
  line-height: 20px;
  color: var(--color-text-700);
  word-break: keep-all;
`

const Sample = styled.p`
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-text-caption);
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

  return (
    <div>
      <SeedLabel>{label}</SeedLabel>

      {narrowing ? (
        <>
          <Narrowing>
            상권 <strong>{narrowing.total}곳</strong> 중{' '}
            <strong>{picked}곳</strong>을 골랐습니다.
          </Narrowing>
          <DonutChart
            segments={narrowing.segments}
            unit="곳"
            ariaLabel={`상권 ${narrowing.total}곳 중 조건에 맞는 ${picked}곳`}
          />
        </>
      ) : (
        // 총계를 모르면 비율을 그리지 않고 고른 결과만 말한다.
        <Narrowing>
          조건에 맞는 상권 <strong>{picked}곳</strong>을 골랐습니다.
        </Narrowing>
      )}

      <Picked>
        {view.rows.map(row => (
          <PickedItem key={row.key}>
            <PickedRank>{row.rank}</PickedRank>
            {row.name}
          </PickedItem>
        ))}
      </Picked>

      {view.reason ? <Reason>{view.reason}</Reason> : null}
      {view.isSample && !isLoading ? <Sample>대표 예시 데이터</Sample> : null}
    </div>
  )
}
