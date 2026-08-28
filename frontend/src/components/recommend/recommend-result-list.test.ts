import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { BlueOceanCategory, CandidateCommercial } from '@/types/recommend'
import RecommendResultList, {
  BLUE_OCEAN_HEADING,
  BLUE_OCEAN_NOTE,
  SCORE_UNAVAILABLE_LABEL,
  formatBlueOceanCounts,
  formatScore,
  readBlueOceanCategories,
  type RecommendResultListProps,
} from './recommend-result-list'

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
