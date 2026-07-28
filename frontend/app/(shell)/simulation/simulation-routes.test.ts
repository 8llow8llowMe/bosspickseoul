import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const routeFiles = [
  './page.tsx',
  './report/page.tsx',
  './compare/page.tsx',
  '../analysis/simulation/page.tsx',
  '../analysis/simulation/report/page.tsx',
  '../analysis/simulation/compare/page.tsx',
] as const

describe('simulation route adapters', () => {
  it.each(routeFiles)('%s uses the V2 API waiting state', routeFile => {
    const source = readFileSync(
      fileURLToPath(new URL(routeFile, import.meta.url)),
      'utf8',
    )

    expect(source).toContain('SimulationUnavailablePage')
    expect(source).not.toContain('SimulationFormPage')
    expect(source).not.toContain('SimulationReportPage')
    expect(source).not.toContain('SimulationComparePage')
    expect(source).not.toContain('RequireAuth')
    expect(source).toContain('V2 API 계약 준비 상태')
  })
})
