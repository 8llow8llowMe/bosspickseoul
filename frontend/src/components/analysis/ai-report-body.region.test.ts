import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

/*
 * 자치구·행정동 리포트에 남아 있는 업종이 새지 않는다(#562 리뷰).
 *
 * 지역을 바꿔도 업종을 URL 에 남기므로 자치구 선택에도 `serviceCode` 가 있을 수 있다.
 * 지역 리포트는 그 업종을 표시하지도, 쿼리 키에 싣지도 않아야 한다.
 */

vi.mock('@/hooks/use-resolved-analysis-period', () => ({
  useResolvedAnalysisPeriod: () => ({
    periodCode: '20261',
    catalog: { isUnavailable: false, refetch: () => undefined },
  }),
}))

import AiReportBody from '@/components/analysis/ai-report-body'
import ReportInsightSection from '@/components/analysis/ai-report/report-insight-section'
import { resolveAiReportServiceCode } from '@/lib/analysis/ai-report-presentation'
import type { AnalysisSelection } from '@/lib/analysis/selection'

const districtWithService: AnalysisSelection = {
  districtCode: '11440',
  administrationCode: null,
  commercialCode: null,
  serviceCode: 'CS100001',
  periodCode: null,
}

/* SSR 렌더라 인증 저장소는 초기값(미하이드레이트)이다. 쿼리 키는 요청 여부와 상관없이 만들어진다. */
const renderBody = (selection: AnalysisSelection) => {
  const client = new QueryClient()
  const markup = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AiReportBody, { selection, title: '마포구' }),
    ),
  )
  const submitKeys = client
    .getQueryCache()
    .findAll({ queryKey: ['ai-report', 'submit'] })
    .map(query => query.queryKey)
  return { markup, submitKeys }
}

describe('resolveAiReportServiceCode', () => {
  it('상권 레벨에서만 업종을 쓴다', () => {
    expect(resolveAiReportServiceCode('commercial', 'CS100001')).toBe(
      'CS100001',
    )
    expect(resolveAiReportServiceCode('district', 'CS100001')).toBeNull()
    expect(resolveAiReportServiceCode('administration', 'CS100001')).toBeNull()
    expect(resolveAiReportServiceCode(null, 'CS100001')).toBeNull()
  })
})

describe('AiReportBody — 지역 레벨과 남은 업종', () => {
  it('자치구 리포트에 「업종 ·」 머리글을 붙이지 않는다', () => {
    const { markup } = renderBody(districtWithService)
    expect(markup).toContain('마포구')
    expect(markup).not.toContain('업종 ·')
  })

  it('자치구 리포트 쿼리 키에 업종이 없다 (업종별로 캐시가 갈리지 않는다)', () => {
    const { submitKeys } = renderBody(districtWithService)
    expect(submitKeys).toHaveLength(1)
    expect(submitKeys[0]).toEqual([
      'ai-report',
      'submit',
      'district',
      '11440',
      null,
      null,
      '20261',
    ])
  })

  it('상권 리포트는 업종을 머리글과 쿼리 키에 싣는다', () => {
    const { markup, submitKeys } = renderBody({
      ...districtWithService,
      administrationCode: '11440660',
      commercialCode: '3110565',
    })
    expect(markup).toContain('업종 ·')
    expect(submitKeys[0]).toContain('CS100001')
  })
})

describe('ReportInsightSection 잠금 카드 레벨 (#586)', () => {
  const renderLocked = (level: 'district' | 'administration' | 'commercial') =>
    renderToStaticMarkup(
      createElement(ReportInsightSection, {
        mode: 'locked',
        state: { status: 'idle' },
        loginHref: '/login',
        onRetry: () => undefined,
        level,
      }),
    )

  it('자치구·행정동 게스트는 지역 샘플을 흐리게 본다', () => {
    for (const level of ['district', 'administration'] as const) {
      const markup = renderLocked(level)
      expect(markup).toContain('동별 편차가 크므로')
      expect(markup).not.toContain('배후 직장인 밀집')
    }
  })

  it('상권 게스트는 상권 샘플을 본다', () => {
    expect(renderLocked('commercial')).toContain('배후 직장인 밀집')
  })

  it('AiReportBody 가 자기 레벨을 넘긴다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./ai-report-body.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toMatch(/<ReportInsightSection[\s\S]*?level=\{level\}/)
  })
})
