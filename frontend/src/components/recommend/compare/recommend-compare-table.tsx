'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import styled from 'styled-components'

import {
  ANALYSIS_PERIOD_CODE,
  createAnalysisResultHref,
} from '@/lib/analysis/selection'
import {
  COMPARE_EMPTY_CELL,
  COMPARE_NEUTRAL_NOTICE,
  toCompareMetricRows,
  toCompareScoreRows,
  type CompareColumnInput,
} from '@/lib/recommend/compare-presentation'
import {
  getScoreQualityColor,
  getScoreQualityLabel,
} from '@/lib/recommend/metric-polarity'

export type RecommendCompareTableProps = {
  columns: readonly CompareColumnInput[]
  districtCode: string
  administrationCode: string
  serviceCode: string
  /** 프로필을 못 받은 열. 그 열의 원지표 자리에만 사실을 적는다. */
  failedProfileCodes?: readonly string[]
}

const Root = styled.section`
  display: grid;
  gap: 16px;
`

/*
 * 표가 넘칠 때 **페이지 본문이 아니라 이 컨테이너만** 가로로 구른다.
 * 스크롤 컨테이너는 **하나뿐**이다(명세 §5.5). 점수 블록과 원지표 블록을 각각
 * 다른 컨테이너에 넣으면 둘이 따로 구른다 — 3열의 점수를 보면서 1열의 원지표를
 * 보게 되고, 고정된 지표 이름 열은 그 어긋남을 알려 주지 않는다.
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
  min-width: 132px;
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

const Rank = styled.span`
  display: block;
  color: var(--color-text-caption);
  font-size: 12px;
  font-weight: 700;
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

/*
 * 색은 styled-components 템플릿이 아니라 인라인 style 로 건다 — 이 저장소는
 * ServerStyleSheet 없이 renderToStaticMarkup 문자열만으로 테스트하므로(§ 전역 제약),
 * \`$color\` prop 으로 만든 CSS 규칙은 <style> 태그에만 있고 문자열 출력에는 없다.
 * \`score-gauge.tsx\` 도 같은 이유로 인라인 style 을 쓴다.
 */
const ScoreValue = styled.span`
  font-weight: 700;
`

/* 공유 컴포넌트가 아니다 — `recommend-result-list.tsx` 도 같은 것을 지역으로 두고 있다.
   등급 문구는 눈으로는 색이 말하고, 보조기기에는 글자로 말해야 한다. */
const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`

const HighestBadge = styled.span`
  margin-left: 6px;
  padding: 2px 6px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-control);
  color: var(--color-text-600);
  font-size: 11px;
  font-weight: 700;
