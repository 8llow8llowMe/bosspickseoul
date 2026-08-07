import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  CommercialReportBlocks,
  RegionReportBlocks,
} from '@/components/analysis/ai-report/report-blocks'

describe('CommercialReportBlocks', () => {
  it('헤드라인·강점·주의·추천실행 항목을 노출한다', () => {
    const markup = renderToStaticMarkup(
      createElement(CommercialReportBlocks, {
        view: {
          headline: { summary: '한 줄 요약', insight: '창업 코멘트' },
          strengths: ['유동 많음'],
          risks: ['임대료 높음'],
          actions: [{ title: '추천 업종군', items: ['카페'] }],
          generatedAt: '2026-08-07',
        },
      }),
    )
    expect(markup).toContain('한 줄 요약')
    expect(markup).toContain('창업 코멘트')
    expect(markup).toContain('유동 많음')
    expect(markup).toContain('임대료 높음')
    expect(markup).toContain('추천 업종군')
    expect(markup).toContain('카페')
  })
})

describe('RegionReportBlocks', () => {
  it('요약·시장상태·추천/주의 업종군을 노출한다', () => {
    const markup = renderToStaticMarkup(
      createElement(RegionReportBlocks, {
        view: {
          headline: { summary: '시장 요약', marketStatus: '성장' },
          recommended: ['카페'],
          caution: ['편의점'],
          insight: '코멘트',
          generatedAt: '2026-08-07',
        },
      }),
    )
    expect(markup).toContain('시장 요약')
    expect(markup).toContain('성장')
    expect(markup).toContain('카페')
    expect(markup).toContain('편의점')
  })
})
