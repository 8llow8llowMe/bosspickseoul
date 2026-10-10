import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

const resolveShareLink = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))
vi.mock('@/lib/api/share', () => ({ resolveShareLink }))

const { default: ShareEntryPage } =
  await import('@/components/share/share-entry-page')

const render = (shareCode: string) =>
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(ShareEntryPage, { shareCode }),
    ),
  )

describe('ShareEntryPage 공유 코드 형식', () => {
  it.each(['..', 'A'.repeat(17), 'a%2Fb'])(
    '형식이 아닌 코드(%s)는 해석하지 않고 미존재로 안내한다',
    code => {
      const markup = render(code)

      expect(markup).toContain('존재하지 않는 공유 링크예요')
      expect(markup).not.toContain('여는 중')
      expect(resolveShareLink).not.toHaveBeenCalled()
    },
  )

  it('형식이 맞으면 해석을 기다린다', () => {
    expect(render('7GFPfbs3')).toContain('공유된 분석 화면을 여는 중이에요')
  })
})
