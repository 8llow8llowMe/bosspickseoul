import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'
import type { ApiErrorKind, NormalizedApiError } from '@/lib/api/api-error'
import type { CandidateCommercial } from '@/types/recommend'
import type {
  RecommendationCriteria,
  SubmittedRecommendation,
} from '@/lib/recommend/recommend-state'
import * as recommendConditionFormModule from './recommend-condition-form'
import RecommendFeedback from './recommend-feedback'
import RecommendPanel, * as recommendPanelModule from './recommend-panel'
import RecommendResultList, * as recommendResultListModule from './recommend-result-list'

const apiError = (kind: ApiErrorKind, message: string): NormalizedApiError => ({
  kind,
  status: kind === 'not-found' ? 404 : kind === 'server' ? 500 : null,
  code: null,
  message,
  fieldErrors: [],
})

const readyDraft: RecommendationCriteria = {
  district: { code: '11680', name: '강남구' },
  administration: { code: '11680101', name: '역삼1동' },
  service: { code: 'CS100010', name: '커피-음료' },
}

const submitted: SubmittedRecommendation = {
  district: { code: '11680', name: '강남구' },
  administration: { code: '11680101', name: '역삼1동' },
  service: { code: 'CS100010', name: '커피-음료' },
  commercialCodes: ['3110008'],
  commercialCodesKey: '3110008',
  requestKey: 'recommendation-request',
}

const result: CandidateCommercial = {
  rank: 1,
  commercialCode: '3110008',
  commercialName: '강남역 상권',
  compositeScore: 84.2,
  grade: 'HIGH',
  summaryLabel: '공격형 추천',
  selectionReason: '매출 성장과 유동인구가 우세해요',
  opportunityLabel: '기회도 높음',
  riskLabel: '위험도 낮음',
  metricBreakdown: [
    {
      metricType: {
        code: 'SALES',
        name: '매출',
        description: '매출 설명',
        scoreDescription: '매출 점수 설명',
      },
      score: null,
      grade: null,
      summaryLabel: '매출 경쟁력',
    },
  ],
  reasonTags: ['유동인구 우세', '', '유동인구 우세', '매출 성장'],
}

const baseProps = {
  draft: readyDraft,
  submitted,
  administrations: [
    {
      administrationCode: '11680101',
      administrationName: '역삼1동',
      centerLat: 37.5,
      centerLng: 127,
    },
  ],
  candidatesCount: 5,
  periodLabel: '2023년 3분기 기준',
  results: [] as CandidateCommercial[],
  selectedCommercialCode: null,
  isAdministrationsLoading: false,
  isCandidatesLoading: false,
  isRecommendationLoading: false,
  feedback: null,
  onOpenStep: vi.fn(),
  onClosePicker: vi.fn(),
  onPickerSelect: vi.fn(),
  onDistrictChange: vi.fn(),
  onAdministrationChange: vi.fn(),
  onServiceChange: vi.fn(),
  onSubmit: vi.fn(),
  onEdit: vi.fn(),
  onResultSelect: vi.fn(),
  onRetry: vi.fn(),
}

const renderPanel = (props: Parameters<typeof RecommendPanel>[0]): string =>
  renderToStaticMarkup(createElement(RecommendPanel, props))

const renderStyles = (element: ReturnType<typeof createElement>): string => {
  const styleSheet = new ServerStyleSheet()

  try {
    renderToStaticMarkup(styleSheet.collectStyles(element))
    return styleSheet.getStyleTags()
  } finally {
    styleSheet.seal()
  }
}

const getSubmitMarkup = (markup: string): string => {
  const match = markup.match(/<button[^>]*data-testid="recommend-submit"[^>]*>/)

  expect(match).not.toBeNull()
  return match?.[0] ?? ''
}

