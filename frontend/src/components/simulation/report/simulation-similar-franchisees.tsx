'use client'

import { ChevronDown } from 'lucide-react'
import styled from 'styled-components'

import { Badge } from '@/components/ui/badge'
import { formatLargeWon } from '@/lib/format'
import type { SimulationSimilarFranchisee } from '@/types/simulation'
import { SIMULATION_MEDIA } from '@/components/simulation/simulation-media'

export type SimulationSimilarFranchiseesProps = {
  items: readonly SimulationSimilarFranchisee[]
  /** 사용자가 고른 브랜드. 목록에 있으면 「내 선택」으로 표시한다. 개인 창업이면 null. */
  selectedFranchiseeId: number | null
}

/**
 * 세부 항목. **표의 열과 카드의 펼친 목록이 같은 배열을 쓴다** — 둘 중 한쪽에만 항목을 더하면
 * 화면 폭에 따라 보이는 정보가 달라진다.
 *
 * `deposit` 은 **가맹 보증금**이다. 리포트 비용 구성의 「임대 보증금」(월 임대료 10개월분)과
 * 다른 돈이라 「보증금」 하나로 쓰지 않는다(R11).
 */
const DETAIL_COLUMNS = [
  { key: 'subscription', label: '가입비' },
  { key: 'education', label: '교육비' },
  { key: 'deposit', label: '가맹 보증금' },
  { key: 'interior', label: '인테리어' },
  { key: 'etc', label: '기타' },
] as const satisfies ReadonlyArray<{
  key: keyof SimulationSimilarFranchisee
  label: string
}>

const Root = styled.section`
  display: grid;
  gap: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 24px;

  @media ${SIMULATION_MEDIA.mobile} {
    padding: 20px;
  }

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;
  }

  > p {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
    word-break: keep-all;
  }
`

/*
  ≥768 은 표다. 6열이 칸(1024 에서 오른쪽 열 약 570px)을 넘기면 표만 가로로 스크롤되는데, 그때
  브랜드 열이 함께 밀려나면 숫자가 어느 브랜드 것인지 알 수 없었다(R7). 첫 열을 sticky 로 붙인다.
*/
const TableView = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  @media ${SIMULATION_MEDIA.mobile} {
    display: none;
  }
`

const Table = styled.table`
  width: 100%;
  min-width: 640px;
  border-collapse: separate;
  border-spacing: 0;

  th,
  td {
    border-bottom: 1px solid var(--color-border-200);
    background: var(--color-surface);
    padding: 10px 12px;
    font-size: 13px;
    line-height: 20px;
    text-align: right;
    white-space: nowrap;
  }

  thead th {
    color: var(--color-text-600);
    font-weight: 600;
  }

  td {
    color: var(--color-text-900);
    font-variant-numeric: tabular-nums;
  }

  /* 스크롤될 때 아래 칸이 비쳐 보이지 않게 바탕을 칠하고, 경계에 옅은 선을 둔다. */
  th:first-child {
    position: sticky;
    left: 0;
    z-index: 1;
    box-shadow: inset -1px 0 0 var(--color-border-200);
    text-align: left;
    white-space: normal;
    word-break: keep-all;
  }

  tbody th {
    color: var(--color-text-900);
    font-weight: 600;
  }

  tbody tr:last-child th,
  tbody tr:last-child td {
    border-bottom: none;
  }

  tr[data-selected='true'] th,
  tr[data-selected='true'] td {
    background: var(--color-primary-100);
  }
`

/*
  「내 선택」 배지. blue 톤의 바탕이 선택 행·카드 바탕과 같은 primary100 이라 알약 모양이 사라졌다.
  흰 바탕으로 띄워 선택된 줄 위에서도 배지로 읽히게 한다.
*/
const MineBadge = styled(Badge)`
  && {
    background: var(--color-surface);
  }
`

const BrandCell = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
`

/*
  ≤767 은 카드 목록이다(Q7 결정). 375 에서 6열 표는 한 화면에 두세 열만 보여 브랜드끼리 비교할 수
  없었다. 접힌 줄에 비교의 축(브랜드 · 합계)만 두고 세부 5항목은 펼쳐서 본다.
  `<details>` 라 JS 없이 열리고, 키보드(Enter/Space)·낭독기가 펼침 상태를 그대로 안다.
*/
const CardList = styled.ul`
  display: none;
  gap: 8px;

  @media ${SIMULATION_MEDIA.mobile} {
    display: grid;
  }
`

