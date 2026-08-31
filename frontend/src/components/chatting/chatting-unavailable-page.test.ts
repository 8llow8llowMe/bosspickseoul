import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ChattingUnavailablePage from './chatting-unavailable-page'

/**
 * 이 화면이 지켜야 하는 것은 「무엇을 보여주는가」보다 **「무엇을 보여주지 않는가」**다.
 * 예전 테스트는 정반대로 `V2 API`·`REST`·`STOMP`·`FCM` 이 마크업에 **들어 있는지**를
 * 단언해서, 내부 백로그 노출을 오히려 지키고 있었다.
 *
 * 마크업만 봐서는 부족하다 — 같은 문구가 라우트의 `metadata.description` 에도 있었고
 * 그쪽은 OG 카드로 새어 나간다. 그래서 라우트 소스도 함께 못 박는다(`analysis-map-shell.
 * route.test.ts` 의 소스 계약 테스트와 같은 방식이다 — `generateMetadata` 가 async 라
 * import 해서 부르는 것보다 소스를 읽는 편이 단순하다).
 */
const internalCopy = ['V2 API', 'REST', 'STOMP', 'FCM', '백엔드', '계약']

const routeSources = [
  '../../../app/(shell)/chatting/list/page.tsx',
  '../../../app/(shell)/chatting/[roomId]/page.tsx',
]

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

      for (const internal of internalCopy) {
        expect(markup).not.toContain(internal)
      }
    },
  )

  it.each(routeSources)(
    'never leaks our backlog through %s metadata',
    source => {
      const contents = readFileSync(
        fileURLToPath(new URL(source, import.meta.url)),
        'utf8',
      )

      for (const internal of internalCopy) {
        expect(contents).not.toContain(internal)
      }
    },
  )
})
