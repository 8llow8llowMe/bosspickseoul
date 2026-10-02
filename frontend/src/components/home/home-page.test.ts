import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import HomePage from '@/components/home/home-page'
import { STORY_STEPS } from '@/components/home/story-steps'

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
  it('히어로 + 판단 흐름 + 랭킹 + 벤토를 렌더한다 (TC-HR-008)', () => {
    const text = render().replace(/<[^>]+>/g, '')

    expect(text).toContain('서울 어디에 차려야 할까요?') // 히어로
    expect(text).toContain('이렇게 판단해요') // 판단 흐름
    expect(text).toContain('AI 리포트') // 벤토
  })

  /* 네 도구를 세 번 말하던 보드·앵커가 없다(home-restructure.md D2 #1). */
  it('네 도구 보드와 앵커 문장을 렌더하지 않는다', () => {
    const html = render()

    expect(html).not.toContain('창업할 지역과 업종을 네 단계로 좁힙니다.')
    expect(html).not.toContain('aria-label="네 도구 요약"')
    // 앵커 문장은 단어별 span 이다 — 앵커에만 있는 단어 조각으로 찾는다.
    expect(html).not.toContain('>시뮬레이션은<')
  })

  it('판단 흐름이 벤토보다 앞에 온다', () => {
    const html = render()

    expect(html.indexOf('이렇게 판단해요')).toBeGreaterThan(-1)
    expect(html.indexOf('이렇게 판단해요')).toBeLessThan(
      html.indexOf('분석 이후의 판단까지'),
    )
  })

  /* 판단 흐름 바로 뒤에 그 숫자들의 출처를 둔다(data-sources.md, TC-DS-006). */
  it('데이터 출처가 판단 흐름과 벤토 사이에 온다', () => {
    const html = render()
    const story = html.indexOf('이렇게 판단해요')
    const sources = html.indexOf('판단 근거는 모두 공공데이터에서 가져와요.')

    expect(sources).toBeGreaterThan(story)
    expect(sources).toBeLessThan(html.indexOf('분석 이후의 판단까지'))
  })

  it('CTA 라우트를 렌더하고 레거시 브랜드/이미지가 없다', () => {
    const html = render()
    for (const href of ['/register', '/analysis']) {
      expect(html).toContain(`href="${href}"`)
    }
    expect(html).not.toContain('NowDoBoss')
    expect(html).not.toContain('<img')
  })

  /*
   * TC-004(개정, home-restructure.md D7-3) — 각 탭 패널이 자기 도구 CTA 를 갖는다.
   * 활성 패널만 렌더하므로 01 패널 CTA(/status)만 첫 렌더에 있고, 나머지는 데이터로
   * 고정한다. 02 CTA 도 패널 왼쪽에 있다(story-panel-redesign D4-2 — 미니데모에서 옮겼다).
   * 첫 렌더의 /analysis·/recommend 는 히어로·벤토에서 온다.
   */
  it('각 탭 패널이 자기 도구 CTA 를 갖는다 (TC-004)', () => {
    const html = render()

    expect(html).toContain('href="/status"')
    expect(STORY_STEPS.map(step => step.cta.href)).toEqual([
      '/status',
      '/analysis',
      '/recommend',
      '/simulation',
    ])
  })

  it('첫 렌더가 히어로·벤토를 통해 분석·추천으로도 나간다', () => {
    const html = render()

    for (const href of ['/analysis', '/recommend']) {
      expect(html).toContain(`href="${href}"`)
    }
  })

  /* 히어로 자치구 피커(hero-picker-and-mobile-first-screen.md D4-1·D4-3). */
  it('히어로에 자치구 피커와 고르기 전 안내가 있다', () => {
    const html = render()
    const text = html.replace(/<[^>]+>/g, '')

    // 고르기 전에는 첫 항목이 선택된 채로 렌더된다(React 는 selected 를 붙인다).
    expect(html).toMatch(/<option value=""[^>]*>자치구 고르기<\/option>/)
    expect(text).toContain('창업할 자치구')
    expect(text).toContain(
      '고르면 그 구의 최근 분기 유동인구부터 바로 보여 줘요.',
    )
    expect(text).toContain('내 상권 분석하기')
    expect(text).not.toContain('짚어 드립니다')
  })

  /* 카드가 지도를 덮지 않으니 창 장식은 숨긴다 — 시험 적용(hero-split-layout.md D4-2). */
  it('히어로 카드에 창 장식(제목줄·조작 그룹)이 없다', () => {
    const html = render()
    const text = html.replace(/<[^>]+>/g, '')

    expect(text).not.toContain('서울 상권 데이터 분석')
    expect(html).not.toContain('aria-label="분석 창 조작"')
    expect(html).not.toContain('aria-label="분석 창 열기"')
  })

  /* 「어디가 좋을지 모르는 사람」의 갈래가 첫 화면에 있어야 한다(이슈 #176 잔여 ①). */
  it('히어로가 추천 갈래를 연다', () => {
    const html = render()

    expect(html).toContain('어디가 좋을지 모르겠다면 상권 추천받기')
  })
})
