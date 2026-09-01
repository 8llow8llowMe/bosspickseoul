'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import styled from 'styled-components'

import {
  ANALYSIS_PERIOD_CODE,
  createAnalysisResultHref,
} from '@/lib/analysis/selection'
import {
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

/* 표가 넘칠 때 **페이지 본문이 아니라 이 컨테이너만** 가로로 구른다. */
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

const GroupCaption = styled.caption`
  padding: 14px 14px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: left;
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

const EMPTY_SCORE = '—'

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

  const renderHead = (caption: string) => (
    <>
      <GroupCaption>{caption}</GroupCaption>
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
    </>
  )

  return (
    <Root>
      <Scroller>
        <Table data-compare-scores="true">
          {renderHead(
            '추천이 매긴 점수예요. 100점에 가까울수록 그 지표가 강해요.',
          )}
          <tbody>
            {scoreRows.map(row => (
              <tr key={row.key}>
                <RowHead scope="row">{row.label}</RowHead>
                {row.cells.map(cell => (
                  <Cell key={`${row.key}-${cell.commercialCode}`}>
                    {cell.score === null ? (
                      EMPTY_SCORE
                    ) : (
                      <ScoreValue
                        style={{ color: getScoreQualityColor(cell.quality) }}
                      >
                        {cell.score}
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
        </Table>
      </Scroller>

      <Scroller>
        <Table data-compare-metrics="true">
          {renderHead(
            '값 그대로예요. 어느 쪽이 좋은지는 계획에 따라 달라져요.',
          )}
          <tbody>
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
