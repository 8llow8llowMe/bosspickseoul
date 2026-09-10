import { describe, expect, it } from 'vitest'

import {
  CHART_COLORS,
  createAxisTickFormatter,
  formatChartValue,
} from '@/components/analysis/charts/chart-theme'
import { computeNiceYScale } from '@/lib/analysis/chart-scale'

describe('chart-theme', () => {
  it('시리즈 색은 디자인 토큰 CSS 변수 문자열을 노출한다', () => {
    expect(CHART_COLORS.seriesPrimary).toBe('var(--color-primary-600)')
    expect(CHART_COLORS.seriesSecondary).toBe('var(--color-blue-500)')
    expect(CHART_COLORS.grid).toBe('var(--color-border-200)')
  })

  it('formatChartValue는 단위를 붙이고 null은 데이터 없음으로 표기한다', () => {
    expect(formatChartValue(1234, '명')).toBe('1,234명')
    expect(formatChartValue(null, '명')).toBe('데이터 없음')
  })
})

/*
 * 사용자 지적: 손익 차트 축이 「1만 / 5,000 / 0 / -5,000 / -1.5만」처럼 **단위가 섞여**
 * 보였다. 값마다 단위를 따로 골라서 1만을 넘는 눈금만 만 단위가 됐기 때문이다 —
 * 같은 축의 눈금끼리 자릿수를 비교할 수 없다.
 */
describe('createAxisTickFormatter', () => {
  it('축 전체가 가장 큰 눈금의 단위를 함께 쓴다', () => {
    const ticks = [-15_000, -10_000, -5_000, 0, 5_000, 10_000]
    const format = createAxisTickFormatter(ticks)

    expect(ticks.map(format)).toEqual([
      '-1.5만',
      '-1만',
      '-0.5만',
      '0',
      '0.5만',
      '1만',
    ])
  })

  /* 예전 동작을 명시적으로 잠근다 — 이 조합이 다시 나오면 실패한다. */
  it('한 축 안에서 단위가 섞이지 않는다', () => {
    const format = createAxisTickFormatter([-15_000, 5_000, 10_000])
    const rendered = [-15_000, 5_000, 10_000].map(format)

    const withUnit = rendered.filter(text => text.includes('만')).length
    expect(withUnit).toBe(rendered.length)
  })

  it('모든 눈금이 1만 미만이면 단위 없이 콤마로 적는다', () => {
    const format = createAxisTickFormatter([0, 2_500, 5_000])
    expect([0, 2_500, 5_000].map(format)).toEqual(['0', '2,500', '5,000'])
  })

  it('만·억 컴팩트 표기 자체는 그대로다', () => {
    const format = createAxisTickFormatter([4_500_000])
    expect(format(600_000)).toBe('60만')
    expect(format(4_500_000)).toBe('450만')
  })

  it('억 단위 축도 하나로 통일한다', () => {
    const format = createAxisTickFormatter([0, 50_000_000, 250_000_000])
    expect([0, 50_000_000, 250_000_000].map(format)).toEqual([
      '0',
      '0.5억',
      '2.5억',
    ])
  })

  /*
   * 실측에서 나온 결함: 자치구 상세 「분기별 추이」 축이 눈금 4개인데
   * 「1.4억 · 1.4억 · 1.5억 · 1.5억」으로 그려졌다 — 소수 1자리 고정이라 서로 다른
   * 값이 같은 글자가 됐다. 눈금선 사이 값을 가늠할 수 없다.
   */
  it('눈금이 서로 다른 글자가 되도록 소수 자리를 늘린다', () => {
    const ticks = [140_000_000, 145_000_000, 150_000_000, 155_000_000]
    const format = createAxisTickFormatter(ticks)
    const rendered = ticks.map(format)

    expect(rendered).toEqual(['1.4억', '1.45억', '1.5억', '1.55억'])
    expect(new Set(rendered).size).toBe(ticks.length)
  })

  it('구분에 필요 없으면 소수를 붙이지 않는다', () => {
    const ticks = [0, 10_000, 20_000, 30_000]
    expect(ticks.map(createAxisTickFormatter(ticks))).toEqual([
      '0',
      '1만',
      '2만',
      '3만',
    ])
  })

  it('빈 축·비정상 값에도 죽지 않는다', () => {
    const format = createAxisTickFormatter([null, undefined, Number.NaN])
    expect(format(0)).toBe('0')
    expect(format(Number.NaN)).toBe('')
  })
})

/*
 * 무회귀 잠금. `/status`·`/analysis` 의 축은 전부 원·명·개 정수라
 * `computeNiceYScale` 이 1·2·5×10ⁿ 간격의 정수 눈금을 낸다. 소수 자리 규칙을 손대도
 * **이 라벨들은 한 글자도 바뀌면 안 된다** — 여기 적힌 값은 규칙을 바꾸기 전에 찍어
 * 그대로 옮긴 것이다.
 */
