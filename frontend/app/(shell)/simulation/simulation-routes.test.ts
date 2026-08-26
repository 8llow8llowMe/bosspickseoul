import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/** 마법사 라우트 — placeholder를 떼고 입력 마법사를 붙였다. */
const wizardRouteFiles = [
  './page.tsx',
  '../analysis/simulation/page.tsx',
] as const

/** 리포트·비교 라우트 — 다음 슬라이스 대상이라 아직 준비 중 화면이다. */
const pendingRouteFiles = [
  './report/page.tsx',
  './compare/page.tsx',
  '../analysis/simulation/report/page.tsx',
  '../analysis/simulation/compare/page.tsx',
] as const

const readRoute = (routeFile: string) =>
  readFileSync(fileURLToPath(new URL(routeFile, import.meta.url)), 'utf8')

describe('simulation route adapters', () => {
  it.each(wizardRouteFiles)('%s renders the V2 input wizard', routeFile => {
    const source = readRoute(routeFile)

    expect(source).toContain('SimulationWizardPage')
    expect(source).not.toContain('SimulationUnavailablePage')
    // useSearchParams를 쓰는 클라이언트 컴포넌트라 Suspense 경계가 필요하다.
    expect(source).toContain('Suspense')
    // 마법사는 V1 폼 컴포넌트를 되살리지 않는다.
    expect(source).not.toContain('SimulationFormPage')
    expect(source).not.toContain('RequireAuth')
  })

  it('/analysis/simulation은 분석 컨텍스트 variant로 렌더한다', () => {
    expect(readRoute('../analysis/simulation/page.tsx')).toContain(
      'variant="analysis"',
    )
  })

  it.each(pendingRouteFiles)('%s uses the V2 API waiting state', routeFile => {
    const source = readRoute(routeFile)

    expect(source).toContain('SimulationUnavailablePage')
    expect(source).not.toContain('SimulationReportPage')
    expect(source).not.toContain('SimulationComparePage')
    expect(source).not.toContain('RequireAuth')
    expect(source).toContain('V2 API 계약 준비 상태')
  })
})
