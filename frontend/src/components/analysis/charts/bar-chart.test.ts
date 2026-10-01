import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import BarChart, {
  resolveBarCells,
  toBarChartData,
} from '@/components/analysis/charts/bar-chart'

describe('BarChart', () => {
  it('resolveBarCells는 emphasisLabels에 매칭되는 항목만 emphasis=true로 표시', () => {
    const cells = resolveBarCells(
      [
        { label: '월', value: 10 },
        { label: '토', value: 30 },
      ],
      ['토', '일'],
    )
    expect(cells).toEqual([
      { label: '월', value: 10, emphasis: false },
      { label: '토', value: 30, emphasis: true },
    ])
  })

  it('highlightMax 는 가장 큰 막대 하나만 강조하고 emphasisLabels 를 무시한다', () => {
    const cells = resolveBarCells(
      [
        { label: '목', value: 2950 },
        { label: '토', value: 2600 },
        { label: '일', value: 2950 },
      ],
      ['토', '일'],
      true,
    )
    expect(cells.map(cell => cell.emphasis)).toEqual([true, false, false])
  })

  it('highlightMax 에서 값이 모두 0 이하이거나 없으면 아무것도 강조하지 않는다', () => {
    const cells = resolveBarCells(
      [
        { label: '10대', value: 0 },
        { label: '20대', value: null },
      ],
      [],
      true,
    )
    expect(cells.every(cell => !cell.emphasis)).toBe(true)
  })

  it('앞쪽 막대가 0·null 이어도 값 라벨은 강조 막대 행에만 실린다', () => {
    const data = toBarChartData(
      resolveBarCells(
        [
          { label: '10대', value: 0 },
          { label: '20대', value: null },
          { label: '30대', value: 80 },
          { label: '40대', value: 60 },
        ],
        [],
        true,
      ),
    )
    expect(data.map(row => row.labelValue)).toEqual([null, null, 80, null])
  })

  it('emphasisLabels가 없으면 모두 emphasis=false', () => {
    const cells = resolveBarCells([{ label: '월', value: 10 }])
    expect(cells[0].emphasis).toBe(false)
  })

  it('전부 null이면 데이터 없음 안내만 보여준다', () => {
    const markup = renderToStaticMarkup(
      createElement(BarChart, {
        items: [
          { label: '월', value: null },
          { label: '화', value: null },
        ],
        unit: '명',
        ariaLabel: '요일별 유동인구 막대 차트',
      }),
    )
    expect(markup).toContain('데이터 없음')
  })

  it('BarChart는 optional height prop을 노출한다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./bar-chart.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain('height?: number')
    expect(src).toContain('height = 240')
  })

  it('막대 Y 축은 0 기준선을 강제한다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./bar-chart.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain('includeZero: true')
  })

  it('단위가 원·명이면 축 단위 표기를 그린다', () => {
    const markup = renderToStaticMarkup(
      createElement(BarChart, {
        items: [{ label: '월', value: 10 }],
        unit: '원',
        ariaLabel: '요일별 매출 막대 차트',
      }),
    )
    expect(markup).toContain('(원)')
  })
})
