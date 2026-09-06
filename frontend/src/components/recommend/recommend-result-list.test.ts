import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { BlueOceanCategory, CandidateCommercial } from '@/types/recommend'
import RecommendResultList, {
  BLUE_OCEAN_HEADING,
  BLUE_OCEAN_NOTE,
  describeBookmarkAction,
  SCORE_UNAVAILABLE_LABEL,
  formatBlueOceanCounts,
  formatScore,
  getBlueOceanAxisMax,
  getBlueOceanRange,
  type RecommendResultListProps,
} from './recommend-result-list'
// 읽는 규칙은 `/recommend` 와 `/recommend/compare` 가 공유하는 lib 로 옮겼다.
import { readBlueOceanCategories } from '@/lib/recommend/recommend-response'

const SELECTED_SERVICE_CODE = 'CS100001'

const blueOceanCategory = (
  overrides: Partial<BlueOceanCategory> = {},
): BlueOceanCategory => ({
  serviceCode: 'CS100005',
  serviceName: '여관',
  commercialStoreCount: 0,
  administrationStoreCount: 29,
  storeRate: 3.33,
  ...overrides,
})

const candidate = (
  overrides: Partial<CandidateCommercial> = {},
): CandidateCommercial => ({
  rank: 1,
  commercialCode: '3110008',
  commercialName: '길동주민센터(강동도서관)',
  compositeScore: 77.8,
  grade: 'HIGH',
  summaryLabel: '공격형 추천',
  selectionReason: '매출 성장과 유동인구가 우세해요',
  opportunityLabel: '기회도 높음',
  riskLabel: '위험도 낮음',
  metricBreakdown: [],
  reasonTags: [],
  ...overrides,
})

const renderList = (
  overrides: Partial<RecommendResultListProps> = {},
): string => {
  const item = overrides.results?.[0] ?? candidate()

  return renderToStaticMarkup(
    createElement(RecommendResultList, {
      results: [item],
      selectedCommercialCode: item.commercialCode,
      selectedServiceCode: SELECTED_SERVICE_CODE,
      isLoading: false,
      feedback: null,
      onSelect: vi.fn(),
      onRetry: vi.fn(),
      ...overrides,
    }),
  )
}

/**
 * DESIGN.md §Skeleton·§Loading: 「금액·지표는 `--`(skeleton 금지 — 가짜 값처럼 보임)」.
 * 점수 칸에 회색 블록을 두면 값이 이미 있는데 가려진 것처럼 읽힌다.
 */
describe('추천 목록 로딩 규격', () => {
  it('로딩 중 점수 칸은 skeleton 이 아니라 `--` 다', () => {
    const markup = renderList({ isLoading: true, results: [] })

    expect(markup).toContain('--')
    // 순위·이름 칸의 블록 skeleton 은 그대로 유지된다(지표가 아니다).
    expect(markup).toContain('data-result-skeleton="true"')
  })

  it('로딩 중에는 점수 숫자를 만들어내지 않는다', () => {
    const markup = renderList({ isLoading: true, results: [] })

    expect(markup).not.toContain('77')
  })
})

