import { describe, expect, it } from 'vitest'

import {
  COMPARISON_EMPTY_CELL,
  toComparisonBases,
  toComparisonGroups,
  toComparisonVerdict,
} from '@/lib/recommend/comparison-presentation'
import type {
  CommercialComparisonBody,
  ComparisonMetric,
} from '@/types/commercial-comparison'

const emptyGroups = {
  salesMetrics: null,
  footTrafficMetrics: null,
  storeMetrics: null,
  spendingMetrics: null,
  residentPopulationMetrics: null,
  facilityMetrics: null,
  salesTimeSlotMetrics: null,
  salesAgeMetrics: null,
  salesAgeGenderMetrics: null,
  footTrafficTimeSlotMetrics: null,
  footTrafficAgeMetrics: null,
  footTrafficAgeGenderMetrics: null,
}

const body = (
  overrides: Partial<CommercialComparisonBody> = {},
): CommercialComparisonBody =>
  ({
    left: null,
    right: null,
    comparisonSummary: null,
    recommendedSide: null,
    recommendedReasons: null,
    cautionPoints: null,
    businessFitSummary: null,
    dominantTimeSlots: null,
    dominantAgeGroups: null,
    comparisonHighlights: null,
    highlights: null,
    ...emptyGroups,
    ...overrides,
  }) as CommercialComparisonBody

/** 새 응답(BE #381) 모양의 지표. 필요한 것만 덮어쓴다. */
const metric = (
  overrides: Partial<ComparisonMetric> = {},
): ComparisonMetric => ({
  label: '총 매출액',
  leftValue: 43267840,
  rightValue: 293433501,
  diffValue: -250165661,
  diffRate: -85.25463525720602,
  unit: '원',
  displayPrecision: 0,
  differenceUnit: '원',
  description: '선택 분기의 요일별 매출액을 합산한 값입니다.',
  winnerSide: null,
  ...overrides,
})

/** 구버전 응답 — 새 필드가 아예 없다. */
const legacyMetric = (
  overrides: Partial<ComparisonMetric> = {},
): ComparisonMetric => ({
  label: '월 매출',
  leftValue: 1000,
  rightValue: 600,
  diffValue: 400,
  diffRate: 66.7,
  winnerSide: null,
  ...overrides,
})

const firstRow = (overrides: Partial<CommercialComparisonBody>) =>
  toComparisonGroups(body(overrides))[0].rows[0]

describe('toComparisonGroups — 값 단위', () => {
  it.each([
    ['원', 0, 293433501, '293,433,501원'],
    ['명', 0, 4410, '4,410명'],
    ['건', 0, 7, '7건'],
    ['개', 0, 12, '12개'],
    ['%', 1, 53.8, '53.8%'],
    // precision 을 **고정**한다 — 53 이 53.0% 로 보여야 옆 칸 53.8% 와 자릿수가 맞는다.
    ['%', 1, 53, '53.0%'],
  ])('%s·자릿수 %i 이면 %d → %s', (unit, precision, value, expected) => {
    const row = firstRow({
      salesMetrics: [
        metric({
          unit,
          displayPrecision: precision,
          leftValue: value,
          rightValue: value,
          diffValue: 0,
          diffRate: 0,
        }),
      ],
    })

    expect(row.left).toBe(expected)
    expect(row.right).toBe(expected)
  })

  /* 금액을 억/만원으로 줄이지 않는다 — 절사된 두 값이 같아 보이면 차이 열과 모순된다. */
  it('금액은 원 단위 전체 값으로 적는다', () => {
    const row = firstRow({ salesMetrics: [metric()] })

    expect(row.right).toBe('293,433,501원')
    expect(row.right).not.toContain('억')
  })

  it('값이 null 이면 빈 칸 기호다', () => {
    const row = firstRow({
      salesMetrics: [
        metric({ leftValue: null, rightValue: Number.NaN, diffValue: null }),
      ],
    })

    expect(row.left).toBe(COMPARISON_EMPTY_CELL)
    expect(row.right).toBe(COMPARISON_EMPTY_CELL)
    expect(row.diff).toBe(COMPARISON_EMPTY_CELL)
  })

  /* 원천 누락이 0 으로 올 수 있지만 화면은 그걸 가를 수 없다 — 받은 0 을 그대로 적는다. */
  it('0 은 단위를 붙여 그대로 적는다', () => {
    const row = firstRow({
      spendingMetrics: [
        metric({
          label: '총 지출액',
          leftValue: 0,
          rightValue: 0,
          diffValue: 0,
          diffRate: 0,
        }),
      ],
    })

    expect(row.left).toBe('0원')
    expect(row.diff).toBe('0원')
  })
})

