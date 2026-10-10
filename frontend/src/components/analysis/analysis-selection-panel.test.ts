import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import AnalysisSelectionPanel from '@/components/analysis/analysis-selection-panel'
import { normalizeApiError } from '@/lib/api/api-error'
import { createEmptyAnalysisSelection } from '@/lib/analysis/selection'
import type { AnalysisStep } from '@/lib/analysis/selection'

const apiError = (status: number, resultCode: string, resultMessage: string) =>
  normalizeApiError({
    response: {
      status,
      data: {
        dataHeader: { success: false, resultCode, resultMessage },
      },
    },
  })

const renderErrorPanel = (
  error: ReturnType<typeof apiError>,
  activeStep: AnalysisStep = 'district',
) =>
  renderToStaticMarkup(
    createElement(AnalysisSelectionPanel, {
      activeStep,
      selection: createEmptyAnalysisSelection(),
      periodCode: '20261',
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
      periodCode: '20261',
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

    expect(markup).toContain('동네를 정했다면 그 안에서 상권 순위 받기')
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
        periodCode: '20261',
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
    expect(markup).toContain('자치구를 선택해 주세요')
  })

  it('상권까지 골랐으면 안내에 업종만 남는다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisSelectionPanel, {
        activeStep: 'service',
        selection: {
          ...createEmptyAnalysisSelection(),
          districtCode: '11680',
          administrationCode: '11680510',
          commercialCode: '3110001',
        },
        periodCode: '20261',
        selectedNames: {},
        items: [{ code: 'CS100001', name: '한식음식점' }],
        status: 'ready',
        error: null,
        onStepChange: () => undefined,
        onSelect: () => undefined,
        onPreviewChange: () => undefined,
        onRetry: () => undefined,
        onSubmit: () => undefined,
      }),
    )

    expect(markup).toContain('업종을 선택해 주세요')
  })

  it('행정동을 건너뛰면 행정동부터 안내한다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisSelectionPanel, {
        activeStep: 'service',
        selection: {
          ...createEmptyAnalysisSelection(),
          districtCode: '11680',
          commercialCode: '3110001',
        },
        periodCode: '20261',
        selectedNames: {},
        items: [{ code: 'CS100001', name: '한식음식점' }],
        status: 'ready',
        error: null,
        onStepChange: () => undefined,
        onSelect: () => undefined,
        onPreviewChange: () => undefined,
        onRetry: () => undefined,
        onSubmit: () => undefined,
      }),
    )

    expect(markup).toContain('행정동을 선택해 주세요')
  })

  it('현재 선택 후보에 aria-selected를 제공한다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisSelectionPanel, {
        activeStep: 'district',
        selection: {
          ...createEmptyAnalysisSelection(),
          districtCode: '11680',
        },
        periodCode: '20261',
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
    // 2단계 이후는 상위 선택에 따라 목록이 없을 수 있다 — 정상적인 빈 상태다.
    const markup = renderErrorPanel(
      apiError(
        404,
        'REGION_003',
        '해당 행정동 코드를 찾을 수 없습니다. (11680640)',
      ),
      'administration',
    )

    expect(markup).toContain('선택 가능한 항목이 없어요')
    expect(markup).toContain('해당 행정동 코드를 찾을 수 없습니다.')
    expect(markup).not.toContain('다시 시도')
  })

  /*
   * 1단계 자치구는 서울 25개 고정이라 **0건이 될 수 없는 목록**이다. 여기서 404 나
   * 빈 배열이 오면 사용자의 선택 문제가 아니라 데이터 공급 장애다(#371).
   */
  it('1단계 404 는 빈 상태가 아니라 장애로 안내한다', () => {
    const markup = renderErrorPanel(
      apiError(404, 'DISTRICT_001', '자치구를 찾을 수 없습니다.'),
      'district',
    )

    expect(markup).toContain('목록을 불러오지 못했어요')
    expect(markup).toContain('서울 자치구 25개는 항상 있어야 하는 목록입니다.')
    expect(markup).not.toContain('선택 가능한 항목이 없어요')
  })
})

