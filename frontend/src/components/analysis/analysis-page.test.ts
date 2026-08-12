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

  // 소스 계약: AiReportPanel은 이제 selection을 그대로 받아 AI 상태·재시도·결과
  // 링크를 AiReportBody(공유 본문)에서 직접 소유한다. 구 aiReportHref/createAiReportHref
  // 배선은 패널이 모달로 대체되며 제거됐다 — 라벨 계약은 ai-report-panel.test.ts에서 검증한다.
  it('analysis-page는 패널에 selection을 넘긴다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./analysis-page.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain('selection={selection}')
    expect(src).not.toContain('createAiReportHref')
  })
})