describe('toComparisonGroups — 차이', () => {
  it('비율 지표 차이는 %p 로 적는다', () => {
    const row = firstRow({
      footTrafficMetrics: [
        metric({
          label: '여성 유동인구 비중',
          leftValue: 53.8,
          rightValue: 52.9,
          diffValue: 0.9,
          diffRate: 1.701323,
          unit: '%',
          displayPrecision: 1,
          differenceUnit: '%p',
        }),
      ],
    })

    expect(row.diff).toBe('+0.9%p')
    expect(row.diffRate).toBe('차이율 +1.7%')
  })

  it('음수 차이는 - 부호와 차이 단위를 붙인다', () => {
    const row = firstRow({ salesMetrics: [metric()] })

    expect(row.diff).toBe('-250,165,661원')
  })

  /*
   * 53.84 / 52.96 은 53.8% / 53.0% 로 보이지만 원시 차이는 0.88 → +0.9%p 다.
   * 화면이 표시값끼리 다시 빼면 +0.8%p 가 되어 백엔드 계산과 어긋난다.
   */
  it('반올림한 좌·우 값을 다시 빼지 않고 원시 diffValue 를 쓴다', () => {
    const row = firstRow({
      footTrafficMetrics: [
        metric({
          leftValue: 53.84,
          rightValue: 52.96,
          diffValue: 0.88,
          diffRate: 1.66,
          unit: '%',
          displayPrecision: 1,
          differenceUnit: '%p',
        }),
      ],
    })

    expect(row.left).toBe('53.8%')
    expect(row.right).toBe('53.0%')
    expect(row.diff).toBe('+0.9%p')
  })

  it('반올림하면 0 인 차이에 부호를 붙이지 않는다', () => {
    const row = firstRow({
      footTrafficMetrics: [
        metric({
          leftValue: 52.94,
          rightValue: 52.98,
          diffValue: -0.04,
          diffRate: -0.08,
          unit: '%',
          displayPrecision: 1,
          differenceUnit: '%p',
        }),
      ],
    })

    expect(row.diff).toBe('0.0%p')
  })

  /*
   * 반올림은 부호와 무관하게 대칭이어야 한다. `Math.round` 는 .5 를 +∞ 쪽으로 올려
   * -0.05 → 0.0%p, +0.05 → +0.1%p 처럼 같은 크기의 차이를 다르게 적는다.
   */
  it.each([
    [-0.05, 1, '%p', '-0.1%p'],
    [0.05, 1, '%p', '+0.1%p'],
    [-2.5, 0, '명', '-3명'],
    [2.5, 0, '명', '+3명'],
  ])(
    '차이 %d(자릿수 %i, 단위 %s)는 부호와 무관하게 대칭으로 반올림한다 → %s',
    (diffValue, precision, differenceUnit, expected) => {
      const row = firstRow({
        footTrafficMetrics: [
          metric({
            leftValue: 10,
            rightValue: 10 - diffValue,
            diffValue,
            diffRate: 1,
            unit: differenceUnit === '%p' ? '%' : differenceUnit,
            displayPrecision: precision,
            differenceUnit,
          }),
        ],
      })

      expect(row.diff).toBe(expected)
    },
  )

  it.each([
    [-2.25, '차이율 -2.3%'],
    [2.25, '차이율 +2.3%'],
    [-0.04, '차이율 0.0%'],
  ])('차이율 %d 도 대칭으로 반올림한다 → %s', (diffRate, expected) => {
    const row = firstRow({ salesMetrics: [metric({ diffRate })] })

    expect(row.diffRate).toBe(expected)
  })

  /* differenceUnit 없이 unit 을 빌리면 비율 지표 차이를 % 로 잘못 읽힌다. */
  it('differenceUnit 이 없으면 unit 을 빌리지 않고 기존 차이 표시로 물러난다', () => {
    const row = firstRow({
      footTrafficMetrics: [
        metric({
          leftValue: 53.8,
          rightValue: 52.9,
          diffValue: 0.9,
          unit: '%',
          displayPrecision: 1,
          differenceUnit: undefined,
        }),
      ],
    })

    expect(row.diff).toBe('+0.9')
  })
})