describe('AnalysisSelectionPanel 빈 목록', () => {
  const renderEmptyPanel = (activeStep: AnalysisStep) =>
    renderToStaticMarkup(
      createElement(AnalysisSelectionPanel, {
        activeStep,
        selection: createEmptyAnalysisSelection(),
        periodCode: '20261',
        selectedNames: {},
        items: [],
        status: 'empty',
        error: null,
        onStepChange: () => undefined,
        onSelect: () => undefined,
        onPreviewChange: () => undefined,
        onRetry: () => undefined,
        onSubmit: () => undefined,
      }),
    )

  it('1단계가 비면 재시도 가능한 장애로 안내한다', () => {
    const markup = renderEmptyPanel('district')

    expect(markup).toContain('자치구 목록을 불러오지 못했어요')
    expect(markup).toContain('서울 자치구 25개는 항상 있어야 하는 목록입니다.')
    expect(markup).toContain('다시 시도')
  })

  it('2단계 이후가 비면 종전대로 빈 상태로 안내한다', () => {
    const markup = renderEmptyPanel('administration')

    expect(markup).toContain('선택 가능한 항목이 없어요')
    expect(markup).toContain('이전 단계에서 다른 지역을 선택해 주세요.')
    expect(markup).not.toContain('다시 시도')
  })
})

describe('AnalysisSelectionPanel 인기 상권 지름길', () => {
  const renderWithJump = (
    overrides: Partial<Parameters<typeof AnalysisSelectionPanel>[0]> = {},
  ) =>
    renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        {
          client: new QueryClient({
            defaultOptions: { queries: { retry: false } },
          }),
        },
        createElement(AnalysisSelectionPanel, {
          activeStep: 'district',
          selection: createEmptyAnalysisSelection(),
          periodCode: '20261',
          selectedNames: {},
          items: [{ code: '11680', name: '강남구' }],
          status: 'ready',
          error: null,
          onStepChange: () => undefined,
          onSelect: () => undefined,
          onPreviewChange: () => undefined,
          onRetry: () => undefined,
          onSubmit: () => undefined,
          onPopularCommercialJump: () => undefined,
          ...overrides,
        }),
      ),
    )

  it('1단계에서 지름길을 낸다', () => {
    expect(renderWithJump()).toContain('지금 많이 본 상권')
  })

  /*
   * 자치구를 이미 고른 사람에게 다른 자치구의 상권을 들이밀 이유가 없다.
   * 2단계부터는 패널이 좁아지기도 한다.
   */
  it('2단계부터는 지름길을 내지 않는다', () => {
    const markup = renderWithJump({
      activeStep: 'administration',
      selection: { ...createEmptyAnalysisSelection(), districtCode: '11680' },
    })

    expect(markup).not.toContain('지금 많이 본 상권')
  })

  /*
   * 콜백을 넘기지 않으면 블록 자체가 없다 — 패널만 단독으로 그리는 자리(테스트 등)가
   * 순위 API 를 부르지 않게 하는 장치다.
   */
  it('콜백이 없으면 블록을 만들지 않는다', () => {
    const markup = renderPanel({
      activeStep: 'district',
      items: [{ code: '11680', name: '강남구' }],
    })

    expect(markup).not.toContain('지금 많이 본 상권')
  })
})

/* 안내 문장의 분기는 해석된 분기다 — 결과에서 고른 분기로 돌아오면 그 분기를 말한다(period-catalog.md D4-2). */
describe('AnalysisSelectionPanel — 분석 기준 분기 안내', () => {
  const complete = {
    ...createEmptyAnalysisSelection(),
    districtCode: '11680',
    administrationCode: '11680640',
    commercialCode: '3110008',
    serviceCode: 'CS100001',
  }

  it('해석된 분기를 「N년 N분기 기준」으로 적는다', () => {
    expect(renderPanel({ selection: complete, periodCode: '20233' })).toContain(
      '2023년 3분기 기준으로 분석해요',
    )
  })

  it('서버 기본 분기를 받기 전에는 「최신 분기」로 적는다', () => {
    expect(renderPanel({ selection: complete, periodCode: null })).toContain(
      '최신 분기 기준으로 분석해요',
    )
  })
})