`

/*
 * 두 블록을 가르는 소제목 행. `<caption>` 은 표당 하나뿐이라 표를 하나로 합치면서
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

const Links = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const AnalysisLink = styled(Link)`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-900);
  font-size: 13px;
  font-weight: 700;

  &:hover {
    border-color: var(--color-primary-600);
    color: var(--color-primary-700);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

export default function RecommendCompareTable({
  columns,
  districtCode,
  administrationCode,
  serviceCode,
  failedProfileCodes = [],
}: RecommendCompareTableProps) {
  const scoreRows = toCompareScoreRows(columns)
  const metricRows = toCompareMetricRows(columns)
  const failed = new Set(failedProfileCodes)

  const columnCount = columns.length + 1

  /**
   * `scope="rowgroup"` 이다. 이 칸은 열을 머리하지 않고, 자기 `tbody` 안에서
   * 뒤따르는 행들을 머리한다 — 전체 폭 `th` 가 행 그룹을 머리하는 경우다.
   * `colgroup` 을 쓰면 보조기술이 축을 반대로 읽는다.
   */
  const renderSectionHead = (caption: string) => (
    <tr>
      <SectionHead colSpan={columnCount} scope="rowgroup">
        <SectionLabel>{caption}</SectionLabel>
      </SectionHead>
    </tr>
  )

  return (
    <Root>
      {/*
       * 점수 블록과 원지표 블록은 **한 표**다(명세 §5.2). 표가 둘이면 열 너비를
       * 각자 계산해 「84」 와 「8,452만원 가장 높음」 이 다른 폭을 만들고, 넘칠
       * 때는 서로 다른 열까지 굴러간다. 한 열의 점수와 그 열의 원지표를 나란히
       * 읽는 것이 이 화면의 전부라 그 어긋남은 화면의 목적을 지운다.
       */}
      <Scroller>
        <Table>
          <thead>
            <tr>
              <CornerHead scope="col">지표</CornerHead>
              {columns.map(column => (
                <ColumnHead key={column.commercialCode} scope="col">
                  {typeof column.candidate?.rank === 'number' ? (
                    <Rank>{column.candidate.rank}위</Rank>
                  ) : null}
                  <Name>
                    {column.candidate?.commercialName ??
                      column.profile?.commercialName ??
                      `상권 ${column.commercialCode}`}
                  </Name>
                </ColumnHead>
              ))}
            </tr>
          </thead>

          <tbody data-compare-scores="true">
            {renderSectionHead(
              '추천이 매긴 점수예요. 100점에 가까울수록 그 지표가 강해요.',
            )}
            {scoreRows.map(row => (
              <tr key={row.key}>
                <RowHead scope="row">{row.label}</RowHead>
                {row.cells.map(cell => (
                  <Cell key={`${row.key}-${cell.commercialCode}`}>
                    {cell.score === null ? (
                      COMPARE_EMPTY_CELL
                    ) : (
                      <ScoreValue
                        style={{ color: getScoreQualityColor(cell.quality) }}
                      >
                        {cell.formatted}
                        {getScoreQualityLabel(cell.quality) ? (
                          <VisuallyHidden>
                            {` ${getScoreQualityLabel(cell.quality)}`}
                          </VisuallyHidden>
                        ) : null}
                      </ScoreValue>
                    )}
                  </Cell>
                ))}
              </tr>
            ))}
          </tbody>

          {/*
           * 원지표 셀에는 `--score-*` 토큰이 **절대** 붙지 않는다. 이 9개 지표는
           * `METRIC_POLARITY` 에 방향이 없어(점포가 많은 것이 활황인지 과열인지
           * 제품이 답을 갖고 있지 않다) 색으로 답하는 척하면 화면이 조용히 반대로
           * 말한다. `data-compare-metrics` 는 그 부재를 단언하는 테스트의 손잡이다.
           */}
          <tbody data-compare-metrics="true">
            {renderSectionHead(
              '값 그대로예요. 어느 쪽이 좋은지는 계획에 따라 달라져요.',
            )}
            {metricRows.map(row => (
              <tr key={row.key}>
                <RowHead scope="row">{row.label}</RowHead>
                {row.cells.map(cell => (
                  <Cell key={`${row.key}-${cell.commercialCode}`}>
                    {failed.has(cell.commercialCode)
                      ? '지표를 불러오지 못했어요'
                      : cell.formatted}
                    {cell.isHighest && !failed.has(cell.commercialCode) ? (
                      <HighestBadge>가장 높음</HighestBadge>
                    ) : null}
                  </Cell>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </Scroller>

      <Notice>{COMPARE_NEUTRAL_NOTICE}</Notice>

      <Links>
        {columns.map(column => (
          <AnalysisLink
            key={column.commercialCode}
            data-analysis-link="true"
            href={createAnalysisResultHref(
              {
                districtCode,
                administrationCode,
                commercialCode: column.commercialCode,
                serviceCode,
                periodCode: ANALYSIS_PERIOD_CODE,
              },
              'summary',
            )}
          >
            {column.candidate?.commercialName ?? column.commercialCode} 분석
            보기
            <ArrowUpRight aria-hidden="true" />
          </AnalysisLink>
        ))}
      </Links>
    </Root>
  )
}
