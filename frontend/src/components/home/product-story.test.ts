// src/components/home/product-story.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import ProductStory from '@/components/home/product-story'
import { STORY_STEPS } from '@/components/home/story-steps'

// SeoulDistrictsMap이 useRouter를 호출하므로 SSR 렌더용으로 모킹(home-page.test.ts와 동일)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
  }),
}))

describe('ProductStory', () => {
  it('4개 스텝 제목과 샘플 라벨을 렌더한다', () => {
    const html = renderToStaticMarkup(createElement(ProductStory))
    for (const title of [
      '현황 확인',
      '상권 분석',
      '후보 추천',
      '창업 시뮬레이션',
    ]) {
      expect(html).toContain(title)
    }
    expect(html).toContain('대표 예시 데이터')
  })

  /*
   * 이슈 #176. 4단계 중 3단계에 CTA 가 하나도 없어서 스토리가 「무엇을 해 주는지」만
   * 말하고 끝났다. 특히 `/recommend`·`/simulation` 은 홈 본문 링크가 **0개**였다.
   */
  it('활성 단계의 CTA 를 렌더한다', () => {
    const html = renderToStaticMarkup(createElement(ProductStory))

    /*
     * 스티키 모드는 **활성 단계 하나만** 패널로 그린다(첫 렌더는 01 현황 확인).
     * 나머지 단계의 CTA 는 스텝을 눌러 이동한 뒤에 나온다 — 아래 데이터 단언이
     * 그 목적지들을 고정한다.
     */
    expect(html).toContain('href="/status"')
    expect(html).toContain('구별 현황 보기')
  })

  it('나머지 단계의 목적지를 데이터로 고정한다', () => {
    const byDemo = Object.fromEntries(
      STORY_STEPS.map(step => [step.demo, step.cta]),
    )

    expect(byDemo.recommend).toEqual({
      href: '/recommend',
      label: '상권 추천받기',
    })
    expect(byDemo.simulation).toEqual({
      href: '/simulation',
      label: '창업 시뮬레이션 해보기',
    })
    expect(byDemo.map).toEqual({ href: '/status', label: '구별 현황 보기' })
  })

  /*
   * 미니데모 단계는 데모 안에 이미 「이 조건으로 실제 분석하기」가 있다.
   * 여기서 또 그리면 한 단계에 같은 뜻의 버튼이 둘이 된다.
   */
  it('미니데모 단계에는 CTA 를 중복해서 두지 않는다', () => {
    const miniDemoStep = STORY_STEPS.find(step => step.demo === 'mini-demo')

    expect(miniDemoStep?.cta).toBeNull()
  })

  it('CTA 가 있는 단계는 목적지가 서로 다르다 — 전부 /analysis 로 몰지 않는다', () => {
    const hrefs = STORY_STEPS.flatMap(step => (step.cta ? [step.cta.href] : []))

    expect(new Set(hrefs).size).toBe(hrefs.length)
    expect(hrefs).not.toContain('/analysis')
  })
})
