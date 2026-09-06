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
  it('히어로 + 재설계된 4부(보드/앵커/스토리/벤토)를 렌더한다', () => {
    const html = render()
    const text = html.replace(/<[^>]+>/g, '')

    expect(text).toContain('창업 전에, 상권부터 확인하세요.') // 히어로 유지
    expect(text).toContain('창업할 지역과 업종을 네 단계로 좁힙니다.') // ① 네 도구 보드
    expect(text).toContain('서울 어느 자치구에 사람이 모이는지 봅니다.') // ② 앵커
    expect(text).toContain('현황 확인') // ③ 스토리 스텝
    expect(text).toContain('AI 리포트') // ④ 벤토
    expect(html).toContain('대표 예시 데이터')
  })

  /*
   * 네 도구의 관계를 말하는 곳이 스토리(3.2 화면 뒤) 하나뿐이었다. 보드가 히어로 바로
   * 뒤에 오므로, 홈 문서 순서에서 **보드가 스토리보다 먼저** 나와야 한다.
   */
  it('네 도구 보드가 판단 흐름보다 앞에 온다', () => {
    const html = render()

    // 앵커 문장은 단어별 span 으로 쪼개져 문자열로 찾을 수 없다 — 스토리의 데모 라벨을
    // 기준점으로 쓴다.
    const board = html.indexOf('창업할 지역과 업종을 네 단계로 좁힙니다.')
    const story = html.indexOf('대표 예시 데이터')

    expect(board).toBeGreaterThan(-1)
    expect(story).toBeGreaterThan(-1)
    expect(board).toBeLessThan(story)
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
   * home.md S2 #10 — 홈 본문은 네 도구 모두로 나가는 길을 갖는다. 감사 당시
   * `/recommend`·`/simulation` 은 본문 링크가 0개였다(이슈 #176). 이제 보드가 네 개를
   * 모두 들고, 히어로가 `/recommend` 갈래를 하나 더 연다.
   */
  it('본문이 네 도구로 모두 나간다 (TC-004)', () => {
    const html = render()

    for (const href of ['/status', '/analysis', '/recommend', '/simulation']) {
      expect(html).toContain(`href="${href}"`)
    }
  })

  /* 「어디가 좋을지 모르는 사람」의 갈래가 첫 화면에 있어야 한다(이슈 #176 잔여 ①). */
  it('히어로가 추천 갈래를 연다', () => {
    const html = render()

    expect(html).toContain('어디가 좋을지 모르겠다면 상권 추천받기')
  })
})
