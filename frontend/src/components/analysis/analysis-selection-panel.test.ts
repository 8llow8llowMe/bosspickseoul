import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisSelectionPanel from '@/components/analysis/analysis-selection-panel'
import { normalizeApiError } from '@/lib/api/api-error'
import { createEmptyAnalysisSelection } from '@/lib/analysis/selection'

const apiError = (status: number, resultCode: string, resultMessage: string) =>
  normalizeApiError({
    response: {
      status,
      data: {
        dataHeader: { success: false, resultCode, resultMessage },
      },
    },
  })

const renderErrorPanel = (error: ReturnType<typeof apiError>) =>
  renderToStaticMarkup(
    createElement(AnalysisSelectionPanel, {
      activeStep: 'district',
      selection: createEmptyAnalysisSelection(),
      selectedNames: {},
      items: [],
      status: 'error',
      error,
      onStepChange: () => undefined,
      onSelect: () => undefined,
      onPreviewChange: () => undefined,
      onRetry: () => undefined,
      onSubmit: () => undefined,
    }),
  )

const renderPanel = (
  overrides: Partial<Parameters<typeof AnalysisSelectionPanel>[0]> = {},
) =>
  renderToStaticMarkup(
    createElement(AnalysisSelectionPanel, {
      activeStep: 'commercial',
      selection: createEmptyAnalysisSelection(),
      selectedNames: {},
      items: [],
      status: 'ready',
      error: null,
      onStepChange: () => undefined,
      onSelect: () => undefined,
      onPreviewChange: () => undefined,
      onRetry: () => undefined,
      onSubmit: () => undefined,
      ...overrides,
    }),
  )

describe('AnalysisSelectionPanel 추천 탈출구', () => {
  it('선택이 덜 끝났으면 고른 조건을 실어 /recommend 로 보낸다', () => {
    // 이 화면은 「어느 상권인지 이미 아는」 사람을 전제로 4단계를 요구한다.
    // 모르는 사람이 상권을 찾아 주는 도구로 건너갈 길이 없었다.
    const markup = renderPanel({
      selection: {
        ...createEmptyAnalysisSelection(),
        districtCode: '11680',
        administrationCode: '11680640',
      },
    })

    const link =
      markup.match(
        /<a[^>]*data-testid="analysis-recommend-escape"[^>]*>/,
      )?.[0] ?? ''

    expect(markup).toContain('어디가 좋을지 모르겠다면 상권 추천받기')
    expect(link).toContain('href="/recommend?')
    expect(link).toContain('districtCode=11680')
    expect(link).toContain('administrationCode=11680640')
  })

  it('선택이 끝나면 감춰서 주 CTA 와 경쟁하지 않는다', () => {
    const markup = renderPanel({
      activeStep: 'service',
      selection: {
        districtCode: '11680',
        administrationCode: '11680640',
        commercialCode: '3110958',
        serviceCode: 'CS100010',
        periodCode: '20233',
      },
    })

    expect(markup).not.toContain('analysis-recommend-escape')
  })
})

describe('AnalysisSelectionPanel', () => {
  it('4단계와 미완료 안내를 표시한다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisSelectionPanel, {
        activeStep: 'district',
        selection: createEmptyAnalysisSelection(),
        selectedNames: {},
        items: [{ code: '11680', name: '강남구' }],
        status: 'ready',
        error: null,
        onStepChange: () => undefined,
        onSelect: () => undefined,
        onPreviewChange: () => undefined,
        onRetry: () => undefined,
        onSubmit: () => undefined,
      }),
    )

    expect(markup).toContain('자치구')
    expect(markup).toContain('행정동')
    expect(markup).toContain('상권')
    expect(markup).toContain('업종')
    expect(markup).toContain('상권과 업종을 선택해 주세요')
  })

  it('현재 선택 후보에 aria-selected를 제공한다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisSelectionPanel, {
        activeStep: 'district',
        selection: {
          ...createEmptyAnalysisSelection(),
          districtCode: '11680',
        },
        selectedNames: { district: '강남구' },
        items: [{ code: '11680', name: '강남구' }],
        status: 'ready',
        error: null,
        onStepChange: () => undefined,
        onSelect: () => undefined,
        onPreviewChange: () => undefined,
        onRetry: () => undefined,
        onSubmit: () => undefined,
      }),
    )

    expect(markup).toContain('aria-selected="true"')
  })

  it('5xx 목록 오류는 재시도 버튼과 서버 문구를 함께 노출한다', () => {
    const markup = renderErrorPanel(
      apiError(
        503,
        'COMMERCIAL_012',
        '지역 정보 서비스와의 통신이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.',
      ),
    )

    expect(markup).toContain('목록을 불러오지 못했어요')
    expect(markup).toContain('지역 정보 서비스와의 통신이 원활하지 않습니다.')
    expect(markup).toContain('다시 시도')
  })

  it('404 목록 부재는 재시도 버튼 없이 서버 문구만 노출한다', () => {
    const markup = renderErrorPanel(
      apiError(
        404,
        'REGION_003',
        '해당 행정동 코드를 찾을 수 없습니다. (11680640)',
      ),
    )

    expect(markup).toContain('선택 가능한 항목이 없어요')
    expect(markup).toContain('해당 행정동 코드를 찾을 수 없습니다.')
    expect(markup).not.toContain('다시 시도')
  })
})
