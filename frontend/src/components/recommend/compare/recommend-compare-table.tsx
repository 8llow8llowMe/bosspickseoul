'use client'

import { useId, useState } from 'react'
import { ChevronDown, CircleHelp } from 'lucide-react'
import styled from 'styled-components'

import {
  COMPARISON_NEUTRAL_NOTICE,
  type ComparisonGroup,
} from '@/lib/recommend/comparison-presentation'

export type RecommendCompareTableProps = {
  groups: readonly ComparisonGroup[]
  leftName: string
  rightName: string
  /**
   * 「비교 기준」 문장(`toComparisonBases`). 받은 그대로 적는다. 구버전 응답이면
   * 비어 있고, 그때는 목록을 그리지 않는다. 기존 사용처를 깨지 않도록 선택이다.
   */
  bases?: readonly string[]
}

/**
 * 차이 열 머리. 차이는 늘 좌 − 우였다(구버전 응답도). 방향을 말하지 않으면
 * `-250,165,661원` 을 「왼쪽이 적다」로 읽을지 「오른쪽이 적다」로 읽을지 표가 모른다.
 */
export const COMPARISON_DIFF_HEADER = '차이 (왼쪽 − 오른쪽)'

const Root = styled.section`
  display: grid;
  gap: 16px;
`

/*
 * 표가 넘칠 때 **페이지 본문이 아니라 이 컨테이너만** 가로로 구른다.
 * 스크롤 컨테이너는 **하나뿐**이다(명세 §5.5). 묶음마다 컨테이너를 두면 서로 따로
 * 굴러서, 매출 묶음의 우측 열을 보면서 시설 묶음의 좌측 열을 보게 된다.
 *
 * `container-type` 은 묶음 설명이 **보이는 폭**에 맞춰 줄바꿈하게 한다(`100cqi`) —
 * 표 폭(약 600px)에 맞추면 모바일에서 설명을 읽으려고 가로로 굴려야 한다.
 */
const Scroller = styled.div`
  container-type: inline-size;
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

const RowLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`

/*
 * 지표 설명 도움말. 떠 있는 툴팁은 이 표의 `overflow-x: auto` 에 잘리고 터치에는
 * hover 가 없어, 지표명 아래로 **펼치는** 버튼이다(simulation-condition-section 의
 * `aria-expanded` 관용구). 시각 32px 에 음수 여백으로 행 높이를 지키고, 가상 요소로
 * 터치 영역을 48px 까지 넓힌다.
 */
const HelpButton = styled.button`
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: -4px 0;
  padding: 0;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-caption);
  cursor: pointer;

  &::before {
    content: '';
    position: absolute;
    inset: -8px;
  }

  &:hover {
    color: var(--color-text-700);
  }

  &[aria-expanded='true'] {
    color: var(--color-text-primary-on-light);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

/*
 * 설명은 첫 열을 **넓히지 않는다**(`width: 0; min-width: 100%`). sticky 첫 열이
 * 설명 길이만큼 넓어지면 모바일에서 값 열이 가려진다. 폭은 지표명이 정한다.
 */
const MetricDescription = styled.p`
  width: 0;
  min-width: 100%;
  margin-top: 4px;
  color: var(--color-text-600);
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  white-space: normal;
  word-break: keep-all;
  overflow-wrap: anywhere;
`

const CornerHead = styled.th`
  ${stickyFirstColumn}
  z-index: 2;
  padding: 14px;
  border-bottom: 1px solid var(--color-border-300);
  text-align: left;
`

/* 숫자 열은 오른쪽 정렬이다 — 자릿수가 맞아야 두 값을 눈으로 비교할 수 있다. */
const ColumnHead = styled.th`
  min-width: 152px;
  padding: 14px;
  border-bottom: 1px solid var(--color-border-300);
  text-align: right;
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
  text-align: right;
  white-space: nowrap;
`

/*
 * 차이 열은 보조 정보다 — 값보다 약하게 적어 좌·우 비교를 방해하지 않는다.
 * 부호로 좋고 나쁨을 칠하지 않는다(중립색 하나).
 */
const DiffCell = styled(Cell)`
  color: var(--color-text-600);
`

const DiffRate = styled.span`
  display: block;
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
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

/*
 * 가로로 굴러도 소제목이 남아 있게 한다 — 셀은 표 폭만큼 넓다. 폭은 보이는
 * 스크롤 영역(`100cqi`)에서 좌우 여백을 뺀 만큼이라 설명이 화면 안에서 줄바꿈한다.
 */
const SectionLabel = styled.span`
  position: sticky;
  left: 14px;
  display: inline-block;
  max-width: calc(100cqi - 28px);
`

const GroupDescription = styled.span`
  display: block;
  margin-top: 4px;
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
  word-break: keep-all;
  overflow-wrap: anywhere;
`

/* 상세 묶음 소제목. 소제목 자체가 펼침 버튼이다 — 터치 영역 44px. */
const SectionToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  svg {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    transition: transform 0.2s ease;
  }

  &[aria-expanded='true'] svg {
    transform: rotate(180deg);
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }
  }
`

const GroupCount = styled.span`
  color: var(--color-text-caption);
  font-size: 12px;
`

const Notice = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
`