describe('toComparisonGroups — 차이율', () => {
  /* rightValue=0 일 때 백엔드 diffRate=0 은 계산 불가 대체값이다. 0% 로 적으면 거짓이다. */
  it('우측 값이 0 이면 차이율을 비교 불가로 적는다', () => {
    const row = firstRow({
      storeMetrics: [
        metric({
          label: '프랜차이즈 점포 수',
          leftValue: 3,
          rightValue: 0,
          diffValue: 3,
          diffRate: 0,
          unit: '개',
          differenceUnit: '개',
        }),
      ],
    })

    expect(row.diff).toBe('+3개')
    expect(row.diffRate).toBe('차이율 비교 불가')
  })

  it('좌·우 모두 0 이어도 0% 가 아니라 비교 불가다', () => {
    const row = firstRow({
      spendingMetrics: [
        metric({ leftValue: 0, rightValue: 0, diffValue: 0, diffRate: 0 }),
      ],
    })

    expect(row.diffRate).toBe('차이율 비교 불가')
  })

  it('diffRate 는 이미 % 값이라 100 을 곱하지 않는다', () => {
    const row = firstRow({ salesMetrics: [metric()] })

    expect(row.diffRate).toBe('차이율 -85.3%')
  })

  it('diffRate 가 유한수가 아니면 그리지 않는다', () => {
    const row = firstRow({ salesMetrics: [metric({ diffRate: null })] })

    expect(row.diffRate).toBeNull()
  })
})

describe('toComparisonGroups — 구버전 응답 폴백', () => {
  it('새 필드가 없으면 기존 표시 그대로다', () => {
    const row = firstRow({ salesMetrics: [legacyMetric()] })

    expect(row.left).toBe('1,000')
    expect(row.right).toBe('600')
    expect(row.diff).toBe('+400')
    // 기존 화면에 없던 차이율·설명은 새로 지어내지 않는다.
    expect(row.diffRate).toBeNull()
    expect(row.description).toBeNull()
  })

  it('구버전 0 차이는 기존처럼 0 이다', () => {
    const row = firstRow({
      storeMetrics: [
        legacyMetric({ leftValue: 12, rightValue: 12, diffValue: 0 }),
      ],
    })

    expect(row.diff).toBe('0')
  })

  /* 한글 label 에서 단위를 추측하지 않는다. '매출액' 이라도 unit 이 없으면 원을 붙이지 않는다. */
  it('라벨에서 단위를 추측하지 않는다', () => {
    const row = firstRow({
      salesMetrics: [legacyMetric({ label: '총 매출액' })],
    })

    expect(row.left).not.toContain('원')
  })

  it('displayPrecision 이 이상하면 기존 소수 자릿수로 물러난다', () => {
    const row = firstRow({
      salesMetrics: [
        metric({
          unit: '명',
          differenceUnit: '명',
          displayPrecision: -3,
          leftValue: 10.25,
          rightValue: 10,
          diffValue: 0.25,
        }),
      ],
    })

    expect(row.left).toBe('10.3명')
  })
})