describe('blue ocean categories', () => {
  it('renders the emptiness ratio and the direction note for the selected card', () => {
    const markup = renderList({
      results: [
        candidate({
          blueOceanCategories: [
            blueOceanCategory(),
            blueOceanCategory({
              serviceCode: 'CS100010',
              serviceName: '외국어학원',
              commercialStoreCount: 1,
              administrationStoreCount: 19,
              storeRate: 5.26,
            }),
          ],
        }),
      ],
    })

    expect(markup).toContain(BLUE_OCEAN_HEADING)
    expect(markup).toContain(BLUE_OCEAN_NOTE)
    expect(markup).toContain('여관')
    expect(markup).toContain('상권 0곳 / 행정동 29곳 (3.33%)')
    expect(markup).toContain('외국어학원')
    expect(markup).toContain('상권 1곳 / 행정동 19곳 (5.26%)')
  })

  it('keeps the selected service in the list and marks it with a badge', () => {
    const markup = renderList({
      results: [
        candidate({
          blueOceanCategories: [
            blueOceanCategory({
              serviceCode: SELECTED_SERVICE_CODE,
              serviceName: '한식음식점',
              commercialStoreCount: 3,
              administrationStoreCount: 325,
              storeRate: 0.92,
            }),
          ],
        }),
      ],
    })

    expect(markup).toContain('한식음식점')
    expect(markup).toContain('상권 3곳 / 행정동 325곳 (0.92%)')
    expect(markup).toContain('data-selected-service="true"')
    expect(markup).toContain('선택 업종')
  })

  it.each([
    { name: 'null', blueOceanCategories: null },
    { name: 'an empty array', blueOceanCategories: [] },
    { name: 'malformed entries only', blueOceanCategories: [null, 3, {}] },
  ])('renders no section when the list is $name', ({ blueOceanCategories }) => {
    const markup = renderList({
      results: [
        candidate({
          blueOceanCategories:
            blueOceanCategories as CandidateCommercial['blueOceanCategories'],
        }),
      ],
    })

    expect(markup).not.toContain('data-blue-ocean="true"')
    expect(markup).not.toContain(BLUE_OCEAN_HEADING)
  })

  it('hides the section for an unselected card and shows it once selected', () => {
    const item = candidate({
      blueOceanCategories: [blueOceanCategory()],
    })

    expect(
      renderList({ results: [item], selectedCommercialCode: null }),
    ).not.toContain('data-blue-ocean="true"')
    expect(renderList({ results: [item] })).toContain('data-blue-ocean="true"')
  })

  it('drops malformed entries and omits the ratio when it is not a number', () => {
    expect(
      readBlueOceanCategories([
        null,
        { serviceName: '   ' },
        {
          serviceCode: 'CS100005',
          serviceName: '조명용품',
          commercialStoreCount: 1,
          administrationStoreCount: 20,
          storeRate: 'nope',
        },
      ]),
    ).toEqual([
      {
        serviceCode: 'CS100005',
        serviceName: '조명용품',
        commercialStoreCount: 1,
        administrationStoreCount: 20,
        storeRate: Number.NaN,
      },
    ])
    expect(readBlueOceanCategories(null)).toEqual([])
    expect(
      formatBlueOceanCounts(blueOceanCategory({ storeRate: Number.NaN })),
    ).toBe('상권 0곳 / 행정동 29곳')
    expect(formatBlueOceanCounts(blueOceanCategory({ storeRate: 5 }))).toBe(
      '상권 0곳 / 행정동 29곳 (5%)',
    )
  })
})

describe('unavailable composite scores', () => {
  it('reads a null score as missing data rather than a pending aggregate', () => {
    expect(formatScore(null)).toBe(SCORE_UNAVAILABLE_LABEL)
    expect(formatScore(77.8)).toBe(78)

    const markup = renderList({
      results: [candidate({ compositeScore: null, grade: null })],
    })

    expect(markup).toContain(SCORE_UNAVAILABLE_LABEL)
    expect(markup).toContain('data-score-unavailable="true"')
    expect(markup).toContain('지표 데이터가 없어 점수를 계산하지 못했어요.')
    expect(markup).not.toContain('집계 중')
  })

  it('keeps the numeric score slot for scored cards', () => {
    const markup = renderList()

    expect(markup).toContain('>78</span>')
    expect(markup).not.toContain('data-score-unavailable="true"')
  })
})

describe('retry affordance', () => {
  it('hides the retry button for a non-retryable failure and keeps the server message', () => {
    const markup = renderList({
      results: [],
      feedback: {
        tone: 'error',
        title: '추천 상권을 불러오지 못했어요',
        description: '요청한 상권 데이터가 없습니다.',
        isRetryable: false,
      },
    })

    expect(markup).toContain('요청한 상권 데이터가 없습니다.')
    expect(markup).not.toContain('<button')
    expect(markup).not.toContain('다시 시도')
  })

  it('shows the retry button only when the failure is retryable', () => {
    const markup = renderList({
      results: [],
      feedback: {
        tone: 'error',
        title: '추천 상권을 불러오지 못했어요',
        description: '일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
        isRetryable: true,
      },
    })

    expect(markup).toMatch(/<button[^>]*>다시 시도<\/button>/)
  })
})

