import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import HomePage from '@/components/home/home-page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
  }),
}))

describe('HomePage', () => {
  it('히어로 + 재설계된 3부(앵커/스토리/벤토)를 렌더한다', () => {
    const html = renderToStaticMarkup(createElement(HomePage))
    const text = html.replace(/<[^>]+>/g, '')

    expect(text).toContain('창업 전에, 상권부터 확인하세요.') // 히어로 유지
    expect(text).toContain('감에 의존하지 마세요.') // ① 앵커
    expect(text).toContain('현황 확인') // ② 스토리 스텝
    expect(text).toContain('AI 리포트') // ③ 벤토
    expect(html).toContain('대표 예시 데이터')
  })

  it('CTA 라우트를 렌더하고 레거시 브랜드/이미지가 없다', () => {
    const html = renderToStaticMarkup(createElement(HomePage))
    for (const href of ['/register', '/analysis']) {
      expect(html).toContain(`href="${href}"`)
    }
    expect(html).not.toContain('NowDoBoss')
    expect(html).not.toContain('<img')
  })
})