describe('toComparisonGroups — 설명과 묶음', () => {
  it('지표 설명을 행에 싣는다', () => {
    const row = firstRow({ salesMetrics: [metric()] })

    expect(row.description).toBe('선택 분기의 요일별 매출액을 합산한 값입니다.')
  })

  it('comparisonGuide.metricGroups 의 설명을 같은 code 묶음에 붙인다', () => {
    const [group] = toComparisonGroups(
      body({
        comparisonGuide: {
          periodBasis: null,
          serviceBasis: null,
          differenceBasis: null,
          diffRateBasis: null,
          recommendationDisclaimer: null,
          metricGroups: [
            {
              code: 'salesMetrics',
              name: '매출',
              description: '선택 업종의 매출액과 매출 건수를 비교합니다.',
            },
            { code: 'unknownMetrics', name: '?', description: '버린다' },
          ],
        },
        salesMetrics: [metric()],
      }),
    )

    expect(group.label).toBe('매출')
    expect(group.description).toBe(
      '선택 업종의 매출액과 매출 건수를 비교합니다.',
    )
  })

  it('가이드가 없으면 묶음 설명은 null 이다', () => {
    const [group] = toComparisonGroups(body({ salesMetrics: [metric()] }))

    expect(group.description).toBeNull()
  })

  /*
   * 백엔드 상세 묶음은 행마다 같은 설명을 준다(예: 시간대 6행 모두 같은 문장). 행마다
   * 도움말 버튼을 두면 같은 문장에 Tab 정지가 최대 48개 생긴다 — 묶음에 한 번만 싣는다.
   */
  it('묶음의 모든 행 설명이 같으면 묶음에 한 번만 싣고 행에서는 뺀다', () => {
    const shared = '선택 분기 선택 업종의 시간대별 매출액입니다.'
    const [group] = toComparisonGroups(
      body({
        salesTimeSlotMetrics: [
          metric({ label: '00-06', description: shared }),
          metric({ label: '06-11', description: shared }),
        ],
      }),
    )

    expect(group.sharedRowDescription).toBe(shared)
    expect(group.rows.map(row => row.description)).toEqual([null, null])
  })

  it('행 설명이 서로 다르면 행마다 둔다', () => {
    const [group] = toComparisonGroups(
      body({
        salesMetrics: [
          metric({ label: '총 매출액', description: '매출액 합' }),
          metric({ label: '매출 건수', description: '건수 합' }),
        ],
      }),
    )

    expect(group.sharedRowDescription).toBeNull()
    expect(group.rows.map(row => row.description)).toEqual([
      '매출액 합',
      '건수 합',
    ])
  })

  /* 한 행짜리 묶음은 「같다」가 자명하다. 다른 핵심 행처럼 도움말 버튼으로 둔다. */
  it('행이 하나뿐이면 묶음 공통 설명으로 올리지 않는다', () => {
    const [group] = toComparisonGroups(
      body({ spendingMetrics: [metric({ label: '총 지출액' })] }),
    )

    expect(group.sharedRowDescription).toBeNull()
    expect(group.rows[0].description).toBe(
      '선택 분기의 요일별 매출액을 합산한 값입니다.',
    )
  })

  it('일부 행만 설명이 있으면 공통 설명이 아니다', () => {
    const [group] = toComparisonGroups(
      body({
        salesMetrics: [
          metric({ label: 'a', description: '같다' }),
          metric({ label: 'b', description: null }),
        ],
      }),
    )

    expect(group.sharedRowDescription).toBeNull()
    expect(group.rows[0].description).toBe('같다')
  })

  it('시간대·연령·성별 분포 묶음만 상세로 표시한다', () => {
    const groups = toComparisonGroups(
      body({
        salesMetrics: [metric()],
        facilityMetrics: [metric()],
        salesTimeSlotMetrics: [metric({ label: '00-06' })],
        salesAgeMetrics: [metric()],
        salesAgeGenderMetrics: [metric()],
        footTrafficTimeSlotMetrics: [metric()],
        footTrafficAgeMetrics: [metric()],
        footTrafficAgeGenderMetrics: [metric()],
      }),
    )

    expect(
      Object.fromEntries(groups.map(group => [group.key, group.isDetail])),
    ).toEqual({
      salesMetrics: false,
      facilityMetrics: false,
      salesTimeSlotMetrics: true,
      salesAgeMetrics: true,
      salesAgeGenderMetrics: true,
      footTrafficTimeSlotMetrics: true,
      footTrafficAgeMetrics: true,
      footTrafficAgeGenderMetrics: true,
    })
  })
})

