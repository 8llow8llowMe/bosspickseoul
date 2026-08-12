import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('ReportMetricCards variant', () => {
  it('variant prop과 compact 2열 분기를 노출한다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./report-metric-cards.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain("variant?: 'full' | 'compact'")
    expect(src).toContain('$variant')
    expect(src).toContain("'repeat(2, minmax(0, 1fr))'")
  })
})
