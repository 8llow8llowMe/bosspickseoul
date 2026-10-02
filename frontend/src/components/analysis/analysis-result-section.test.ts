import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'

import AnalysisMetricList from '@/components/analysis/analysis-metric-list'
import AnalysisResultSection from '@/components/analysis/analysis-result-section'
import { normalizeApiError } from '@/lib/api/api-error'

/**
 * 백엔드 공통 규약의 실패 응답 형태를 그대로 흉내 낸다.
 * `resultCode`·`resultMessage` 는 실재하는 값만 쓴다
 * (`CommercialErrorCode`, `backend/docs/api-reference.md` "에러코드 대역").
 */
const apiError = (status: number, resultCode: string, resultMessage: string) =>
  normalizeApiError({
    response: {
      status,
      data: {
        dataHeader: { success: false, resultCode, resultMessage },
      },
    },
  })

const renderSection = (error: ReturnType<typeof apiError>) =>
  renderToStaticMarkup(
    createElement(
      AnalysisResultSection,
      {
        title: '매출',
        loading: false,
        error,
        empty: false,
        onRetry: () => undefined,
      },
      createElement('p', null, '성공 내용'),
    ),
  )

describe('AnalysisResultSection', () => {
  it('5xx 일시 장애는 오류 섹션만 재시도 상태로 격리한다', () => {
    const markup = renderSection(
      apiError(
        503,
        'COMMERCIAL_012',
        '지역 정보 서비스와의 통신이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.',
      ),
    )

    expect(markup).toContain('매출 정보를 불러오지 못했어요')
    expect(markup).toContain('지역 정보 서비스와의 통신이 원활하지 않습니다.')
    expect(markup).toContain('다시 시도')
    expect(markup).not.toContain('성공 내용')
  })

  it('404 데이터 부재는 재시도 버튼 없이 서버 안내 문구를 그대로 노출한다', () => {
    const markup = renderSection(
      apiError(
        404,
        'COMMERCIAL_006',
        '해당 분기의 유동인구 데이터가 없습니다. 다른 분기를 선택해 주세요.',
      ),
    )

    expect(markup).toContain('매출 데이터가 없어요')
    expect(markup).toContain(
      '해당 분기의 유동인구 데이터가 없습니다. 다른 분기를 선택해 주세요.',
    )
    expect(markup).not.toContain('다시 시도')
    expect(markup).not.toContain('성공 내용')
  })

  it('기간과 무관한 404 에는 기간 선택 힌트를 붙이지 않는다', () => {
    // COMMERCIAL_002 는 상권 코드 자체가 없을 때다(보관함·공유링크로 죽은 코드 진입).
    // 연/분기를 바꿔도 같은 404 이므로 기간 드롭다운으로 유도하면 안 된다.
    const markup = renderSection(
      apiError(404, 'COMMERCIAL_002', '존재하지 않는 상권입니다.'),
    )

    expect(markup).toContain('존재하지 않는 상권입니다.')
    expect(markup).not.toContain('다른 연도·분기를 골라 보세요')
    expect(markup).not.toContain('다시 시도')
  })

  it('분기 종속 404 인데 안내 문장이 없으면 기간 선택 힌트를 덧붙인다', () => {
    // 방어 분기: 규약 형식("해당 분기의 …")은 지키지만 뒤따르는 안내 문장이 빠진 응답.
    const markup = renderSection(
      apiError(404, 'COMMERCIAL_007', '해당 분기의 매출 데이터가 없습니다.'),
    )

    expect(markup).toContain('해당 분기의 매출 데이터가 없습니다.')
    expect(markup).toContain('다른 연도·분기를 골라 보세요')
    expect(markup).not.toContain('다시 시도')
  })
})

