import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import LineChart, {
  describeLatestChange,
  hasLineData,
} from '@/components/analysis/charts/line-chart'
import type { TrendPoint } from '@/lib/analysis/chart-data'

const pt = (periodLabel: string, value: number | null): TrendPoint => ({
  periodLabel,
  value,
  changeRate: null,
})

describe('LineChart', () => {
  it('hasLineData는 number 값이 하나라도 있으면 true, 전부 null이면 false', () => {
    expect(hasLineData([pt('1분기', 10), pt('2분기', null)])).toBe(true)
    expect(hasLineData([pt('1분기', null), pt('2분기', null)])).toBe(false)
    expect(hasLineData([])).toBe(false)
  })

  it('데이터가 없으면 데이터 없음 안내를 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(LineChart, {
        points: [pt('1분기', null)],
        unit: '명',
      }),
    )
    expect(markup).toContain('데이터 없음')
  })

  it('direction이 주어지면 방향 배지 라벨을 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(LineChart, {
        points: [pt('1분기', 10), pt('2분기', 20)],
        unit: '명',
        direction: 'INCREASE',
      }),
    )
    expect(markup).toContain('상승')
  })

  it('changeSubject 가 있으면 직전 분기 대비 문장을 주어와 함께 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(LineChart, {
        points: [pt('1분기', 200), pt('2분기', 150)],
        unit: '원',
        direction: 'INCREASE',
        changeSubject: '매출이',
      }),
    )
    expect(markup).toContain('매출이 직전 분기보다 25% 줄었어요')
    expect(markup).toContain('▼')
    // 문장은 role="img" 밖에 있어야 보조기기가 읽는다.
    const imgStart = markup.indexOf('role="img"')
    expect(markup.indexOf('매출이 직전 분기보다')).toBeLessThan(imgStart)
  })

  it('describeLatestChange 는 마지막 두 값으로 방향과 문장을 만든다', () => {
    expect(
      describeLatestChange([pt('a', 100), pt('b', 104.2)], '유동인구가'),
    ).toEqual({
      direction: 'INCREASE',
      sentence: '유동인구가 직전 분기보다 4.2% 늘었어요',
    })
    expect(
      describeLatestChange([pt('a', 10), pt('b', 10)], '점포 수가'),
    ).toEqual({
      direction: 'STAGNANT',
      sentence: '점포 수가 직전 분기와 같아요',
    })
    expect(describeLatestChange([pt('a', 0), pt('b', 3)], '점포 수가')).toEqual(
      {
        direction: 'INCREASE',
        sentence: '점포 수가 직전 분기보다 늘었어요',
      },
    )
    expect(
      describeLatestChange(
        [pt('a', 3_000_000), pt('b', 3_001_000)],
        '유동인구가',
      ),
    ).toEqual({
      direction: 'STAGNANT',
      sentence: '유동인구가 직전 분기와 거의 같아요',
    })
    expect(describeLatestChange([pt('a', 10)], '매출이')).toBeNull()
    expect(
      describeLatestChange([pt('a', 10), pt('b', 12), pt('c', null)], '매출이'),
    ).toBeNull()
  })

  it('LineChart는 optional height prop을 노출한다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./line-chart.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain('height?: number')
    expect(src).toContain('height = 240')
  })
})
