import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SimulationSaveState } from '@/lib/simulation/use-simulation-save'
import type { SimulationReportRequest } from '@/types/simulation'

/**
 * 세션 상태를 목으로 갈아끼운다.
 *
 * `useAuthStore.setState()` 로는 안 된다 — zustand 의 `useStore` 는 서버 렌더에서
 * `getServerSnapshot` 으로 **생성 시점의 초기 상태**를 읽으므로, `renderToStaticMarkup`
 * 앞에서 setState 를 해도 렌더에 반영되지 않는다(항상 비로그인·미판정으로 그려진다).
 */
const authState = vi.hoisted(() => ({
  current: { hasHydrated: false, isLoggedIn: false },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: typeof authState.current) => unknown) =>
    selector(authState.current),
}))

const { default: SimulationSaveButton, SimulationSaveFeedback } =
  await import('@/components/simulation/report/simulation-save-button')
const { useSimulationSave } =
  await import('@/lib/simulation/use-simulation-save')

const request: SimulationReportRequest = {
  franchisee: false,
  districtCode: '11740',
  serviceCode: 'CS100001',
  storeSize: 66,
  floorType: 'FIRST_FLOOR',
}

const state = (
  overrides: Partial<SimulationSaveState> = {},
): SimulationSaveState => ({
  hasHydrated: true,
  needsLogin: false,
  saved: false,
  isPending: false,
  error: null,
  save: () => {},
  ...overrides,
})

const renderButton = (
  overrides: Partial<SimulationSaveState> = {},
  currentHref = '/simulation/report?districtCode=11740',
) =>
  renderToStaticMarkup(
    createElement(SimulationSaveButton, {
      state: state(overrides),
      currentHref,
      size: 'large',
    }),
  )

const renderFeedback = (overrides: Partial<SimulationSaveState> = {}) =>
  renderToStaticMarkup(
    createElement(SimulationSaveFeedback, {
      state: state(overrides),
      offset: 'top',
    }),
  )

beforeEach(() => {
  authState.current = { hasHydrated: false, isLoggedIn: false }
})

describe('SimulationSaveButton', () => {
  it('로그인이 필요하면 지금 위치를 들고 로그인으로 보낸다', () => {
    const html = renderButton(
      { needsLogin: true },
      '/simulation/report?districtCode=11740',
    )

    expect(html).toContain('저장하려면 로그인')
    expect(html).toContain(
      `href="/login?redirect=${encodeURIComponent('/simulation/report?districtCode=11740')}"`,
    )
  })

  it('로그인 상태면 저장 버튼을 준다', () => {
    const html = renderButton()

    expect(html).toContain('결과 저장')
    expect(html).not.toContain('disabled=""')
  })

  it('세션 판정 전에는 누를 수 없다 — 눌리면 비로그인 저장이 401 로 떨어진다', () => {
    const html = renderButton({ hasHydrated: false })

    expect(html).not.toContain('저장하려면 로그인')
    expect(html).toContain('disabled=""')
  })

  it('저장하면 `저장됨` 으로 잠근다 — 같은 조건을 두 번 저장하지 않게', () => {
    const html = renderButton({ saved: true })

    expect(html).toContain('저장됨')
    expect(html).toContain('disabled=""')
  })

  it('삭제·공유 버튼을 그리지 않는다', () => {
    // 삭제는 프로필의 저장 목록 소관이고, 공유는 ShareTargetType 에 상수가 없다.
    const html = renderButton()

    expect(html).not.toContain('삭제')
    expect(html).not.toContain('공유')
  })
})

describe('SimulationSaveFeedback (R12)', () => {
  it('저장하면 status 영역으로 알리고 저장 목록 링크를 준다', () => {
    const html = renderFeedback({ saved: true })

    expect(html).toMatch(/<p[^>]*role="status"[^>]*>저장했어요 · <a/)
    expect(html).toContain('href="/profile/bookmarks/simulation"')
    expect(html).toContain('저장 목록 보기')
  })

  it('저장 전에도 빈 status 영역을 둔다 — 영역째 새로 붙이면 읽지 않는 낭독기가 있다', () => {
    const html = renderFeedback()

    expect(html).toMatch(/<p[^>]*role="status"[^>]*><\/p>/)
    expect(html).not.toContain('role="alert"')
  })

  it('세션이 풀린 채 저장하면 다시 로그인하라고 알린다', () => {
    const html = renderFeedback({
      needsLogin: true,
      error: {
        kind: 'unauthorized',
        status: 401,
        code: null,
        message: 'Unauthorized',
        fieldErrors: [],
      },
    })

    expect(html).toContain('role="alert"')
    expect(html).toContain(
      '로그인이 풀렸어요. 다시 로그인하면 저장할 수 있어요.',
    )
  })
})

describe('useSimulationSave', () => {
  const Probe = () => {
    const save = useSimulationSave(request, 23_450)
    return createElement(
      'output',
      null,
      JSON.stringify({ needsLogin: save.needsLogin, saved: save.saved }),
    )
  }

  const renderProbe = () =>
    renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(Probe),
      ),
    )

  it('세션 판정 뒤 비로그인이면 로그인 유도로 간다', () => {
    authState.current = { hasHydrated: true, isLoggedIn: false }
    expect(renderProbe()).toContain('{&quot;needsLogin&quot;:true')
  })

  it('세션 판정 전에는 로그인 유도를 먼저 그리지 않는다', () => {
    // hasHydrated 전에 '저장하려면 로그인'을 그리면 로그인한 사용자에게 한 프레임 깜빡인다.
    authState.current = { hasHydrated: false, isLoggedIn: false }
    expect(renderProbe()).toContain('{&quot;needsLogin&quot;:false')
  })

  it('로그인 사용자는 저장 전 상태로 시작한다', () => {
    authState.current = { hasHydrated: true, isLoggedIn: true }
    expect(renderProbe()).toContain(
      '{&quot;needsLogin&quot;:false,&quot;saved&quot;:false}',
    )
  })
})