describe('AnalysisResultSection 불러오는 중', () => {
  const loadingStyles = (loadingHeight?: number) => {
    const sheet = new ServerStyleSheet()
    try {
      const markup = renderToStaticMarkup(
        sheet.collectStyles(
          createElement(AnalysisResultSection, {
            title: '시간대별 유동인구',
            loading: true,
            error: null,
            empty: false,
            loadingHeight,
          }),
        ),
      )
      return { markup, css: sheet.getStyleTags().replace(/\s+/g, '') }
    } finally {
      sheet.seal()
    }
  }

  it('차트 카드는 넘긴 본문 높이만큼 자리를 잡아 로딩 뒤 아래 카드가 밀리지 않게 한다', () => {
    const { markup, css } = loadingStyles(260)

    expect(markup).toContain('시간대별 유동인구 불러오는 중')
    expect(css).toContain('height:260px')
    expect(css).not.toContain('height:96px')
  })

  it('높이를 넘기지 않으면 카드·목록 섹션 기준 96px 를 쓴다', () => {
    expect(loadingStyles().css).toContain('height:96px')
  })
})

const renderCollapsible = (
  props: Partial<Parameters<typeof AnalysisResultSection>[0]> = {},
) => {
  const sheet = new ServerStyleSheet()
  try {
    const markup = renderToStaticMarkup(
      sheet.collectStyles(
        createElement(
          AnalysisResultSection,
          {
            title: '요일별 유동인구',
            description: '주말 하루 유동인구가 평일보다 12% 많아요',
            loading: false,
            error: null,
            empty: false,
            collapsible: true,
            ...props,
          },
          createElement('p', null, '차트 본문'),
        ),
      ),
    )
    const css = sheet
      .getStyleTags()
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, '')
    return { markup, css }
  } finally {
    sheet.seal()
  }
}

describe('AnalysisResultSection 접기 (1열 폭)', () => {
  it('접을 수 있는 카드는 접힌 펼침 버튼이 본문을 가리키고, 결론 문장은 버튼 밖에 남는다', () => {
    const { markup } = renderCollapsible()

    const controls = markup.match(/aria-controls="([^"]+)"/)?.[1]
    expect(markup).toContain('aria-expanded="false"')
    expect(controls).toBeTruthy()
    expect(markup).toContain(`id="${controls}"`)
    expect(markup).toContain('<p>주말 하루 유동인구가 평일보다 12% 많아요</p>')
    // 본문은 마크업에 그대로 있고 CSS 로만 숨긴다 — 넓은 폭에서는 늘 펼쳐져 있어야 한다.
    expect(markup).toContain('차트 본문')
  })

  it('본문 숨김과 펼침 버튼은 analysis-report 컨테이너가 1열(<640px)일 때만 켜진다', () => {
    const { css } = renderCollapsible()

    expect(css).toContain('@containeranalysis-report(max-width:639px)')
    expect(css).toMatch(
      /@containeranalysis-report\(max-width:639px\)\{[^}]*\{display:none;?\}/,
    )
  })

  it('collapsible 이 없으면 펼침 버튼을 그리지 않는다', () => {
    const { markup } = renderCollapsible({ collapsible: false })

    expect(markup).not.toContain('aria-expanded')
    expect(markup).not.toContain('<button')
  })

  it('오류·빈 상태는 접지 않는다 — 재시도와 「데이터 없음」이 접힌 카드 뒤에 숨지 않게', () => {
    const failed = renderCollapsible({
      error: apiError(
        503,
        'COMMERCIAL_012',
        '지역 정보 서비스와의 통신이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.',
      ),
      onRetry: () => undefined,
    })
    const empty = renderCollapsible({ empty: true })

    expect(failed.markup).not.toContain('aria-expanded')
    expect(failed.markup).toContain('다시 시도')
    expect(empty.markup).not.toContain('aria-expanded')
    expect(empty.markup).toContain('요일별 유동인구 데이터가 없어요')
  })
})

describe('AnalysisMetricList', () => {
  it('숫자 텍스트와 접근 가능한 막대 값을 함께 제공한다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisMetricList, {
        rows: [
          { label: '월', value: 10 },
          { label: '화', value: null },
        ],
        unit: '명',
      }),
    )

    expect(markup).toContain('10명')
    expect(markup).toContain('데이터 없음')
    expect(markup).toContain('aria-valuenow="10"')
  })
})