const Card = styled.li<{ $selected: boolean }>`
  border: 1px solid
    ${props =>
      props.$selected ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};

  summary {
    min-height: 48px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    cursor: pointer;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }

    > svg {
      width: 16px;
      height: 16px;
      flex: 0 0 auto;
      color: var(--color-text-caption);
      stroke: currentColor;
      transition: transform var(--motion-fast) var(--ease-standard);
    }
  }

  details[open] summary > svg {
    transform: rotate(180deg);
  }
`

const CardBrand = styled.span`
  min-width: 0;
  flex: 1 1 auto;
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  word-break: keep-all;
`

const CardTotal = styled.span`
  flex: 0 0 auto;
  display: grid;
  justify-items: end;

  small {
    color: var(--color-text-caption);
    font-size: 12px;
    line-height: 18px;
  }

  strong {
    color: var(--color-text-900);
    font-size: 15px;
    font-weight: 700;
    line-height: 22px;
    font-variant-numeric: tabular-nums;
  }
`

const CardDetails = styled.dl`
  display: grid;
  border-top: 1px solid var(--color-border-200);
  margin: 0 12px;
  padding: 8px 0 12px;

  > div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 4px 0;
  }

  dt {
    color: var(--color-text-caption);
    font-size: 13px;
    line-height: 20px;
  }

  dd {
    color: var(--color-text-900);
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
    font-variant-numeric: tabular-nums;
  }
`

/**
 * 예상 총비용에 근접한 프랜차이즈 Top 5. 비면 섹션을 그리지 않는다(호출부 판정).
 *
 * 표(≥768)와 카드(≤767)를 둘 다 그리고 CSS 로 고른다 — SSR 과 결과가 같고, 숨은 쪽은
 * display:none 이라 낭독기에도 한 벌만 읽힌다.
 *
 * 내가 고른 브랜드가 목록에 있으면 「내 선택」 배지와 바탕으로 표시한다. 비슷한 예산의 다른
 * 브랜드와 견주는 섹션이라, 기준점이 어디인지 보여야 위아래를 읽을 수 있다.
 */
export default function SimulationSimilarFranchisees({
  items,
  selectedFranchiseeId,
}: SimulationSimilarFranchiseesProps) {
  // 문자열로 맞춰 비교한다. 타입은 number 지만 dev 응답은 `condition.franchiseeId` 와
  // `similarFranchisees[].franchiseeId` 를 둘 다 문자열("14945")로 준다(2026-10-01 실측). 한쪽만
  // 바뀌어도 === 는 조용히 false 가 돼 「내 선택」이 사라진다.
  const isSelected = (item: SimulationSimilarFranchisee) =>
    selectedFranchiseeId !== null &&
    String(item.franchiseeId) === String(selectedFranchiseeId)

  return (
    <Root aria-label="비슷한 예산의 프랜차이즈">
      <h2>비슷한 예산의 프랜차이즈</h2>
      <p>계산한 예상 총 창업 비용에 가까운 브랜드예요.</p>

      <TableView>
        <Table>
          <thead>
            <tr>
              <th scope="col">브랜드</th>
              <th scope="col">합계</th>
              {DETAIL_COLUMNS.map(column => (
                <th key={column.key} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr
                key={item.franchiseeId}
                data-selected={isSelected(item) || undefined}
              >
                <th scope="row">
                  <BrandCell>
                    {item.brandName}
                    {isSelected(item) ? (
                      <MineBadge $tone="blue">내 선택</MineBadge>
                    ) : null}
                  </BrandCell>
                </th>
                <td>{formatLargeWon(item.totalPrice)}</td>
                {DETAIL_COLUMNS.map(column => (
                  <td key={column.key}>{formatLargeWon(item[column.key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </TableView>

      <CardList>
        {items.map(item => (
          <Card key={item.franchiseeId} $selected={isSelected(item)}>
            <details>
              <summary>
                <CardBrand>
                  {item.brandName}
                  {isSelected(item) ? (
                    <MineBadge $tone="blue">내 선택</MineBadge>
                  ) : null}
                </CardBrand>
                <CardTotal>
                  <small>합계</small>{' '}
                  <strong>{formatLargeWon(item.totalPrice)}</strong>
                </CardTotal>
                <ChevronDown aria-hidden="true" />
              </summary>
              <CardDetails>
                {DETAIL_COLUMNS.map(column => (
                  <div key={column.key}>
                    <dt>{column.label}</dt>
                    <dd>{formatLargeWon(item[column.key])}</dd>
                  </div>
                ))}
              </CardDetails>
            </details>
          </Card>
        ))}
      </CardList>
    </Root>
  )
}
