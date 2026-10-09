'use client'

import styled from 'styled-components'

import { formatChartValue } from './chart-theme'

/*
  차트 값을 보조기기로 읽게 하는 **시각적으로 숨긴 표**.

  `role="img"` 는 이름만 읽힌다(「요일별 매출 막대 차트」). 값은 SVG 안에 있어 접근성 트리에
  나오지 않으므로, 같은 값을 표로 한 번 더 싣는다(WCAG 1.1.1).
  표는 `role="img"` 요소 **바로 뒤 형제**로 둔다 — img 의 자식은 보조기기에서 표현용으로 취급돼
  표 구조가 사라진다. `aria-describedby` 는 쓰지 않는다: 표의 caption(차트 이름)만 설명으로 계산돼
  값은 읽지 않고 이름만 두 번 읽힌다. 값을 이미 글로 싣는 차트(ShareBar, 비용 구성 도넛)에는
  붙이지 않는다(같은 값을 두 번 읽는다).
*/

export type ChartTableSeries = {
  /** 열 제목. 단일 시리즈면 「값」. 단위는 셀에 붙으므로 제목에 쓰지 않는다. */
  name: string
  values: ReadonlyArray<number | null | undefined>
  /** 이 열만 다른 단위·포맷을 쓸 때(도넛의 비율 열). */
  unit?: string
  valueFormatter?: (value: number) => string
}

export type ChartTableInput = {
  categoryHeader: string
  categories: readonly string[]
  series: readonly ChartTableSeries[]
  /** 항목별 보조 설명(개업률·폐업률 등). 하나라도 있으면 「비고」 열을 더한다. */
  notes?: ReadonlyArray<string | null | undefined>
  unit?: string
  valueFormatter?: (value: number) => string
}

export type ChartTableModel = {
  headers: string[]
  rows: string[][]
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const NOTE_HEADER = '비고'

/** 행·열 문자열을 만든다. 값 포맷은 차트 툴팁과 같은 `formatChartValue` 를 쓴다. */
export const buildChartTable = ({
  categoryHeader,
  categories,
  series,
  notes,
  unit = '',
  valueFormatter,
}: ChartTableInput): ChartTableModel => {
  const formatterFor = (column: ChartTableSeries) => {
    const columnUnit = column.unit ?? unit
    const format = column.valueFormatter ?? valueFormatter
    return (value: number | null | undefined): string => {
      if (!isNumber(value)) return '데이터 없음'
      return format ? format(value) : formatChartValue(value, columnUnit)
    }
  }
  const formatters = series.map(formatterFor)
  const hasNotes = notes?.some(note => Boolean(note)) ?? false
  return {
    headers: [
      categoryHeader,
      ...series.map(column => column.name),
      ...(hasNotes ? [NOTE_HEADER] : []),
    ],
    rows: categories.map((category, index) => [
      category,
      ...series.map((column, columnIndex) =>
        formatters[columnIndex](column.values[index]),
      ),
      ...(hasNotes ? [notes?.[index] ?? ''] : []),
    ]),
  }
}

/* 표가 아니라 래퍼에 숨김 스타일을 준다 — table 은 width/height 1px 가 먹지 않아 큰 박스가
   다음 콘텐츠 위에 놓인다. */
const Hidden = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
`

export type ChartDataTableProps = ChartTableInput & {
  /** 표 이름. 차트의 `ariaLabel` 을 그대로 쓴다. */
  caption: string
}

export function ChartDataTable({ caption, ...input }: ChartDataTableProps) {
  const { headers, rows } = buildChartTable(input)
  return (
    <Hidden>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={`${index}-${header}`} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([category, ...cells], rowIndex) => (
            <tr key={`${category}-${rowIndex}`}>
              <th scope="row">{category}</th>
              {cells.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Hidden>
  )
}
