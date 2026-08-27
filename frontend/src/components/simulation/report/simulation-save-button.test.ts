import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

const { default: SimulationSaveButton } =
  await import('@/components/simulation/report/simulation-save-button')

const request: SimulationReportRequest = {
  franchisee: false,
  districtCode: '11740',
  serviceCode: 'CS100001',
  storeSize: 66,
  floorType: 'FIRST_FLOOR',
}

const render = (currentHref = '/simulation/report?districtCode=11740') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(SimulationSaveButton, {
        request,
        totalPrice: 23_450,
        currentHref,
      }),
    ),
  )
}

beforeEach(() => {
  authState.current = { hasHydrated: false, isLoggedIn: false }
})

describe('SimulationSaveButton', () => {
  it('비로그인이면 지금 위치를 들고 로그인으로 보낸다', () => {
    authState.current = { hasHydrated: true, isLoggedIn: false }

    const html = render('/simulation/report?districtCode=11740')

    expect(html).toContain('저장하려면 로그인')
    expect(html).toContain(
      `href="/login?redirect=${encodeURIComponent('/simulation/report?districtCode=11740')}"`,
    )
  })

  it('로그인 상태면 저장 버튼을 준다', () => {
    authState.current = { hasHydrated: true, isLoggedIn: true }

    const html = render()

    expect(html).toContain('결과 저장')
    expect(html).not.toContain('disabled=""')
  })

  it('세션 판정 전에는 로그인 유도를 먼저 그리지 않는다', () => {
    // hasHydrated 전에 '저장하려면 로그인'을 그리면 로그인한 사용자에게 한 프레임 깜빡인다.
    authState.current = { hasHydrated: false, isLoggedIn: false }

    const html = render()

    expect(html).not.toContain('저장하려면 로그인')
    // 판정 전에는 누를 수도 없어야 한다 — 눌리면 비로그인 저장이 401 로 떨어진다.
    expect(html).toContain('disabled=""')
  })

  it('삭제·공유 버튼을 그리지 않는다', () => {
    // 삭제 API 가 없고 ShareTargetType 에 시뮬레이션 상수가 없다 (G13).
    authState.current = { hasHydrated: true, isLoggedIn: true }
    const html = render()

    expect(html).not.toContain('삭제')
    expect(html).not.toContain('공유')
  })
})
