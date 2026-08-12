import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('AiReportPanel', () => {
  it('패널은 크게보기 버튼과 AiReportBody(compact) + 모달을 렌더한다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./ai-report-panel.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain('크게보기')
    expect(src).toContain('AiReportBody')
    expect(src).toContain('variant="compact"')
    expect(src).toContain('AnalysisResultModalSurface')
    expect(src).not.toContain('createAiReportHref') // CTA 대체됨
  })
})
