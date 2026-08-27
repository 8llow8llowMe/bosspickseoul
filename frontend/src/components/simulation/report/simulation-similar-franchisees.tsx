'use client'

import styled from 'styled-components'

import { formatLargeWon } from '@/lib/format'
import type { SimulationSimilarFranchisee } from '@/types/simulation'

export type SimulationSimilarFranchiseesProps = {
  items: readonly SimulationSimilarFranchisee[]
}

const Root = styled.section`
  display: grid;
  gap: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 24px;

  @media (max-width: 640px) {
    padding: 20px;
  }

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;
  }

  p {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
    word-break: keep-all;
  }
`

/* 6열이 좁은 화면을 넘긴다. 페이지가 통째로 가로 스크롤되지 않게 표만 스크롤시킨다. */
const Scroll = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`

const Table = styled.table`
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;

  th,
  td {
    border-bottom: 1px solid var(--color-border-200);
    padding: 10px 12px;
    font-size: 13px;
    line-height: 20px;
    text-align: right;
    white-space: nowrap;
  }

  th {
    color: var(--color-text-600);
    font-weight: 600;
  }

  td {
    color: var(--color-text-900);
    font-variant-numeric: tabular-nums;
  }

  th:first-child,
  td:first-child {
    text-align: left;
    white-space: normal;
    word-break: keep-all;
  }

  tbody tr:last-child th,
  tbody tr:last-child td {
    border-bottom: none;
  }
`

/** 예상 총비용에 근접한 프랜차이즈 Top 5. 비면 섹션을 그리지 않는다(호출부 판정). */
export default function SimulationSimilarFranchisees({
  items,
}: SimulationSimilarFranchiseesProps) {
  return (
    <Root aria-label="비슷한 예산의 프랜차이즈">
      <h2>비슷한 예산의 프랜차이즈</h2>
      <p>계산한 예상 총 창업 비용에 가까운 브랜드예요. 금액은 만원 단위예요.</p>

      <Scroll>
        <Table>
          <thead>
            <tr>
              <th scope="col">브랜드</th>
              <th scope="col">총비용</th>
              <th scope="col">가입비</th>
              <th scope="col">교육비</th>
              <th scope="col">가맹 보증금</th>
              <th scope="col">인테리어</th>
              <th scope="col">기타</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.franchiseeId}>
                <th scope="row">{item.brandName}</th>
                <td>{formatLargeWon(item.totalPrice)}</td>
                <td>{formatLargeWon(item.subscription)}</td>
                <td>{formatLargeWon(item.education)}</td>
                <td>{formatLargeWon(item.deposit)}</td>
                <td>{formatLargeWon(item.interior)}</td>
                <td>{formatLargeWon(item.etc)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Scroll>
    </Root>
  )
}