describe('단계 탭은 고른 값을 보여 준다 (#591)', () => {
  const selection = {
    ...createEmptyAnalysisSelection(),
    districtCode: '11440',
    administrationCode: '11440660',
    commercialCode: '3110565',
  }
  const markup = renderPanel({
    activeStep: 'service',
    selection,
    selectedNames: {
      district: '마포구',
      administration: '서교동',
      commercial: '홍대 걷고싶은거리',
    },
  })
  const stepList = markup.slice(
    markup.indexOf('aria-label="분석 조건 단계"'),
    markup.indexOf('</ol>'),
  )

  it('「N단계」 번호 글자를 내지 않는다', () => {
    expect(stepList).not.toMatch(/\d단계/)
  })

  it('고른 단계는 값을, 안 고른 단계는 단계 이름만 쓴다', () => {
    expect(stepList).toContain('>마포구<')
    expect(stepList).toContain('>홍대 걷고싶은거리<')
    expect(stepList).toContain('>업종<')
    expect(stepList).not.toContain('>자치구<')
  })

  it('접근 이름은 단계와 값을 함께 읽고 title 툴팁에 기대지 않는다', () => {
    expect(stepList).toContain('aria-label="상권: 홍대 걷고싶은거리"')
    expect(stepList).toContain('aria-label="업종"')
    expect(stepList).not.toContain('title=')
  })

  it('현재 단계만 aria-current="step" 이다', () => {
    expect(stepList.match(/aria-current="step"/g)).toHaveLength(1)
    expect(stepList).toMatch(/aria-current="step"[^>]*aria-label="업종"/)
  })

  it('코드는 있어도 이름을 아직 모르면(목록 로딩 중) 단계 이름으로 둔다', () => {
    const loading = renderPanel({
      activeStep: 'administration',
      selection: { ...createEmptyAnalysisSelection(), districtCode: '11440' },
      selectedNames: {},
    })
    expect(loading).toContain('aria-label="자치구"')
  })
})

describe('데스크톱 업종은 2열 선택지다 (#587)', () => {
  const serviceItems = [
    { code: 'CS100001', name: '한식음식점', description: '외식업' },
    { code: 'CS100010', name: '커피-음료', description: '외식업' },
    { code: 'CS200028', name: '미용실', description: '서비스업' },
  ]
  const selection = {
    ...createEmptyAnalysisSelection(),
    districtCode: '11440',
    administrationCode: '11440660',
    commercialCode: '3110565',
    serviceCode: 'CS100001',
  }

  it('패널에서는 chevron 없이 선택 체크만 두고 분류 머리를 남긴다', () => {
    const markup = renderPanel({
      activeStep: 'service',
      selection,
      items: serviceItems,
    })
    // lucide 아이콘 클래스로 판별한다 — 하위 화면 신호인 chevron 이 없다.
    expect(markup).not.toContain('lucide-chevron-right')
    expect(markup).toContain('lucide-check')
    expect(markup).toContain('외식업')
    expect(markup).toContain('서비스업')
  })

  it('모바일 시트는 기존 여러 열 목록을 그대로 쓴다', () => {
    const markup = renderPanel({
      activeStep: 'service',
      selection,
      items: serviceItems,
      variant: 'sheet',
    })
    expect(markup).toContain('lucide-chevron-right')
  })
})

describe('1단계 이름 검색 칸 (#596)', () => {
  const districtItems = Array.from({ length: 25 }, (_, index) => ({
    code: String(11110 + index * 10),
    name: `자치구${index + 1}`,
  }))

  it('이름 검색 칸이 있으면 자치구 목록의 검색 칸을 숨기고 그 칸을 맨 위에 둔다', () => {
    const markup = renderPanel({
      activeStep: 'district',
      items: districtItems,
      nameSearch: createElement('div', null, 'NAME_SEARCH'),
    })
    expect(markup).toContain('NAME_SEARCH')
    expect(markup).not.toContain('placeholder="자치구 검색"')
    expect(markup.indexOf('NAME_SEARCH')).toBeLessThan(
      markup.indexOf('분석 조건 단계'),
    )
  })

  it('이름 검색 칸이 없으면 자치구 목록의 검색 칸을 그대로 둔다', () => {
    const markup = renderPanel({ activeStep: 'district', items: districtItems })
    expect(markup).toContain('placeholder="자치구 검색"')
  })

  it('2단계부터는 이름 검색 칸을 두지 않는다', () => {
    const markup = renderPanel({
      activeStep: 'commercial',
      items: districtItems,
      nameSearch: createElement('div', null, 'NAME_SEARCH'),
    })
    expect(markup).not.toContain('NAME_SEARCH')
  })
})