describe('toComparisonBases', () => {
  it('기준 문구 넷을 받은 그대로 정해진 순서로 돌려준다', () => {
    expect(
      toComparisonBases(
        body({
          comparisonGuide: {
            periodBasis: '모든 지표는 선택한 분기의 데이터를 기준으로 합니다.',
            serviceBasis: '매출·점포 지표는 선택 업종 기준입니다.',
            differenceBasis:
              '차이는 왼쪽 상권 값에서 오른쪽 상권 값을 뺀 값입니다.',
            diffRateBasis: '차이율은 오른쪽 상권 값을 기준으로 계산합니다.',
            recommendationDisclaimer: '표에는 싣지 않는다',
            metricGroups: [],
          },
        }),
      ),
    ).toEqual([
      '모든 지표는 선택한 분기의 데이터를 기준으로 합니다.',
      '매출·점포 지표는 선택 업종 기준입니다.',
      '차이는 왼쪽 상권 값에서 오른쪽 상권 값을 뺀 값입니다.',
      '차이율은 오른쪽 상권 값을 기준으로 계산합니다.',
    ])
  })

  it('빈 문구는 건너뛰고, 가이드가 없으면 빈 목록이다', () => {
    expect(
      toComparisonBases(
        body({
          comparisonGuide: {
            periodBasis: ' ',
            serviceBasis: null,
            differenceBasis: '차이는 좌 − 우',
            diffRateBasis: undefined as unknown as null,
            recommendationDisclaimer: null,
            metricGroups: null,
          },
        }),
      ),
    ).toEqual(['차이는 좌 − 우'])
    expect(toComparisonBases(body())).toEqual([])
    expect(toComparisonBases(null)).toEqual([])
  })
})

describe('toComparisonVerdict — 면책 문구', () => {
  const guide = {
    periodBasis: null,
    serviceBasis: null,
    differenceBasis: null,
    diffRateBasis: null,
    recommendationDisclaimer:
      '추천은 핵심 지표의 단순 우위 개수를 비교한 참고 결과입니다.',
    metricGroups: [],
  }

  it('recommendationDisclaimer 를 리포트에 싣는다', () => {
    const verdict = toComparisonVerdict(
      body({ comparisonGuide: guide, recommendedReasons: ['이유'] }),
    )

    expect(verdict?.disclaimer).toBe(
      '추천은 핵심 지표의 단순 우위 개수를 비교한 참고 결과입니다.',
    )
  })

  /* 면책할 추천이 없는데 리포트를 세우면 빈 판단 영역이 된다. */
  it('면책 문구만 있으면 리포트를 세우지 않는다', () => {
    expect(toComparisonVerdict(body({ comparisonGuide: guide }))).toBeNull()
  })

  it('가이드가 없으면 면책 문구는 null 이다', () => {
    expect(
      toComparisonVerdict(body({ recommendedReasons: ['이유'] }))?.disclaimer,
    ).toBeNull()
  })
})