// T-D7 — 비율(storeRate)로 막대를 그렸더니 다섯 개가 서로 구별되지 않았다.
// 「비어 있는 업종」이 정의상 비율 하위 5개라 늘 좁은 띠에 몰린다. 점포 수를 그린다.
describe('빈 자리 덤벨', () => {
  // 실제 관측 데이터: 섬유제품 3/42 · 의류임대 1/9 · 완구 2/16 · 네일숍 7/55 · 예술학원 9/65
  const observed = [
    blueOceanCategory({
      serviceName: '섬유제품',
      commercialStoreCount: 3,
      administrationStoreCount: 42,
      storeRate: 7.14,
    }),
    blueOceanCategory({
      serviceName: '의류임대',
      commercialStoreCount: 1,
      administrationStoreCount: 9,
      storeRate: 11.11,
    }),
    blueOceanCategory({
      serviceName: '예술학원',
      commercialStoreCount: 9,
      administrationStoreCount: 65,
      storeRate: 13.85,
    }),
  ]

  it('다섯 업종이 눈금을 공유한다', () => {
    expect(getBlueOceanAxisMax(observed)).toBe(65)
    expect(getBlueOceanAxisMax([])).toBe(0)
  })

  it('두 점은 비율이 아니라 점포 수 자리에 찍힌다', () => {
    expect(getBlueOceanRange(observed[0], 65)).toEqual({
      start: (3 / 65) * 100,
      end: (42 / 65) * 100,
    })
  })

  /**
   * 비율 막대가 감추던 것: 의류임대(11.11%)는 섬유제품(7.14%)보다 비율이 높아
   * 「빈 자리」 막대가 더 짧았는데, 정작 행정동에도 9곳뿐이라 기회의 크기 자체가 작다.
   * 점포 수로 그리면 선 길이가 그 사실을 말한다.
   */
  it('행정동 규모가 작은 업종은 선도 짧다', () => {
    const 섬유제품 = getBlueOceanRange(observed[0], 65)!
    const 의류임대 = getBlueOceanRange(observed[1], 65)!

    expect(의류임대.end - 의류임대.start).toBeLessThan(
      섬유제품.end - 섬유제품.start,
    )
  })

  it('다섯 항목의 선 길이가 실제로 벌어진다', () => {
    const spans = observed.map(category => {
      const range = getBlueOceanRange(category, 65)!
      return range.end - range.start
    })

    // 비율 막대는 86~93% 안에 몰려 폭 차이가 7%p 뿐이었다.
    expect(Math.max(...spans) - Math.min(...spans)).toBeGreaterThan(60)
  })

  it('눈금이 없거나 데이터가 뒤집히면 그리지 않는다', () => {
    expect(getBlueOceanRange(observed[0], 0)).toBeNull()
    expect(getBlueOceanRange(observed[0], Number.NaN)).toBeNull()
    expect(
      getBlueOceanRange(
        blueOceanCategory({
          commercialStoreCount: 9,
          administrationStoreCount: 2,
        }),
        65,
      ),
    ).toBeNull()
  })

  it('카드에 덤벨과 범례가 실제로 들어간다', () => {
    const markup = renderList({
      results: [candidate({ blueOceanCategories: observed })],
    })

    expect(markup).toContain('data-dumbbell="3-42"')
    expect(markup).toContain('data-dumbbell="9-65"')
    expect(markup).toContain('이 상권')
    expect(markup).toContain('행정동 전체')
    // 숫자는 원본 비율까지 그대로 남긴다 — 그림은 비교를, 숫자는 사실을 말한다.
    expect(markup).toContain('(7.14%)')
  })

  it('점포 수가 모두 0 이면 숫자만 남기고 덤벨을 뺀다', () => {
    const markup = renderList({
      results: [
        candidate({
          blueOceanCategories: [
            blueOceanCategory({
              serviceName: '한식음식점',
              commercialStoreCount: 0,
              administrationStoreCount: 0,
            }),
          ],
        }),
      ],
    })

    expect(markup).toContain('한식음식점')
    expect(markup).not.toContain('data-dumbbell=')
  })
})

// T-D8 — 카탈로그 밖의 코드가 실제로 온다. 아이콘 없이 덜렁 남는 항목을 만들지 않는다.
describe('업종 아이콘', () => {
  it('매핑 없는 코드에도 아이콘이 붙는다', () => {
    const markup = renderList({
      results: [
        candidate({
          blueOceanCategories: [
            blueOceanCategory({
              serviceCode: 'CS200013',
              serviceName: '기타법무서비스',
            }),
          ],
        }),
      ],
    })

    expect(markup).toContain('기타법무서비스')
    expect(markup).toContain('<svg')
  })
})

describe('점수 게이지', () => {
  it('총점을 도넛으로 그리고 숫자도 함께 남긴다', () => {
    const markup = renderList({ results: [candidate({ compositeScore: 84 })] })

    expect(markup).toContain('aria-label="종합 점수 84점, 좋음"')
    expect(markup).toContain('>84<')
  })

  // 위험도 100 을 초록으로 칠하면 화면이 정반대로 말한다.
  it('위험도가 높으면 나쁨 색이다', () => {
    const markup = renderList({
      results: [
        candidate({
          metricBreakdown: [
            {
              metricType: {
                code: 'RISK_SCORE',
                name: '위험도',
                description: '',
                scoreDescription: '점수가 높을수록 위험 요인이 큽니다',
              },
              score: 100,
              grade: null,
              summaryLabel: null,
            },
          ],
        }),
      ],
    })

    expect(markup).toContain('data-score-quality="poor"')
    expect(markup).toContain('var(--score-low)')
  })

  it('점수가 없는 상권에는 게이지를 그리지 않는다', () => {
    const markup = renderList({
      results: [candidate({ compositeScore: null })],
    })

    expect(markup).toContain(SCORE_UNAVAILABLE_LABEL)
    expect(markup).not.toContain('data-score-gauge="true"')
  })
})

