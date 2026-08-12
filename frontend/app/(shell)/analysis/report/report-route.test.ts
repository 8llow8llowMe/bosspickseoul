import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('analysis/report route', () => {
  it('page.tsx는 metadata path와 Suspense를 갖는다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./page.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain("path: '/analysis/report'")
    expect(src).toContain('Suspense')
    expect(src).toContain('AiReportPage')
  })
})
