import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import SimulationSavedResultsLink, {
  SIMULATION_SAVED_RESULTS_HREF,
} from '@/components/simulation/simulation-saved-results-link'

const authBox = vi.hoisted(() => ({
  current: { hasHydrated: true, isLoggedIn: false },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector(authBox.current),
}))

const render = (auth: { hasHydrated: boolean; isLoggedIn: boolean }) => {
  authBox.current = auth
  return renderToStaticMarkup(createElement(SimulationSavedResultsLink))
}

describe('SimulationSavedResultsLink (B12)', () => {
  it('로그인 사용자에게 프로필 저장 목록 링크를 준다', () => {
    const markup = render({ hasHydrated: true, isLoggedIn: true })

    expect(markup).toContain('저장한 결과')
    expect(markup).toContain(`href="${SIMULATION_SAVED_RESULTS_HREF}"`)
  })

  it('비로그인 사용자에게는 그리지 않는다', () => {
    expect(render({ hasHydrated: true, isLoggedIn: false })).toBe('')
  })

  it('세션 복원 전에는 그리지 않는다 — 그렸다가 뒤집히면 깜빡인다', () => {
    expect(render({ hasHydrated: false, isLoggedIn: true })).toBe('')
  })
})
