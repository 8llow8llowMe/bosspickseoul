// src/components/home/product-story.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServerStyleSheet } from 'styled-components'
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

/*
 * 01단계가 MetricRankingBoard(useDistrictTopTen → useQuery)를 그리므로 QueryClientProvider
 * 없이 렌더하면 "No QueryClient set" 으로 죽는다. 여기서는 top-ten 응답을 캐시에 심지
 * 않는다 — 그 분기는 metric-ranking-board.test.ts 가 이미 덮는다. 이 파일의 관심사는
 * 스토리 골격(제목·CTA·라벨)이라 폴백 렌더로 충분하다.
 */
const renderStory = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, createElement(ProductStory)),
  )
}

describe('ProductStory', () => {
  it('4개 스텝 제목과 샘플 라벨을 렌더한다', () => {
    const html = renderStory()
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
    const html = renderStory()

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
    expect(byDemo.metrics).toEqual({ href: '/status', label: '구별 현황 보기' })
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

describe('STORY_STEPS — AI 리포트 배치', () => {
  it('02단계 제목이 AI 리포트를 명시한다', () => {
    // AI 리포트는 /analysis/report 와 분석 결과 사이드바에 사는 분석의 산출물이다.
    // 벤토의 「분석 이후」 칸이 아니라 이 단계가 그것을 말해야 한다.
    expect(STORY_STEPS[1].title).toBe('상권 분석 · AI 리포트')
  })

  it('02단계 본문이 AI 가 무엇을 해 주는지 말한다', () => {
    expect(STORY_STEPS[1].body).toContain('AI')
  })

  it('02단계는 여전히 CTA 를 갖지 않는다', () => {
    // 데모(analysis-mini-demo)가 자체 CTA 를 들고 있다. 여기서 또 그리면 버튼이 둘이 된다.
    expect(STORY_STEPS[1].cta).toBeNull()
  })
})

describe('ProductStory — 03 연쇄는 스토리 도달 전엔 켜지지 않는다', () => {
  /*
   * 코디네이터 피드백: 카운터(FunnelCounter)는 01단계와 함께 즉시 마운트되지만
   * 트랙은 히어로 아래에서 시작해 랜딩 첫 화면엔 보이지 않는다. 마운트와 별개로
   * "스토리 섹션이 뷰포트에 실제로 들어왔는가"(IntersectionObserver)를 확인하기
   * 전엔 03 연쇄(행정동→상권→추천)를 켜면 안 된다.
   *
   * renderToStaticMarkup은 커밋(effect) 단계를 실행하지 않으므로 이
   * IntersectionObserver는 절대 실행되지 않는다 — 즉 이 SSR 렌더는 정확히
   * "스토리에 아직 안 닿은" 상태를 흉내낸다. 03 노드가 즉시 폴백(대표
   * 예시 데이터)이나 실데이터로 채워지면, enabled 게이트가 사라졌다는 뜻이다.
   */
  it('03 노드는 로딩 표기(—)로 남고, 03 연쇄 응답을 함부로 종결짓지 않는다', () => {
    const html = renderStory()

    const label = html.indexOf('03 후보 추천')
    const window = html.slice(label, label + 200)

    expect(window).toContain('—')
    expect(window).not.toContain('상권')
    expect(window).not.toContain('추천 5곳')
  })
})

describe('STORY_STEPS — 01단계 히어로 재탕 제거', () => {
  it('01단계는 지도를 데모로 쓰지 않는다', () => {
    // 히어로가 같은 SeoulDistrictsMap 을 이미 그린다.
    expect(STORY_STEPS[0].demo).not.toBe('map')
  })

  it('01단계 본문이 지표로 줄 세운다고 말한다', () => {
    expect(STORY_STEPS[0].body).toContain('유동인구')
  })

  it('01단계 CTA 목적지는 그대로다', () => {
    expect(STORY_STEPS[0].cta?.href).toBe('/status')
  })
})

/**
 * SSR 기본 렌더는 스티키 모드다(`useStackedMode` 초기값 false) — 그래서 이 시트에는
 * `Sticky` 규칙만 들어오고 `StackItem` 규칙은 들어오지 않는다. 두 규칙이 같은
 * `calc(100dvh - 65px)` 문자열을 쓰므로, 스택 규칙이 섞이면 이 단언이 무의미해진다.
 */
const renderStoryStyles = (): string => {
  const sheet = new ServerStyleSheet()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  try {
    renderToStaticMarkup(
      sheet.collectStyles(
        createElement(
          QueryClientProvider,
          { client },
          createElement(ProductStory),
        ),
      ),
    )
    return sheet.getStyleTags()
  } finally {
    sheet.seal()
  }
}

describe('ProductStory — 스티키가 헤더를 비껴간다(R3)', () => {
  /*
   * 실측(1440x900): 아이브로가 y 44-64 로 헤더 밴드(0-65) 안에 완전히 들어가
   * 100% 가려졌다. top 을 헤더 높이로 내리면 박스 상단 자체가 y=65 로 밀려
   * 내부 콘텐츠에 그보다 위로 그려질 하한이 없어진다.
   */
  it('Sticky 의 top 이 헤더 높이만큼 내려가 있다', () => {
    expect(renderStoryStyles()).toContain('top:65px')
  })

  it('Sticky 의 min-height 가 헤더 높이를 뺀 값이다', () => {
    expect(renderStoryStyles()).toContain('calc(100dvh - 65px)')
  })
})
