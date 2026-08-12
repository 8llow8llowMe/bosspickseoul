import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('ReportChartSection variant', () => {
  it('variant로 차트 height를 낮춘다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./report-chart-section.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain("variant?: 'full' | 'compact'")
    expect(src).toContain('160')
  })
})
