import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import ProfileSessionsPage, {
  ProfileSessionCards,
} from '@/components/profile/profile-sessions-page'
import {
  CURRENT_SESSION_NOTICE,
  SESSION_REVOKE_NOTICE,
} from '@/lib/auth/device-session'
import type { AuthSessionItem } from '@/types/auth'

const session = (patch: Partial<AuthSessionItem> = {}): AuthSessionItem => ({
  sessionId: 'session-1',
  deviceInfo:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  createdAt: '2026-09-02T10:04:23',
  lastUsedAt: '2026-09-05T18:20:00',
  current: false,
  ...patch,
})

const renderCards = (sessions: readonly AuthSessionItem[]) =>
  renderToStaticMarkup(
    createElement(ProfileSessionCards, { sessions, onRevoke: vi.fn() }),
  )

describe('ProfileSessionCards', () => {
  it('기기 이름과 두 시각을 함께 보여 준다', () => {
    const html = renderCards([session()])

    expect(html).toContain('Chrome · macOS')
    expect(html).toContain('마지막 사용')
    expect(html).toContain('로그인')
  })

  /*
   * 현재 기기를 해제하면 화면에는 로그인 상태로 남은 채 세션만 끊긴 반쯤 로그인된
   * 상태가 된다. 버튼을 아예 두지 않고 로그아웃으로 보낸다.
   */
  it('현재 기기에는 해제 버튼 대신 안내를 둔다', () => {
    const html = renderCards([session({ current: true })])

    expect(html).toContain('현재 기기')
    expect(html).toContain(CURRENT_SESSION_NOTICE)
    expect(html).not.toContain('>해제<')
  })

  it('다른 기기에는 해제 버튼을 둔다', () => {
    const html = renderCards([session({ current: false })])

    expect(html).toContain('>해제<')
    expect(html).not.toContain('현재 기기')
  })

  it('여러 기기를 각각의 행으로 그린다', () => {
    const html = renderCards([
      session({ sessionId: 'a', current: true }),
      session({
        sessionId: 'b',
        deviceInfo:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      }),
    ])

    expect(html).toContain('data-session-id="a"')
    expect(html).toContain('data-session-id="b"')
    expect(html).toContain('Safari · iPhone')
  })
})

describe('ProfileSessionsPage', () => {
  it('불러오는 동안 빈 화면 대신 진행 상태를 알린다', () => {
    const html = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(ProfileSessionsPage),
      ),
    )

    expect(html).toContain('로그인한 기기를 불러오는 중입니다')
  })
})

describe('해제 안내 문구', () => {
  /*
   * 백엔드는 refresh 세션만 지운다 — 그 기기의 access 토큰은 만료까지 살아 있다.
   * 즉시성을 약속하면 해제 직후에도 동작하는 기기를 사용자가 배신으로 읽는다.
   */
  it('즉시 끊긴다고 약속하지 않는다', () => {
    expect(SESSION_REVOKE_NOTICE).toContain('즉시 끊기지는 않아요')
    expect(SESSION_REVOKE_NOTICE).not.toContain('바로 로그아웃')
  })
})
