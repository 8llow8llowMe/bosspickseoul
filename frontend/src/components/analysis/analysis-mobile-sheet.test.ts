import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisMobileSheet from '@/components/analysis/analysis-mobile-sheet'

describe('AnalysisMobileSheet', () => {
  it('펼친 채로 시작하고 접근 가능한 토글을 제공한다 (#562)', () => {
    const markup = renderToStaticMarkup(
      createElement(
        AnalysisMobileSheet,
        {
          stepLabel: '자치구 선택',
          summary: '서울 전체',
        },
        createElement('div', null, '선택 본문'),
      ),
    )

    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('data-sheet-snap="expanded"')
    expect(markup).toContain('선택 패널 접기')
    expect(markup).toContain('자치구 선택')
    // 첫 화면부터 본문(인기 상권 지름길·추천 링크가 들어가는 자리)이 보조기술에도 열려 있다.
    expect(markup).toContain('aria-hidden="false"')
  })

  it('펼친 높이는 지도에 BOTTOM_SHEET_MINIMUM_MAP_HEIGHT 를 남기는 상한을 쓴다', () => {
    const source = readFileSync(
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        './analysis-mobile-sheet.tsx',
      ),
      'utf-8',
    )
    expect(source).toContain(
      'calc(100% - ${BOTTOM_SHEET_MINIMUM_MAP_HEIGHT}px)',
    )
    expect(source).toContain("useState<BottomSheetSnap>('expanded')")
  })

  it('aiReport가 있으면 선택 뷰에서 진입 칩을 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(
        AnalysisMobileSheet,
        {
          stepLabel: '자치구 선택',
          summary: '서울 전체',
          aiReport: {
            title: '강남구 AI 리포트',
            content: createElement('div', null, 'AI_BODY'),
          },
        },
        createElement('div', null, '선택 본문'),
      ),
    )
    expect(markup).toContain('AI 리포트')
    // 리포트 제목은 리포트 뷰 진입 시에만 핸들행에 노출된다(기본 접힘/선택 뷰엔 없음)
    expect(markup).not.toContain('강남구 AI 리포트')
  })

  it('aiReport가 없으면 진입 칩을 렌더하지 않는다', () => {
    const markup = renderToStaticMarkup(
      createElement(
        AnalysisMobileSheet,
        {
          stepLabel: '자치구 선택',
          summary: '서울 전체',
        },
        createElement('div', null, '선택 본문'),
      ),
    )

    expect(markup).not.toContain('AI 리포트 보기')
  })
})