const Bases = styled.ul`
  display: grid;
  gap: 4px;
  padding-left: 18px;
  list-style: disc;
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

const toggleIn = (set: ReadonlySet<string>, key: string): Set<string> => {
  const next = new Set(set)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  return next
}

/**
 * 비교 지표 표. 좌·우 값과 차이만 적는다.
 *
 * 🔴 **승패를 칠하지 않는다.** 응답에는 지표마다 `winnerSide` 가 있지만 이 표는
 * 그것을 받지 않는다(`ComparisonRow` 에 아예 없다). 색이 붙는 순간 사용자는 그것을
 * "더 나은 선택"으로 읽는데, 어느 쪽이 맞는지는 업종과 계획에 달렸다. 추천측과
 * 그 이유는 근거가 함께 나오는 리포트 영역이 말한다.
 *
 * 핵심 묶음은 펼쳐 두고 분포(시간대·연령·성별) 묶음은 **묶음마다** 접는다(명세
 * compare D4-6). 표는 하나로 두고 묶음마다 `tbody` 하나에 소제목과 행을 함께 둔 채
 * 데이터 `<tr>` 에만 `hidden` 을 건다 — 접힌 묶음을 따로 떼면 가로 스크롤이
 * 갈라지고, 소제목과 행을 다른 tbody 로 나누면 `scope="rowgroup"` 머리가 행에
 * 연결되지 않는다. 버튼이 가리키는 tbody 는 늘 DOM 에 있어 `aria-controls` 가 유효하다.
 */
export default function RecommendCompareTable({
  groups,
  leftName,
  rightName,
  bases = [],
}: RecommendCompareTableProps) {
  // 지표 이름 + 좌 + 우 + 차이.
  const columnCount = 4
  const idPrefix = useId()
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [openDescriptions, setOpenDescriptions] = useState<ReadonlySet<string>>(
    () => new Set(),
  )

  return (
    <Root>
      <Notice>{COMPARISON_NEUTRAL_NOTICE}</Notice>

      {bases.length > 0 ? (
        <Bases aria-label="비교 기준">
          {bases.map(basis => (
            <li key={basis}>{basis}</li>
          ))}
        </Bases>
      ) : null}

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
                <Name>{COMPARISON_DIFF_HEADER}</Name>
              </ColumnHead>
            </tr>
          </thead>

          {groups.map(group => {
            const groupBodyId = `${idPrefix}-${group.key}-body`
            const isExpanded = !group.isDetail || expandedGroups.has(group.key)

            // `{' '}` — 없으면 접근 가능한 이름이 「매출 시간대2개 지표」로 붙는다.
            const heading = (
              <>
                {group.label}
                {group.isDetail ? (
                  <>
                    {' '}
                    <GroupCount>{group.rows.length}개 지표</GroupCount>
                  </>
                ) : null}
              </>
            )

            const rows = group.rows.map(row => {
              const descriptionId = `${idPrefix}-${row.key}-description`
              const isDescriptionOpen = openDescriptions.has(row.key)

              return (
                <tr key={row.key} hidden={!isExpanded}>
                  <RowHead scope="row">
                    <RowLabel>
                      {row.label}
                      {row.description ? (
                        <HelpButton
                          type="button"
                          // 묶음 이름을 붙인다 — 매출·유동인구 시간대가 둘 다 `00-06` 이다.
                          aria-label={`${group.label} ${row.label} 설명`}
                          aria-expanded={isDescriptionOpen}
                          aria-controls={descriptionId}
                          onClick={() =>
                            setOpenDescriptions(current =>
                              toggleIn(current, row.key),
                            )
                          }
                        >
                          <CircleHelp aria-hidden="true" />
                        </HelpButton>
                      ) : null}
                    </RowLabel>
                    {row.description ? (
                      <MetricDescription
                        id={descriptionId}
                        hidden={!isDescriptionOpen}
                      >
                        {row.description}
                      </MetricDescription>
                    ) : null}
                  </RowHead>
                  <Cell>{row.left}</Cell>
                  <Cell>{row.right}</Cell>
                  <DiffCell>
                    {row.diff}
                    {row.diffRate ? <DiffRate>{row.diffRate}</DiffRate> : null}
                  </DiffCell>
                </tr>
              )
            })

            return (
              /*
               * 묶음마다 `tbody` 는 **하나**다. 소제목(`scope="rowgroup"`)이 같은 tbody 의
               * 데이터 행을 머리해야 스크린리더가 `00-06` 을 「매출 시간대」 행으로 읽는다
               * — 소제목과 행을 다른 tbody 로 나누면 머리가 끊긴다. 접기 버튼은 이 tbody 를
               * 가리키고(늘 존재), 접힌 동안 데이터 `<tr>` 에만 `hidden` 을 건다.
               */
              <tbody key={group.key} id={groupBodyId}>
                <tr>
                  {/*
                    `scope="rowgroup"` 이다. 이 칸은 열을 머리하지 않고, 자기 `tbody`
                    안에서 뒤따르는 행들을 머리한다 — 전체 폭 `th` 가 행 그룹을 머리하는
                    경우다. `colgroup` 을 쓰면 보조기술이 축을 반대로 읽는다.
                  */}
                  <SectionHead colSpan={columnCount} scope="rowgroup">
                    <SectionLabel>
                      {group.isDetail ? (
                        <SectionToggle
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={groupBodyId}
                          onClick={() =>
                            setExpandedGroups(current =>
                              toggleIn(current, group.key),
                            )
                          }
                        >
                          <ChevronDown aria-hidden="true" />
                          {heading}
                        </SectionToggle>
                      ) : (
                        heading
                      )}
                      {group.description ? (
                        <GroupDescription>{group.description}</GroupDescription>
                      ) : null}
                      {/*
                        모든 행이 같은 설명이면 행마다 도움말 버튼(Tab 정지)을 두지 않고
                        여기 한 번만 적는다. 접혀 있어도 읽힌다.
                      */}
                      {group.sharedRowDescription ? (
                        <GroupDescription>
                          {group.sharedRowDescription}
                        </GroupDescription>
                      ) : null}
                    </SectionLabel>
                  </SectionHead>
                </tr>
                {rows}
              </tbody>
            )
          })}
        </Table>
      </Scroller>
    </Root>
  )
}