describe('RecommendPanel', () => {
  it('uses the submit guard for enabled and disabled criteria', () => {
    const submitRecommendationIfEnabled = Reflect.get(
      recommendConditionFormModule,
      'submitRecommendationIfEnabled',
    ) as ((isSubmitDisabled: boolean, onSubmit: () => void) => void) | undefined
    const onSubmit = vi.fn()

    expect(submitRecommendationIfEnabled).toBeTypeOf('function')
    submitRecommendationIfEnabled?.(true, onSubmit)
    expect(onSubmit).not.toHaveBeenCalled()
    submitRecommendationIfEnabled?.(false, onSubmit)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('forwards the exact selected commercial code', () => {
    const forwardRecommendationSelection = Reflect.get(
      recommendResultListModule,
      'forwardRecommendationSelection',
    ) as
      | ((
          commercialCode: string,
          onSelect: (selectedCode: string) => void,
        ) => void)
      | undefined
    const onSelect = vi.fn()

    expect(forwardRecommendationSelection).toBeTypeOf('function')
    forwardRecommendationSelection?.('3110008', onSelect)
    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith('3110008')
  })

  it('forwards preview and only clears it when neither pointer nor focus is active', () => {
    const forwardRecommendationPreview = Reflect.get(
      recommendResultListModule,
      'forwardRecommendationPreview',
    ) as
      | ((
          commercialCode: string,
          onPreviewChange?: (selectedCode: string | null) => void,
        ) => void)
      | undefined
    const clearRecommendationPreviewIfInactive = Reflect.get(
      recommendResultListModule,
      'clearRecommendationPreviewIfInactive',
    ) as
      | ((
          isFocused: boolean,
          isHovered: boolean,
          onPreviewChange?: (selectedCode: string | null) => void,
        ) => void)
      | undefined
    const onPreviewChange = vi.fn()

    expect(forwardRecommendationPreview).toBeTypeOf('function')
    expect(clearRecommendationPreviewIfInactive).toBeTypeOf('function')

    forwardRecommendationPreview?.('3110008', onPreviewChange)
    clearRecommendationPreviewIfInactive?.(true, false, onPreviewChange)
    clearRecommendationPreviewIfInactive?.(false, true, onPreviewChange)
    clearRecommendationPreviewIfInactive?.(false, false, onPreviewChange)

    expect(onPreviewChange).toHaveBeenNthCalledWith(1, '3110008')
    expect(onPreviewChange).toHaveBeenNthCalledWith(2, null)
    expect(onPreviewChange).toHaveBeenCalledTimes(2)
  })

  it('keeps pointer preview ahead of focus and restores focus preview after pointer leave', () => {
    const createRecommendationPreviewInteraction = Reflect.get(
      recommendResultListModule,
      'createRecommendationPreviewInteraction',
    ) as
      | (() => {
          focusedCommercialCode: string | null
          hoveredCommercialCode: string | null
        })
      | undefined
    const applyRecommendationPreviewInteraction = Reflect.get(
      recommendResultListModule,
      'applyRecommendationPreviewInteraction',
    ) as
      | ((
          state: {
            focusedCommercialCode: string | null
            hoveredCommercialCode: string | null
          },
          event:
            | { type: 'focus' | 'blur'; commercialCode: string }
            | {
                type: 'pointerEnter' | 'pointerLeave'
                commercialCode: string
              },
        ) => string | null)
      | undefined

    expect(createRecommendationPreviewInteraction).toBeTypeOf('function')
    expect(applyRecommendationPreviewInteraction).toBeTypeOf('function')

    const state = createRecommendationPreviewInteraction?.()
    expect(
      state &&
        applyRecommendationPreviewInteraction?.(state, {
          type: 'focus',
          commercialCode: 'C1',
        }),
    ).toBe('C1')
    expect(
      state &&
        applyRecommendationPreviewInteraction?.(state, {
          type: 'pointerEnter',
          commercialCode: 'C2',
        }),
    ).toBe('C2')
    expect(
      state &&
        applyRecommendationPreviewInteraction?.(state, {
          type: 'pointerLeave',
          commercialCode: 'C2',
        }),
    ).toBe('C1')
    expect(
      state &&
        applyRecommendationPreviewInteraction?.(state, {
          type: 'blur',
          commercialCode: 'C1',
        }),
    ).toBeNull()
  })

  it('derives the transition key from the current view', () => {
    const getRecommendPanelTransitionKey = Reflect.get(
      recommendPanelModule,
      'getRecommendPanelTransitionKey',
    ) as ((view: 'criteria' | 'results') => 'criteria' | 'results') | undefined

    expect(getRecommendPanelTransitionKey).toBeTypeOf('function')
    expect(getRecommendPanelTransitionKey?.('criteria')).toBe('criteria')
    expect(getRecommendPanelTransitionKey?.('results')).toBe('results')
  })

  it('조건 바가 세 조각을 고른 값으로 보여주고 제출을 연다', () => {
    const markup = renderPanel({ ...baseProps, view: 'criteria' })

    // 조각은 되감기 버튼이다 — 이미 고른 값도 다시 고를 수 있어야 한다.
    expect(markup).toMatch(
      /<button[^>]*data-step="district"[^>]*>강남구<\/button>/,
    )
    expect(markup).toMatch(
      /<button[^>]*data-step="administration"[^>]*>역삼1동<\/button>/,
    )
    expect(markup).toMatch(
      /<button[^>]*data-step="service"[^>]*>커피-음료<\/button>/,
    )
    expect(getSubmitMarkup(markup)).not.toContain('disabled=""')
    expect(markup).toContain('상권 추천받기')
  })

  it('안 고른 조각은 플레이스홀더로 두고, 상위가 비면 하위를 잠근다', () => {
    const markup = renderPanel({
      ...baseProps,
      draft: { district: null, administration: null, service: null },
      view: 'criteria',
    })

    expect(markup).toContain('자치구 선택')
    expect(markup).toContain('행정동 선택')
    expect(markup).toContain('업종 선택')
    // 자치구를 안 고르면 행정동 조각을 열 수 없다.
    expect(markup).toMatch(
      /<button[^>]*data-step="administration"[^>]*disabled/,
    )
    // 업종은 지역과 독립이라 언제든 고를 수 있다.
    expect(markup).not.toMatch(/<button[^>]*data-step="service"[^>]*disabled/)
  })

  it('선택 뷰는 같은 패널의 세 번째 뷰다 — 시트를 겹치지 않는다', () => {
    const markup = renderPanel({
      ...baseProps,
      pickerStep: 'district',
      pickerItems: [
        { code: '11680', name: '강남구' },
        { code: '11110', name: '종로구' },
      ],
      view: 'picker',
    })

    expect(markup).toContain('data-panel-view="picker"')
    expect(markup).toContain('자치구 선택')
    expect(markup).toContain('강남구')
    expect(markup).toContain('종로구')
    expect(markup).toContain('조건으로 돌아가기')
  })

  it.each([
    {
      name: 'missing district',
      props: {
        draft: {
          district: null,
          administration: null,
          service: null,
        },
      },
      helper: '자치구를 먼저 선택해 주세요.',
    },
    {
      name: 'administration loading',
      props: { isAdministrationsLoading: true },
      helper: '행정동을 불러오는 중입니다.',
    },
    {
      name: 'candidate empty',
      props: { candidatesCount: 0 },
      helper: '현재 행정동에는 추천할 상권이 없어요.',
    },
  ])('disables submit for $name and explains why', ({ props, helper }) => {
    const markup = renderPanel({
      ...baseProps,
      ...props,
      view: 'criteria',
    })

    expect(getSubmitMarkup(markup)).toContain('disabled=""')
    expect(markup).toContain(helper)
  })

  it.each([
    {
      name: 'administrations',
      props: {
        administrationsError: apiError('server', '행정동 조회에 실패했어요.'),
        onRetryAdministrations: vi.fn(),
      },
      error: '행정동 조회에 실패했어요.',
      retryLabel: '행정동 다시 불러오기',
    },
    {
      name: 'candidates',
      props: {
        candidatesError: apiError('network', '후보 상권 조회에 실패했어요.'),
        onRetryCandidates: vi.fn(),
      },
      error: '후보 상권 조회에 실패했어요.',
      retryLabel: '후보 상권 다시 불러오기',
    },
  ])(
    'renders an accessible $name error and disables submit',
    ({ props, error, retryLabel }) => {
      const markup = renderPanel({
        ...baseProps,
        ...props,
        view: 'criteria',
      })

      expect(getSubmitMarkup(markup)).toContain('disabled=""')
      expect(markup).toContain(error)
      expect(markup).toContain('role="alert"')
      expect(markup).toMatch(new RegExp(`<button[^>]*>${retryLabel}</button>`))
    },
  )

  it.each([
    {
      name: 'administrations',
      props: {
        administrationsError: apiError(
          'not-found',
          '해당 자치구의 행정동 데이터가 없습니다.',
        ),
        onRetryAdministrations: vi.fn(),
      },
      error: '해당 자치구의 행정동 데이터가 없습니다.',
      retryLabel: '행정동 다시 불러오기',
    },
    {
      name: 'candidates',
      props: {
        candidatesError: apiError(
          'not-found',
          '해당 행정동의 상권 데이터가 없습니다.',
        ),
        onRetryCandidates: vi.fn(),
      },
      error: '해당 행정동의 상권 데이터가 없습니다.',
      retryLabel: '후보 상권 다시 불러오기',
    },
  ])(
    'keeps the server message but hides retry for a non-retryable $name failure',
    ({ props, error, retryLabel }) => {
      const markup = renderPanel({
        ...baseProps,
        ...props,
        view: 'criteria',
      })

      expect(markup).toContain(error)
      expect(markup).toContain('role="alert"')
      expect(getSubmitMarkup(markup)).toContain('disabled=""')
      expect(markup).not.toContain(retryLabel)
    },
  )

  it('uses the approved administration empty-state copy', () => {
    const markup = renderPanel({
      ...baseProps,
      administrations: [],
      view: 'criteria',
    })

    expect(markup).toContain(
      '현재 자치구의 행정동 데이터가 준비되지 않았습니다.',
    )
  })

  it('marks criteria and sheet results as distinct transition phases', () => {
    const criteriaMarkup = renderPanel({
      ...baseProps,
      view: 'criteria',
    })
    const sheetResultsMarkup = renderPanel({
      ...baseProps,
      variant: 'sheet',
      view: 'results',
    })

    expect(criteriaMarkup).toContain('data-panel-transition-key="criteria"')
    expect(sheetResultsMarkup).toContain('data-panel-transition-key="results"')
  })

  it('renders the submitted result snapshot and edit action', () => {
    const markup = renderPanel({
      ...baseProps,
      view: 'results',
    })

    expect(markup).toContain('커피-음료 추천 Top 5')
    expect(markup).toContain('강남구')
    expect(markup).toContain('역삼1동')
    expect(markup).toContain('커피-음료')
    expect(markup).toContain('2023년 3분기 기준')
    expect(markup).toContain('조건 수정')
    expect(markup).toContain('aria-live="polite"')
    expect(markup).toContain('tabindex="-1"')
  })

  it('uses the approved recommendation empty-state copy', () => {
    const markup = renderPanel({
      ...baseProps,
      view: 'results',
    })

    expect(markup).toContain('현재 조건으로 추천할 상권이 없어요.')
  })

  it('renders selected details with rounded and unavailable metric scores', () => {
    const markup = renderPanel({
      ...baseProps,
      view: 'results',
      results: [result],
      selectedCommercialCode: result.commercialCode,
    })

    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toMatch(/>84<\/span>/)
    expect(markup).toContain('기회도 높음')
    expect(markup).toContain('위험도 낮음')
    expect(markup).toContain('유동인구 우세')
    expect(markup).toContain('매출 경쟁력')
    expect(markup).toContain('데이터 없음')
  })

  it('highlights a shared map preview without exposing selection semantics and clears it', () => {
    const previewMarkup = renderPanel({
      ...baseProps,
      view: 'results',
      results: [result],
      previewedCommercialCode: result.commercialCode,
    })
    const clearedMarkup = renderPanel({
      ...baseProps,
      view: 'results',
      results: [result],
      previewedCommercialCode: null,
    })
    const previewedCard = previewMarkup.match(
      /<article[^>]*data-result-card="true"[^>]*>/,
    )?.[0]
    const previewedControl = previewMarkup.match(
      /<button[^>]*aria-pressed="false"[^>]*>/,
    )?.[0]

    expect(previewedCard).toContain('data-previewed="true"')
    expect(previewedControl).toBeDefined()
    expect(previewedControl).not.toContain('aria-current')
    expect(clearedMarkup).not.toContain('data-previewed="true"')
  })

  it('connects the selected control to its expanded details', () => {
    const markup = renderPanel({
      ...baseProps,
      view: 'results',
      results: [result],
      selectedCommercialCode: result.commercialCode,
    })
    const selectedControl = markup.match(
      /<button[^>]*aria-pressed="true"[^>]*>/,
    )?.[0]
    const controlledId = selectedControl?.match(/aria-controls="([^"]+)"/)?.[1]

    expect(selectedControl).toContain('aria-expanded="true"')
    expect(controlledId).toBeTruthy()
    expect(markup).toContain(`id="${controlledId}"`)
  })

  it('trims a blank metric summary before falling back to its metric name', () => {
    const resultWithBlankMetricSummary: CandidateCommercial = {
      ...result,
      metricBreakdown: [
        {
          ...result.metricBreakdown[0],
          summaryLabel: '   ',
        },
      ],
    }
    const markup = renderToStaticMarkup(
      createElement(RecommendResultList, {
        results: [resultWithBlankMetricSummary],
        selectedCommercialCode: resultWithBlankMetricSummary.commercialCode,
        isLoading: false,
        feedback: null,
        onSelect: vi.fn(),
        onRetry: vi.fn(),
      }),
    )

    expect(markup).toContain('<dt>매출</dt>')
  })

  it('deduplicates reason badges globally and caps them at three', () => {
    const resultWithDuplicateLabels: CandidateCommercial = {
      ...result,
      opportunityLabel: '중복 라벨',
      riskLabel: '위험 라벨',
      reasonTags: ['중복 라벨', ' 위험 라벨 ', '성장 라벨', '추가 라벨'],
    }
    const markup = renderToStaticMarkup(
      createElement(RecommendResultList, {
        results: [resultWithDuplicateLabels],
        selectedCommercialCode: resultWithDuplicateLabels.commercialCode,
        isLoading: false,
        feedback: null,
        onSelect: vi.fn(),
        onRetry: vi.fn(),
      }),
    )

    expect(markup.match(/data-reason-badge="true"/g)).toHaveLength(3)
    expect(markup.match(/중복 라벨/g)).toHaveLength(1)
    expect(markup.match(/위험 라벨/g)).toHaveLength(1)
    expect(markup.match(/성장 라벨/g)).toHaveLength(1)
    expect(markup).not.toContain('추가 라벨')
  })

  it('keeps selection and future secondary actions as siblings', () => {
    const markup = renderToStaticMarkup(
      createElement(RecommendResultList, {
        results: [result],
        selectedCommercialCode: result.commercialCode,
        isLoading: false,
        feedback: null,
        onSelect: vi.fn(),
        onRetry: vi.fn(),
      }),
    )
    const card = markup.match(
      /<article[^>]*data-result-card="true"[\s\S]*?<\/article>/,
    )?.[0]

    expect(card).toBeDefined()
    expect(card?.match(/<button/g)).toHaveLength(1)
    expect(card).toMatch(
      /<\/button>[\s\S]*<div[^>]*data-result-secondary-actions="true"/,
    )
  })

  it('renders an accessible sibling bookmark action with pressed and pending states', () => {
    const bookmarkedMarkup = renderToStaticMarkup(
      createElement(RecommendResultList, {
        results: [result],
        selectedCommercialCode: result.commercialCode,
        isLoading: false,
        feedback: null,
        isBookmarked: () => true,
        isBookmarkPending: () => false,
        onBookmarkToggle: vi.fn(),
        onSelect: vi.fn(),
        onRetry: vi.fn(),
      }),
    )
    const pendingMarkup = renderToStaticMarkup(
      createElement(RecommendResultList, {
        results: [result],
        selectedCommercialCode: result.commercialCode,
        isLoading: false,
        feedback: null,
        isBookmarked: () => false,
        isBookmarkPending: () => true,
        onBookmarkToggle: vi.fn(),
        onSelect: vi.fn(),
        onRetry: vi.fn(),
      }),
    )
    const card = bookmarkedMarkup.match(
      /<article[^>]*data-result-card="true"[\s\S]*?<\/article>/,
    )?.[0]
    const selectionButton = card?.match(
      /<button[^>]*aria-pressed="true"[\s\S]*?<\/button>/,
    )?.[0]

    expect(card?.match(/<button/g)).toHaveLength(2)
    expect(selectionButton?.match(/<button/g)).toHaveLength(1)
    expect(bookmarkedMarkup).toMatch(
      /<button[^>]*aria-label="강남역 상권 북마크 삭제"[^>]*aria-pressed="true"/,
    )
    expect(pendingMarkup).toMatch(
      /<button[^>]*aria-label="강남역 상권 북마크 처리 중"[^>]*aria-pressed="false"[^>]*disabled=""/,
    )
  })

  it('uses a minimum 44 by 44 target for bookmark actions', () => {
    const styles = renderStyles(
      createElement(RecommendResultList, {
        results: [result],
        selectedCommercialCode: result.commercialCode,
        isLoading: false,
        feedback: null,
        isBookmarked: () => false,
        isBookmarkPending: () => false,
        onBookmarkToggle: vi.fn(),
        onSelect: vi.fn(),
        onRetry: vi.fn(),
      }),
    )

    expect(styles).toContain('min-width:44px;min-height:44px')
  })

  it('renders deterministic loading skeletons and empty feedback landmarks', () => {
    const loadingMarkup = renderToStaticMarkup(
      createElement(RecommendResultList, {
        results: [],
        selectedCommercialCode: null,
        isLoading: true,
        feedback: null,
        onSelect: vi.fn(),
        onRetry: vi.fn(),
      }),
    )
    const emptyMarkup = renderToStaticMarkup(
      createElement(RecommendResultList, {
        results: [],
        selectedCommercialCode: null,
        isLoading: false,
        feedback: null,
        onSelect: vi.fn(),
        onRetry: vi.fn(),
      }),
    )

    expect(loadingMarkup).toContain('role="status"')
    expect(loadingMarkup.match(/data-result-skeleton="true"/g)).toHaveLength(5)
    expect(emptyMarkup).toContain('role="status"')
    expect(emptyMarkup).toContain('추천 결과가 없어요')
  })

  it('renders error feedback as an alert with a real retry button', () => {
    const markup = renderToStaticMarkup(
      createElement(RecommendFeedback, {
        tone: 'error',
        title: '추천 결과를 불러오지 못했어요',
        description: '잠시 후 다시 시도해 주세요.',
        actionLabel: '다시 시도',
        onAction: vi.fn(),
      }),
    )

    expect(markup).toContain('role="alert"')
    expect(markup).toMatch(/<button[^>]*>다시 시도<\/button>/)
  })

  it('disables a retry action while its refetch is pending', () => {
    const markup = renderToStaticMarkup(
      createElement(RecommendFeedback, {
        tone: 'error',
        title: '지도 정보를 불러오지 못했어요',
        actionLabel: '지도 불러오는 중',
        isActionDisabled: true,
        onAction: vi.fn(),
      }),
    )

    expect(markup).toMatch(
      /<button[^>]*disabled=""[^>]*>지도 불러오는 중<\/button>/,
    )
  })

  it('renders malformed labels and metric entries without throwing', () => {
    const malformedResult = {
      ...result,
      opportunityLabel: 1,
      riskLabel: {},
      reasonTags: [1, '유효 라벨'],
      metricBreakdown: [
        null,
        {
          metricType: {
            code: 'SALES',
            name: 1,
          },
          score: null,
          summaryLabel: 2,
        },
      ],
    } as unknown as CandidateCommercial

    expect(() =>
      renderToStaticMarkup(
        createElement(RecommendResultList, {
          results: [malformedResult],
          selectedCommercialCode: malformedResult.commercialCode,
          isLoading: false,
          feedback: null,
          onSelect: vi.fn(),
          onRetry: vi.fn(),
        }),
      ),
    ).not.toThrow()
  })

  it('supports an action on informational result feedback', () => {
    const markup = renderToStaticMarkup(
      createElement(RecommendResultList, {
        results: [],
        selectedCommercialCode: null,
        isLoading: false,
        feedback: {
          tone: 'info',
          title: '추천 범위를 확인해 주세요',
          actionLabel: '범위 다시 불러오기',
        },
        onSelect: vi.fn(),
        onRetry: vi.fn(),
      }),
    )

    expect(markup).toContain('role="status"')
    expect(markup).toMatch(/<button[^>]*>범위 다시 불러오기<\/button>/)
  })

  it('uses the canonical primary/error tokens for CTA and feedback', () => {
    const criteriaStyles = renderStyles(
      createElement(RecommendPanel, {
        ...baseProps,
        view: 'criteria',
      }),
    )
    const resultStyles = renderStyles(
      createElement(RecommendPanel, {
        ...baseProps,
        view: 'results',
        results: [result],
        selectedCommercialCode: result.commercialCode,
      }),
    )
    const errorStyles = renderStyles(
      createElement(RecommendFeedback, {
        tone: 'error',
        title: '추천 결과를 불러오지 못했어요',
        description: '잠시 후 다시 시도해 주세요.',
      }),
    )

    expect(criteriaStyles).toContain(
      'border:1px solid var(--color-primary-700)',
    )
    // 주 CTA 는 흰 텍스트다 — DESIGN.md §Primary (Fill) 정본이고, 저장소의 나머지
    // primary 버튼 14곳이 전부 흰 텍스트다. 이 버튼만 charcoal 이면 규격이 갈린다.
    // (blue500 + white = 2.77:1 로 AA 미달인 건 fill 색 자체의 문제라 디자인 시스템
    //  차원에서 따로 다룬다 — DESIGN.md §Primary (Fill) 의 '알려진 격차' 주석.)
    expect(criteriaStyles).toContain(
      'background:var(--color-primary-700);color:#ffffff',
    )
    expect(resultStyles).toContain('border:1px solid var(--color-primary-600)')
    expect(resultStyles).toContain(
      'min-width:28px;color:var(--color-text-900);font-size:15px',
    )
    expect(errorStyles).toContain('border:1px solid var(--color-danger)')
    expect(errorStyles).toContain('color:var(--color-text-900)')
  })
})