describe('createAxisTickFormatter 정수 축 무회귀', () => {
  const cases: ReadonlyArray<readonly [readonly number[], readonly string[]]> =
    [
      [
        [0, 5, 10, 15, 20],
        ['0', '5', '10', '15', '20'],
      ],
      [
        [0, 200, 400, 600, 800],
        ['0', '200', '400', '600', '800'],
      ],
      [
        [0, 2_000, 4_000, 6_000, 8_000],
        ['0', '2,000', '4,000', '6,000', '8,000'],
      ],
      [
        [0, 20_000, 40_000, 60_000, 80_000, 100_000],
        ['0', '2만', '4만', '6만', '8만', '10만'],
      ],
      [
        [0, 400_000, 800_000, 1_200_000],
        ['0', '40만', '80만', '120만'],
      ],
      [
        [0, 1_500_000, 3_000_000, 4_500_000],
        ['0', '150만', '300만', '450만'],
      ],
      [
        [0, 50_000_000, 100_000_000],
        ['0', '0.5억', '1억'],
      ],
      // 백분율·비율 축은 정수가 아니지만 간격이 넓다 — 여기도 그대로여야 한다.
      [
        [0, 0.2, 0.4, 0.6, 0.8],
        ['0', '0.2', '0.4', '0.6', '0.8'],
      ],
    ]

  it.each(cases)('%j 라벨이 그대로다', (ticks, expected) => {
    expect(ticks.map(createAxisTickFormatter(ticks))).toEqual(expected)
  })
})

/*
 * #319. `computeNiceYScale` 이 눈금을 정수로 반올림하지 않게 된 뒤(#315) 소수 눈금이
 * 축까지 살아 내려온다. 자리 상한이 2 로 고정돼 있고 접미사 없는 경로가 자리 수를
 * 아예 무시하면, 간격이 좁은 축에서 눈금 여러 개가 **같은 글자**가 된다.
 *
 * 불변식: 유효 눈금이 서로 다르면 포맷된 라벨도 서로 달라야 한다.
 */
describe('createAxisTickFormatter 라벨 유일성 불변식', () => {
  const cases: ReadonlyArray<readonly [string, readonly number[]]> = [
    ['정수 눈금', [0, 5, 10, 15, 20]],
    ['소수 눈금(단위 접미사 없음)', [0, 0.0005, 0.001]],
    ['만 단위로 나눈 뒤 간격이 좁은 눈금', [10_000, 10_050, 10_100]],
    ['이슈 실측 재현', [10_000.4, 10_001.6]],
  ]

  it.each(cases)('%s 은 서로 다른 라벨이 된다', (_name, ticks) => {
    const rendered = ticks.map(createAxisTickFormatter(ticks))
    expect(new Set(rendered).size).toBe(new Set(ticks).size)
  })

  it('간격에 맞춰 소수 자리를 2 자리 위로도 늘린다', () => {
    const ticks = [10_000, 10_050, 10_100]
    expect(ticks.map(createAxisTickFormatter(ticks))).toEqual([
      '1만',
      '1.005만',
      '1.01만',
    ])
  })

  it('접미사 없는 경로도 간격이 좁으면 소수를 더 적는다', () => {
    const ticks = [0, 0.0005, 0.001]
    expect(ticks.map(createAxisTickFormatter(ticks))).toEqual([
      '0',
      '0.0005',
      '0.001',
    ])
  })

  it('이슈 실측 [10000.4, 10001.6] 이 같은 글자로 뭉치지 않는다', () => {
    const ticks = [10_000.4, 10_001.6]
    expect(ticks.map(createAxisTickFormatter(ticks))).toEqual([
      '1만',
      '1.0002만',
    ])
  })

  /*
   * 손으로 고른 눈금 몇 개로는 부족하다 — 라벨이 뭉치는 축은 `computeNiceYScale` 이
   * 실제로 만드는 눈금에서 나온다. 특히 **높은 기준선 위의 좁은 데이터**(분기별 추이가
   * 그렇다)는 #315 이후 소수 눈금이 되어, 자리 상한 2 에서 아래 조합의 10%가 같은
   * 글자로 뭉쳤다. 축을 만들어 내는 두 모듈을 함께 잠근다.
   * `spreads` 를 1/100000 아래로 넓히면 단위 기준 간격이 1e-6 미만인 축이 나와
   * 상한에 걸린다 — 그 영역은 이 테스트가 덮지 않는다(현재 데이터로 미도달).
   */
  it('computeNiceYScale 이 만드는 눈금은 기준선 대비 1/1000 폭까지 서로 다른 라벨이 된다', () => {
    const mantissas = [1, 1.3, 2.7, 4.5, 6.1, 8.9]
    const exponents = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    // 0 = 데이터가 자릿수만큼 퍼진 축, 3 = 기준선 대비 1/1000 폭에 몰린 축.
    const spreads = [0, 1, 2, 3]
    const collisions: string[] = []

    for (const exponent of exponents) {
      for (const base of mantissas) {
        for (const width of mantissas) {
          for (const spread of spreads) {
            for (const sign of [1, -1]) {
              const from = sign * base * 10 ** exponent
              const { ticks } = computeNiceYScale([
                from,
                from + width * 10 ** (exponent - spread),
              ])
              const rendered = ticks.map(createAxisTickFormatter(ticks))
              if (new Set(rendered).size !== new Set(ticks).size) {
                collisions.push(
                  `${JSON.stringify(ticks)} → ${JSON.stringify(rendered)}`,
                )
              }
            }
          }
        }
      }
    }

    expect(collisions).toEqual([])
  })
})