/**
 * 카드 본문 클릭(지도 포커스)과는 다른 행동이라 별도 체크박스로 뒀다
 * (recommend-panel.tsx 의 비교하기 고정 바가 이 선택을 읽는다).
 */
describe('비교 담기 체크박스', () => {
  const findCheckbox = (markup: string, name: string): string =>
    markup.match(new RegExp(`<input[^>]*aria-label="${name}"[^>]*>`))?.[0] ?? ''

  it('compareSelection 에 있는 코드는 체크 상태다', () => {
    const markup = renderList({
      results: [candidate({ commercialCode: '3110008' })],
      compareSelection: ['3110008'],
      onCompareToggle: vi.fn(),
    })

    const checkbox = findCheckbox(
      markup,
      '길동주민센터\\(강동도서관\\) 비교 담기',
    )

    expect(checkbox).toContain('checked=""')
  })

  it('compareSelection 에 없는 코드는 체크 해제 상태다', () => {
    const markup = renderList({
      results: [candidate({ commercialCode: '3110008' })],
      compareSelection: [],
      onCompareToggle: vi.fn(),
    })

    const checkbox = findCheckbox(
      markup,
      '길동주민센터\\(강동도서관\\) 비교 담기',
    )

    expect(checkbox).not.toContain('checked=""')
  })

  it('카드마다 상권 이름으로 구분되는 접근성 이름을 갖는다', () => {
    const markup = renderList({
      results: [
        candidate({ commercialCode: '3110008', commercialName: '강남역 상권' }),
      ],
      compareSelection: [],
      onCompareToggle: vi.fn(),
    })

    expect(markup).toContain('aria-label="강남역 상권 비교 담기"')
  })

  it('4개를 채우면 안 고른 카드의 체크박스만 잠기고, 이미 고른 카드는 그대로 활성 상태다', () => {
    const results = [
      candidate({ commercialCode: '1', commercialName: '상권 1', rank: 1 }),
      candidate({ commercialCode: '2', commercialName: '상권 2', rank: 2 }),
      candidate({ commercialCode: '3', commercialName: '상권 3', rank: 3 }),
      candidate({ commercialCode: '4', commercialName: '상권 4', rank: 4 }),
      candidate({ commercialCode: '5', commercialName: '상권 5', rank: 5 }),
    ]

    const markup = renderToStaticMarkup(
      createElement(RecommendResultList, {
        results,
        selectedCommercialCode: null,
        isLoading: false,
        feedback: null,
        compareSelection: ['1', '2', '3', '4'],
        isCompareFull: true,
        onCompareToggle: vi.fn(),
        onSelect: vi.fn(),
        onRetry: vi.fn(),
      }),
    )

    const fifthCheckbox = findCheckbox(markup, '상권 5 비교 담기')
    const firstCheckbox = findCheckbox(markup, '상권 1 비교 담기')

    expect(fifthCheckbox).toContain('disabled=""')
    expect(firstCheckbox).not.toContain('disabled=""')
  })
})

/*
 * 아이콘만 있는 버튼이라 이 라벨이 유일한 설명이다. 비로그인 사용자는 안내 없이
 * `/login` 으로 튕겼다(과업 흐름 감사 J3-1) — 시뮬레이션 리포트의 「저장하려면 로그인」
 * 규약에 맞춰 **누르기 전에** 무슨 일이 날지 말한다.
 */
describe('describeBookmarkAction', () => {
  it('로그인 상태에서는 저장·삭제를 말한다', () => {
    expect(
      describeBookmarkAction('역삼역', {
        saved: false,
        pending: false,
        loginRequired: false,
      }),
    ).toBe('역삼역 북마크 추가')
    expect(
      describeBookmarkAction('역삼역', {
        saved: true,
        pending: false,
        loginRequired: false,
      }),
    ).toBe('역삼역 북마크 삭제')
  })

  it('비로그인이면 저장이 아니라 로그인으로 간다고 미리 말한다', () => {
    expect(
      describeBookmarkAction('역삼역', {
        saved: false,
        pending: false,
        loginRequired: true,
      }),
    ).toBe('역삼역 북마크하려면 로그인')
  })

  /* 로그인하지 않았는데 처리 중일 수는 없다 — 처리 중이 먼저다. */
  it('처리 중이면 그 사실을 먼저 말한다', () => {
    expect(
      describeBookmarkAction('역삼역', {
        saved: false,
        pending: true,
        loginRequired: true,
      }),
    ).toBe('역삼역 북마크 처리 중')
  })
})
