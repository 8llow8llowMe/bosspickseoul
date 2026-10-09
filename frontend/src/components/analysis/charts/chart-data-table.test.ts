import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import BarChart from '@/components/analysis/charts/bar-chart'
import { buildChartTable } from '@/components/analysis/charts/chart-data-table'
import DonutChart from '@/components/analysis/charts/donut-chart'
import HorizontalBarChart from '@/components/analysis/charts/horizontal-bar-chart'
import LineChart from '@/components/analysis/charts/line-chart'
import PopulationPyramid from '@/components/analysis/charts/population-pyramid'
import ShareBar from '@/components/analysis/charts/share-bar'

describe('buildChartTable', () => {
  it('범주·값 열을 만들고 값에 단위를 붙인다', () => {
    const table = buildChartTable({
      categoryHeader: '구분',
      categories: ['월', '화'],
      series: [{ name: '값', values: [1200, 30] }],
      unit: '명',
    })
    expect(table.headers).toEqual(['구분', '값'])
    expect(table.rows).toEqual([
      ['월', '1,200명'],
      ['화', '30명'],
    ])
  })

  it('null·NaN 은 「데이터 없음」, 단위가 없으면 열 제목에 괄호를 붙이지 않는다', () => {
    const table = buildChartTable({
      categoryHeader: '기간',
      categories: ['1분기', '2분기'],
      series: [{ name: '값', values: [null, Number.NaN] }],
    })
    expect(table.headers).toEqual(['기간', '값'])
    expect(table.rows).toEqual([
      ['1분기', '데이터 없음'],
      ['2분기', '데이터 없음'],
    ])
  })

  it('다중 시리즈는 시리즈별 열을 만들고 valueFormatter 를 우선한다', () => {
    const table = buildChartTable({
      categoryHeader: '연령',
      categories: ['20대'],
      series: [
        { name: '남성', values: [12] },
        { name: '여성', values: [8], valueFormatter: value => `${value}점` },
      ],
      unit: '%',
    })
    expect(table.headers).toEqual(['연령', '남성', '여성'])
    expect(table.rows).toEqual([['20대', '12%', '8점']])
  })
})

/** 표가 role=img 요소 바로 다음 형제로 오고 aria-describedby 가 없는지. */
const expectTable = (markup: string, caption: string) => {
  expect(markup).not.toContain('aria-describedby')
  expect(markup).toMatch(/role="img"[\s\S]*<\/div><div[^>]*><table>/)
  expect(markup).toContain(`<caption>${caption}</caption>`)
}

describe('차트 숨긴 표', () => {
  it('BarChart', () => {
    const markup = renderToStaticMarkup(
      createElement(BarChart, {
        items: [
          { label: '월', value: 1200 },
          { label: '화', value: null },
        ],
        unit: '명',
        ariaLabel: '요일별 방문 막대 차트',
      }),
    )
    expectTable(markup, '요일별 방문 막대 차트')
    expect(markup).toContain('<th scope="row">월</th><td>1,200명</td>')
    expect(markup).toContain('<th scope="row">화</th><td>데이터 없음</td>')
    expect(markup).not.toContain('값 (명)')
  })

  it('HorizontalBarChart', () => {
    const markup = renderToStaticMarkup(
      createElement(HorizontalBarChart, {
        items: [{ label: '카페', value: 50 }],
        unit: '건',
        ariaLabel: '업종별 건수',
      }),
    )
    expectTable(markup, '업종별 건수')
    expect(markup).toContain('<th scope="row">카페</th><td>50건</td>')
  })

  it('LineChart', () => {
    const markup = renderToStaticMarkup(
      createElement(LineChart, {
        points: [
          { periodLabel: '2025 1분기', value: 10, changeRate: null },
          { periodLabel: '2025 2분기', value: 20, changeRate: null },
        ],
        unit: '명',
      }),
    )
    expectTable(markup, '분기별 추세 라인 차트')
    expect(markup).toContain('<th scope="row">2025 2분기</th><td>20명</td>')
  })

  it('PopulationPyramid 는 남성·여성 열을 둔다', () => {
    const markup = renderToStaticMarkup(
      createElement(PopulationPyramid, {
        rows: [{ ageLabel: '20대', male: 12, female: null }],
      }),
    )
    expectTable(markup, '연령·성별 인구 피라미드')
    expect(markup).toContain('>남성</th>')
    expect(markup).toContain('>여성</th>')
    expect(markup).toContain(
      '<th scope="row">20대</th><td>12%</td><td>데이터 없음</td>',
    )
  })

  it('DonutChart 는 값·비율 열을 둔다(단위가 %면 비율 열만)', () => {
    const counts = renderToStaticMarkup(
      createElement(DonutChart, {
        segments: [
          { label: '남성', value: 30 },
          { label: '여성', value: 70 },
        ],
        ariaLabel: '성별 건수',
        unit: '건',
      }),
    )
    expectTable(counts, '성별 건수')
    expect(counts).toContain(
      '<th scope="row">여성</th><td>70건</td><td>70%</td>',
    )

    const percent = renderToStaticMarkup(
      createElement(DonutChart, {
        segments: [{ label: '남성', value: 40 }],
        ariaLabel: '성별 비율',
        unit: '%',
      }),
    )
    expect(percent).toContain('>비율</th>')
    expect(percent).not.toContain('>값</th>')
  })

  it('ShareBar 는 이미 값을 읽으므로 표를 붙이지 않는다', () => {
    const markup = renderToStaticMarkup(
      createElement(ShareBar, {
        segments: [
          { label: '남성', value: 40, color: '#000' },
          { label: '여성', value: 60, color: '#fff' },
        ],
        unit: '%',
        ariaLabel: '성별',
      }),
    )
    expect(markup).not.toContain('<table')
    expect(markup).toContain('남성 40%')
  })

  it('DonutChart 는 dataTable=false 면 표를 붙이지 않는다', () => {
    const markup = renderToStaticMarkup(
      createElement(DonutChart, {
        segments: [{ label: '임대료', value: 40 }],
        ariaLabel: '비용 구성 비율',
        dataTable: false,
      }),
    )
    expect(markup).not.toContain('<table')
    expect(markup).toContain('role="img"')
  })

  it('HorizontalBarChart 는 subLabel 이 있으면 「비고」 열을 더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(HorizontalBarChart, {
        items: [
          { label: '카페', value: 5, subLabel: '7개' },
          { label: '식당', value: 3 },
        ],
        unit: '%',
        ariaLabel: '업종별 변화',
      }),
    )
    expect(markup).toContain('>비고</th>')
    expect(markup).toContain('<th scope="row">카페</th><td>5%</td><td>7개</td>')
    expect(markup).toContain('<th scope="row">식당</th><td>3%</td><td></td>')
  })
})

describe('buildChartTable 비고', () => {
  it('notes 가 모두 비면 열을 만들지 않는다', () => {
    const table = buildChartTable({
      categoryHeader: '구분',
      categories: ['a'],
      series: [{ name: '값', values: [1] }],
      notes: [undefined],
    })
    expect(table.headers).toEqual(['구분', '값'])
  })
})
