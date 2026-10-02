import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import HeroWindow from '@/components/home/hero-window'

const render = (chrome: boolean) =>
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(HeroWindow, {
        state: 'open',
        onClose: () => undefined,
        onToggleMinimize: () => undefined,
        pickedCode: null,
        onPick: () => undefined,
        chrome,
      }),
    ),
  )

/**
 * 창 장식은 시험 적용으로 숨겼다(hero-split-layout.md D4-2). 「상수 하나로 되돌린다」는 약속이
 * 깨지지 않게, 켰을 때 장식이 그대로 돌아오는지 잠근다.
 */
describe('HeroWindow 창 장식', () => {
  it('chrome 을 끄면 제목줄과 조작 그룹이 없다', () => {
    const html = render(false)

    expect(html).not.toContain('서울 상권 데이터 분석')
    expect(html).not.toContain('aria-label="분석 창 조작"')
  })

  it('chrome 을 켜면 제목줄·닫기·접기·창 확대가 돌아온다', () => {
    const html = render(true)

    expect(html).toContain('서울 상권 데이터 분석')
    expect(html).toContain('aria-label="분석 창 조작"')
    expect(html).toContain('aria-label="분석 창 닫고 지도 보기"')
    expect(html).toContain('aria-label="분석 창 접기"')
    expect(html).toContain('aria-label="상권 분석 시작(전체 화면)"')
  })
})
