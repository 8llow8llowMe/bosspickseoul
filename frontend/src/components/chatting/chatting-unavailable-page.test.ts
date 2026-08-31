import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ChattingUnavailablePage from './chatting-unavailable-page'

describe('chatting unavailable state', () => {
  it.each([
    ['list', undefined, '채팅 서비스'],
    ['room', 17, '채팅방 17'],
  ] as const)(
    'renders the %s variant with a user-facing reason and exits',
    (variant, roomId, heading) => {
      const markup = renderToStaticMarkup(
        createElement(ChattingUnavailablePage, { variant, roomId }),
      )

      expect(markup).toContain(heading)
      expect(markup).toContain('준비되면 이 화면에서 바로')
      expect(markup).toContain('href="/community/list"')
      expect(markup).toContain('href="/"')
      expect(markup).not.toContain('textarea')
      expect(markup).not.toContain('button')
    },
  )

  it('never exposes our backlog to the reader', () => {
    const markup = renderToStaticMarkup(
      createElement(ChattingUnavailablePage, { variant: 'list' }),
    )

    for (const internal of [
      'V2 API',
      'REST',
      'STOMP',
      'FCM',
      '백엔드',
      '계약',
    ]) {
      expect(markup).not.toContain(internal)
    }
  })
})
