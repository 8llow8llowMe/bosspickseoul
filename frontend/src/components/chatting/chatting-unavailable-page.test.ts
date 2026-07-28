import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ChattingUnavailablePage from './chatting-unavailable-page'

describe('chatting V2 API waiting state', () => {
  it.each([
    ['list', undefined, '채팅 서비스'],
    ['room', 17, '채팅방 17'],
  ] as const)(
    'renders the %s variant with backend dependencies',
    (variant, roomId, heading) => {
      const markup = renderToStaticMarkup(
        createElement(ChattingUnavailablePage, { variant, roomId }),
      )

      expect(markup).toContain(heading)
      expect(markup).toContain('V2 API')
      expect(markup).toContain('REST')
      expect(markup).toContain('STOMP')
      expect(markup).toContain('FCM')
      expect(markup).toContain('href="/community/list"')
      expect(markup).toContain('href="/"')
      expect(markup).not.toContain('textarea')
      expect(markup).not.toContain('button')
    },
  )
})
