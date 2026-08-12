import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  AnalysisExplorerSurface,
  getAnalysisQueryStatus,
} from '@/components/analysis/analysis-page'

describe('AnalysisExplorerSurface', () => {
  it('푸터 제거 속성과 데스크톱·모바일 선택 surface를 제공한다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisExplorerSurface, {
        map: createElement('div', null, '분석 지역 지도'),
        desktopPanel: createElement('div', null, '데스크톱 선택'),
        mobilePanel: createElement('div', null, '모바일 선택'),
      }),
    )

    expect(markup).toContain('data-hide-footer="true"')
    expect(markup).toContain('분석 지역 지도')
    expect(markup).toContain('데스크톱 선택')
    expect(markup).toContain('모바일 선택')
  })

  it('aiReportCard/aiReportPanel 슬롯을 MapArea 위에 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisExplorerSurface, {
        map: createElement('div', null, 'MAP'),
        desktopPanel: createElement('div', null, 'PANEL'),
        mobilePanel: createElement('div', null, 'MOBILE'),
        aiReportCard: createElement('div', null, 'AI_CARD'),
        aiReportPanel: createElement('div', null, 'AI_PANEL'),
      }),
    )
    expect(markup).toContain('AI_CARD')
    expect(markup).toContain('AI_PANEL')
  })

  it('API 성공 여부와 데이터 길이를 화면 상태로 정규화한다', () => {
    expect(
      getAnalysisQueryStatus({
        isPending: true,
        isError: false,
        isSuccessResponse: false,
        itemCount: 0,
      }),
    ).toBe('loading')
    expect(
      getAnalysisQueryStatus({
        isPending: false,
        isError: false,
        isSuccessResponse: true,
        itemCount: 0,
      }),
    ).toBe('empty')
    expect(
      getAnalysisQueryStatus({
        isPending: false,
        isError: false,
        isSuccessResponse: true,
        itemCount: 2,
      }),
    ).toBe('ready')
  })

  // 소스 계약: 상권 레벨 AI 리포트 패널의 "AI 리포트 보기" CTA href는 선택(selection)을
  // 아는 이 컴포넌트가 createAiReportHref로 만들어 AiReportPanel에 내려준다.
  // 라벨 자체는 ai-report-panel.test.ts에서 검증한다.
  it('상권 레벨 AI 리포트 패널에 createAiReportHref로 만든 href를 내려준다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./analysis-page.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain('createAiReportHref')
    expect(src).toContain('aiReportHref')
  })
})
