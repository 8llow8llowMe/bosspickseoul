import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('AiReportBody', () => {
  it('본문은 selection+variant를 받고 흰 배경과 세 섹션을 렌더한다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./ai-report-body.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain("variant?: 'full' | 'compact'")
    expect(src).toContain('var(--color-surface)')
    expect(src).toContain('ReportMetricCards')
    expect(src).toContain('ReportChartSection')
    expect(src).toContain('ReportInsightSection')
    expect(src).toContain('useAiReport')
  })
  it('전용 페이지 뷰는 본문을 AiReportBody에 위임한다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./ai-report-page-view.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain('AiReportBody')
    expect(src).not.toContain('useAiReport') // 로직이 본문으로 이동
  })
})
