import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AiReportPanel from '@/components/analysis/ai-report/ai-report-panel'
import type { AiReportState } from '@/hooks/use-ai-report'

const render = (state: AiReportState, extra = {}) =>
  renderToStaticMarkup(
    createElement(AiReportPanel, {
      targetName: '삼평동',
      state,
      onClose: () => {},
      onRetry: () => {},
      ...extra,
    }),
  )

describe('AiReportPanel', () => {
  it('loading 상태는 생성 중 문구를 노출한다', () => {
    expect(
      render({ status: 'loading', stage: null, progressMessages: [] }),
    ).toContain('리포트를 생성')
  })

  it('error 상태는 메시지와 다시 시도 버튼을 노출한다', () => {
    const markup = render({
      status: 'error',
      message: '실패함',
      errorKind: 'generic',
      canRetry: true,
    })
    expect(markup).toContain('실패함')
    expect(markup).toContain('다시 시도')
  })

  it('empty 상태는 안내 문구를 노출한다', () => {
    expect(render({ status: 'empty' })).toContain('표시할 내용')
  })

  it('ready-region 상태는 지역 블록을 렌더한다', () => {
    const markup = render({
      status: 'ready-region',
      view: {
        headline: { summary: '시장 요약', marketStatus: '성장' },
        recommended: ['카페'],
        caution: [],
        insight: '코멘트',
        generatedAt: '',
      },
    })
    expect(markup).toContain('시장 요약')
    expect(markup).toContain('카페')
  })

  it('전체 분석 링크는 onViewFullAnalysis가 있을 때만 노출한다', () => {
    expect(
      render({ status: 'loading', stage: null, progressMessages: [] }),
    ).not.toContain('전체 분석 보기')
    expect(
      render(
        { status: 'loading', stage: null, progressMessages: [] },
        { onViewFullAnalysis: () => {} },
      ),
    ).toContain('전체 분석 보기')
  })

  it('onViewFullAnalysis가 없으면 안내 문구를, 있으면 버튼만 보여준다', () => {
    const withoutHandler = render({
      status: 'loading',
      stage: null,
      progressMessages: [],
    })
    expect(withoutHandler).toContain(
      '분야까지 선택하면 전체 분석을 볼 수 있어요',
    )
    expect(withoutHandler).not.toContain('전체 분석 보기')

    const withHandler = render(
      { status: 'loading', stage: null, progressMessages: [] },
      { onViewFullAnalysis: () => {} },
    )
    expect(withHandler).toContain('전체 분석 보기')
    expect(withHandler).not.toContain(
      '분야까지 선택하면 전체 분석을 볼 수 있어요',
    )
  })
})
