'use client'

import styled from 'styled-components'

import {
  COMPARISON_NEUTRAL_NOTICE,
  type ComparisonGroup,
} from '@/lib/recommend/comparison-presentation'

export type RecommendCompareTableProps = {
  groups: readonly ComparisonGroup[]
  leftName: string
  rightName: string
}

const Root = styled.section`
  display: grid;
  gap: 16px;
`

/*
 * 표가 넘칠 때 **페이지 본문이 아니라 이 컨테이너만** 가로로 구른다.
 * 스크롤 컨테이너는 **하나뿐**이다(명세 §5.5). 묶음마다 컨테이너를 두면 서로 따로
 * 굴러서, 매출 묶음의 우측 열을 보면서 시설 묶음의 좌측 열을 보게 된다.
 */
const Scroller = styled.div`
  overflow-x: auto;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
`

/* 지표 이름이 사라지면 숫자만 남아 표가 의미를 잃는다. 첫 열을 붙잡아 둔다. */
const stickyFirstColumn = `
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--color-surface);
`

const RowHead = styled.th`
  ${stickyFirstColumn}
  min-width: 148px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border-200);
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
`

const CornerHead = styled.th`
  ${stickyFirstColumn}
  z-index: 2;
  padding: 14px;
  border-bottom: 1px solid var(--color-border-300);
`

const ColumnHead = styled.th`
  min-width: 152px;
  padding: 14px;
  border-bottom: 1px solid var(--color-border-300);
  text-align: left;
  vertical-align: top;
`

const Name = styled.span`
  display: block;
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
  line-height: 22px;
  word-break: keep-all;
`

const Cell = styled.td`
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border-200);
  color: var(--color-text-900);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

/* 차이 열은 보조 정보다 — 값보다 약하게 적어 좌·우 비교를 방해하지 않는다. */
const DiffCell = styled(Cell)`
  color: var(--color-text-600);
`

/*
 * 묶음을 가르는 소제목 행. `<caption>` 은 표당 하나뿐이라 표를 하나로 합치면서
 * 행으로 내렸다 — 열 너비를 한 표가 정하게 하려면 `<table>` 이 하나여야 한다.
 */
const SectionHead = styled.th`
  padding: 14px 14px 6px;
  border-bottom: 1px solid var(--color-border-200);
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 400;
  text-align: left;

  tbody + tbody & {
    border-top: 1px solid var(--color-border-300);
    padding-top: 18px;
  }
`

/* 가로로 굴러도 소제목이 남아 있게 한다 — 셀은 표 폭만큼 넓다. */
const SectionLabel = styled.span`
  position: sticky;
  left: 14px;
  display: inline-block;
`

const Notice = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
`

/**
 * 비교 지표 표. 좌·우 값과 차이만 적는다.
 *
 * 🔴 **승패를 칠하지 않는다.** 응답에는 지표마다 `winnerSide` 가 있지만 이 표는
 * 그것을 받지 않는다(`ComparisonRow` 에 아예 없다). 색이 붙는 순간 사용자는 그것을
 * "더 나은 선택"으로 읽는데, 어느 쪽이 맞는지는 업종과 계획에 달렸다. 추천측과
 * 그 이유는 근거가 함께 나오는 리포트 영역이 말한다.
 */
export default function RecommendCompareTable({
  groups,
  leftName,
  rightName,
}: RecommendCompareTableProps) {
  // 지표 이름 + 좌 + 우 + 차이.
  const columnCount = 4

  return (
    <Root>
      <Notice>{COMPARISON_NEUTRAL_NOTICE}</Notice>

      <Scroller>
        <Table>
          <thead>
            <tr>
              <CornerHead scope="col">지표</CornerHead>
              <ColumnHead scope="col">
                <Name>{leftName}</Name>
              </ColumnHead>
              <ColumnHead scope="col">
                <Name>{rightName}</Name>
              </ColumnHead>
              <ColumnHead scope="col">
                <Name>차이</Name>
              </ColumnHead>
            </tr>
          </thead>

          {groups.map(group => (
            <tbody key={group.key}>
              <tr>
                {/*
                  `scope="rowgroup"` 이다. 이 칸은 열을 머리하지 않고, 자기 `tbody`
                  안에서 뒤따르는 행들을 머리한다 — 전체 폭 `th` 가 행 그룹을 머리하는
                  경우다. `colgroup` 을 쓰면 보조기술이 축을 반대로 읽는다.
                */}
                <SectionHead colSpan={columnCount} scope="rowgroup">
                  <SectionLabel>{group.label}</SectionLabel>
                </SectionHead>
              </tr>
              {group.rows.map(row => (
                <tr key={row.key}>
                  <RowHead scope="row">{row.label}</RowHead>
                  <Cell>{row.left}</Cell>
                  <Cell>{row.right}</Cell>
                  <DiffCell>{row.diff}</DiffCell>
                </tr>
              ))}
            </tbody>
          ))}
        </Table>
      </Scroller>
    </Root>
  )
}
