import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/** 조건 입력 라우트 — placeholder를 떼고 단일 화면 2단 입력을 붙였다. */
const builderRouteFiles = [
  './page.tsx',
  '../analysis/simulation/page.tsx',
] as const

/** 리포트 라우트 — placeholder를 떼고 상세 리포트 화면을 붙였다. */
const reportRouteFiles = [
  './report/page.tsx',
  '../analysis/simulation/report/page.tsx',
] as const

/** 비교 라우트 — placeholder를 떼고 A/B 비교 화면을 붙였다(B3). */
const compareRouteFiles = [
  './compare/page.tsx',
  '../analysis/simulation/compare/page.tsx',
] as const

const readRoute = (routeFile: string) =>
  readFileSync(fileURLToPath(new URL(routeFile, import.meta.url)), 'utf8')

describe('simulation route adapters', () => {
  it.each(builderRouteFiles)(
    '%s renders the V2 condition builder',
    routeFile => {
      const source = readRoute(routeFile)

      expect(source).toContain('SimulationBuilderPage')
      expect(source).not.toContain('SimulationUnavailablePage')
      // useSearchParams를 쓰는 클라이언트 컴포넌트라 Suspense 경계가 필요하다.
      expect(source).toContain('Suspense')
      // 입력 화면은 V1 폼 컴포넌트를 되살리지 않는다.
      expect(source).not.toContain('SimulationFormPage')
      expect(source).not.toContain('RequireAuth')
    },
  )

  it('/analysis/simulation은 분석 컨텍스트 variant로 렌더한다', () => {
    expect(readRoute('../analysis/simulation/page.tsx')).toContain(
      'variant="analysis"',
    )
  })

  it.each(reportRouteFiles)('%s renders the V2 report page', routeFile => {
    const source = readRoute(routeFile)

    expect(source).toContain('SimulationReportPage')
    expect(source).not.toContain('SimulationUnavailablePage')
    // useSearchParams를 쓰는 클라이언트 컴포넌트라 Suspense 경계가 필요하다.
    expect(source).toContain('Suspense')
    expect(source).not.toContain('RequireAuth')
  })

  it('/analysis/simulation/report는 분석 컨텍스트 variant로 렌더한다', () => {
    expect(readRoute('../analysis/simulation/report/page.tsx')).toContain(
      'variant="analysis"',
    )
  })

  it.each(compareRouteFiles)('%s renders the V2 compare page', routeFile => {
    const source = readRoute(routeFile)

    expect(source).toContain('SimulationComparePage')
    expect(source).not.toContain('SimulationUnavailablePage')
    // useSearchParams를 쓰는 클라이언트 컴포넌트라 Suspense 경계가 필요하다.
    expect(source).toContain('Suspense')
    // 비교는 저장과 달리 인증이 필요 없다 — 리포트 계산 자체가 공개 API 다.
    expect(source).not.toContain('RequireAuth')
    // "준비 중" 문구가 남아 있으면 라우트를 반만 교체한 것이다.
    expect(source).not.toContain('V2 API 계약 준비 상태')
  })

  it('/analysis/simulation/compare는 분석 컨텍스트 variant로 렌더한다', () => {
    expect(readRoute('../analysis/simulation/compare/page.tsx')).toContain(
      'variant="analysis"',
    )
  })
})
