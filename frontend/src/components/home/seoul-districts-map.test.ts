import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import SeoulDistrictsMap from '@/components/home/seoul-districts-map'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined }),
}))

const render = (props: Parameters<typeof SeoulDistrictsMap>[0] = {}) =>
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(SeoulDistrictsMap, { key: 'map', ...props }),
    ),
  )

const pathOf = (html: string, name: string) =>
  html.match(new RegExp(`<path[^>]*aria-label="${name}"[^>]*>`))?.[0] ?? ''

/**
 * 히어로 지도(hero-picker-and-mobile-first-screen.md D4-4·D4-5).
 */
describe('SeoulDistrictsMap', () => {
  it('데스크톱(활성화 콜백 없음)은 폴리곤이 링크다', () => {
    const path = pathOf(render(), '마포구')

    expect(path).toContain('role="link"')
    expect(path).not.toContain('aria-pressed')
  })

  it('모바일(활성화 콜백 있음)은 이동하지 않는 버튼이고 선택을 알린다', () => {
    const html = render({
      onDistrictActivate: () => undefined,
      selectedCode: '11440',
    })

    expect(pathOf(html, '마포구')).toContain('role="button"')
    expect(pathOf(html, '마포구')).toContain('aria-pressed="true"')
    expect(pathOf(html, '강남구')).toContain('aria-pressed="false"')
  })

  it('지도 설명 캡션을 svg 에 잇는다', () => {
    const html = render()
    const describedBy = html.match(/<svg[^>]*aria-describedby="([^"]+)"/)?.[1]

    expect(describedBy).toBeTruthy()
    expect(html).toContain(`id="${describedBy}"`)
    expect(html).toContain('자치구 위에 올리면 시간대별 유동인구가 보이고')
    expect(html).toContain('자치구를 누르면 위 칸에서 바로 골라져요.')
  })
})
