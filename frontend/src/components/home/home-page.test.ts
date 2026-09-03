import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import HomePage from '@/components/home/home-page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
  }),
}))

/**
 * 홈은 「지금 많이 본 지역」(라이브 순위) 이후 react-query 를 쓴다. 실제 앱은
 * 루트 `AppProviders` 가 클라이언트를 공급하므로, 테스트도 같은 전제를 세운다.
 * 캐시를 비워 두면 그 섹션은 스켈레톤 단계라 아래 단언에 끼어들지 않는다.
 */
const render = () =>
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(HomePage),
    ),
  )

describe('HomePage', () => {
  it('히어로 + 재설계된 3부(앵커/스토리/벤토)를 렌더한다', () => {
    const html = render()
    const text = html.replace(/<[^>]+>/g, '')

    expect(text).toContain('창업 전에, 상권부터 확인하세요.') // 히어로 유지
    expect(text).toContain('감에 의존하지 마세요.') // ① 앵커
    expect(text).toContain('현황 확인') // ② 스토리 스텝
    expect(text).toContain('AI 리포트') // ③ 벤토
    expect(html).toContain('대표 예시 데이터')
  })

  it('CTA 라우트를 렌더하고 레거시 브랜드/이미지가 없다', () => {
    const html = render()
    for (const href of ['/register', '/analysis']) {
      expect(html).toContain(`href="${href}"`)
    }
    expect(html).not.toContain('NowDoBoss')
    expect(html).not.toContain('<img')
  })
})
