// src/components/home/product-story.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'
import ProductStory from '@/components/home/product-story'
import { STORY_STEPS } from '@/components/home/story-steps'
import { districts } from '@/data/districts'

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
   * 코디네이터 피드백: 스텝 목록은 01단계와 함께 즉시 마운트되지만 트랙은 히어로
   * 아래에서 시작해 랜딩 첫 화면엔 보이지 않는다. 마운트와 별개로
   * "스토리 섹션이 뷰포트에 실제로 들어왔는가"(IntersectionObserver)를 확인하기
   * 전엔 03 연쇄(행정동→상권→추천)를 켜면 안 된다.
   *
   * renderToStaticMarkup은 커밋(effect) 단계를 실행하지 않으므로 이
   * IntersectionObserver는 절대 실행되지 않는다 — 즉 이 SSR 렌더는 정확히
   * "스토리에 아직 안 닿은" 상태를 흉내낸다. 03 노드가 즉시 폴백(대표
   * 예시 데이터)이나 실데이터로 채워지면, enabled 게이트가 사라졌다는 뜻이다.
   */
  it('03 수치는 로딩 표기(—)로 남고, 03 연쇄 응답을 함부로 종결짓지 않는다', () => {
    const html = renderStory()

    /*
      카운터를 스텝 목록으로 합친 뒤 「03 후보 추천」이 한 문자열로 붙어 있지 않다
      (번호와 제목이 별개 요소다). 제목부터 본문 시작까지를 잘라 **수치 자리만** 본다
      — 본문("조건에 맞는 상권을 …")에는 「상권」이 들어 있어 그대로 두면 단언이
      본문에 걸린다.
    */
    const start = html.indexOf('후보 추천')
    const end = html.indexOf('조건에 맞는', start)
    const figure = html.slice(start, end)

    expect(figure).toContain('—')
    // 연쇄가 켜졌다면 값이 「추천 N곳」 또는 「상권 M곳 중 추천 N곳」이 된다.
    expect(figure).not.toContain('곳')
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

/*
 * 상단 가로 카운터와 좌측 세로 스텝 목록이 같은 01~04 를 두 번 나열하고 있었다.
 * 둘은 실제로 다른 걸 나른다(카운터는 수량이 좁혀지는 과정, 목록은 각 단계가 무엇을
 * 하는가) — 하지만 화면에 그 차이를 알리는 신호가 없어 반복으로 읽혔다. 숫자를 그
 * 숫자를 만든 단계 옆으로 옮겨 하나의 축으로 합친다. 부수 효과로 카운터가 차지한
 * 115px(83 + gap 32)이 사라져, 스티키 콘텐츠가 화면 높이를 넘던 문제도 해소된다.
 */
/*
 * 이슈 #223. 홈에서 스토리만 셸도 읽기 컬럼도 아닌 폭(1400)이라 1920 에서 헤더보다
 * 한쪽 233px, 2560 에서 553px 좁았다. 실측해 보니 **여는 쪽이 더 나빴다** — 셸 전폭으로
 * 열면 01 의 가로 막대가 1300px 이 되어 폭 체계 §6 이 정한 560px 상한을 스스로 어긴다.
 *
 * 그래서 폭 체계 §5 가 중앙 그룹에 써 둔 처방을 스토리에 적용한다: **전폭 배경 밴드**.
 * 좁은 컬럼이 넓은 판 위에 놓인 것으로 읽혀 어긋남이 아니게 된다.
 */
describe('ProductStory — 스토리 섹션이 전폭 배경 밴드를 갖는다(#223)', () => {
  /*
   * `Container` 의 규칙에 붙여서 본다. `background:var(--color-background-muted)` 만
   * 찾으면 **자식 컴포넌트의 것에 걸려 항상 통과한다** — 실제로 이 스타일시트에는 그
   * 선언이 이미 두 군데 있었다(StepButton hover 포함). 밴드를 지워도 초록인 가드가
   * 될 뻔했다.
   */
  it('섹션 컨테이너에 배경 밴드가 깔린다', () => {
    expect(renderStoryStyles()).toContain(
      'position:relative;background:var(--color-background-muted)',
    )
  })

  /*
   * **밴드와 hover 가 같은 토큰이면 hover 가 사라진다.** 밴드를 깔기 전 StepButton 의
   * hover 배경이 정확히 `--color-background-muted` 였다 — 함께 내리지 않으면 목록이
   * 아예 반응하지 않는 것처럼 보인다. 「아무 일도 안 일어남」이라 눈으로 놓치기 쉬워
   * 여기서 잠근다.
   *
   * 금지 토큰을 적어 두지 않고 **밴드 규칙에서 읽어 온다.** 예전에는 두 토큰을 모두
   * 문자열로 박아 뒀는데, 그러면 밴드를 `--color-surface-muted` 로 한 단계 올릴 때
   * hover 와 다시 같은 색이 되는데도 이 테스트는 초록이었다(#258 에서 밴드만 올려
   * 실측 확인). 밴드 토큰이 무엇으로 바뀌든 충돌 자체를 잡게 한다.
   */
  it('스텝 hover 배경이 밴드 색과 다르다', () => {
    const css = renderStoryStyles()

    const band =
      /position:relative;background:var\((--color-[a-z0-9-]+)\)/.exec(css)?.[1]

    const hoverBackgrounds = [
      ...css.matchAll(/:hover\{background:var\((--color-[a-z0-9-]+)\);\}/g),
    ].map(match => match[1])

    expect(band).toBeTruthy()
    /*
      hover 선언이 통째로 사라져도 「밴드와 다르다」는 공허하게 참이 된다. 그래서
      개수를 함께 본다 — 이 스토리에는 hover 배경이 셋이다: 활성 스텝(primary-100),
      비활성 스텝, CTA 버튼. StepButton 의 hover 블록을 지우면 둘이 사라져 1 이 된다.
    */
    expect(hoverBackgrounds).toHaveLength(3)
    expect(hoverBackgrounds).not.toContain(band)
  })

  /*
   * 폭은 **열지 않는다**(위 describe 주석). 1400 컬럼을 유지한다는 결정이 조용히
   * 뒤집히지 않게 토큰을 확인한다.
   */
  it('스토리 컬럼은 --w-wide 를 유지한다', () => {
    expect(renderStoryStyles()).toContain('var(--w-wide)')
  })
})

describe('ProductStory — 카운터를 스텝 목록으로 합쳤다', () => {
  it('01~04 열거를 두 번 하지 않는다', () => {
    const html = renderStory()

    expect(html).not.toContain('좁혀지는 선택 수')
  })

  it('각 단계 행이 그 단계의 수치를 함께 보여준다', () => {
    const html = renderStory()

    // 하드코딩 금지 — 자치구 목록 길이를 그대로 읽는다.
    expect(html).toContain(`${districts.length}개 자치구`)
    expect(html).toContain('강남구')
    expect(html).toContain('카페')
  })

  it('04 단계는 선택과 무관한 고정 예시임을 계속 밝힌다', () => {
    expect(renderStory()).toContain('선택과 무관한 고정 예시')
  })

  it('03 단계는 로딩 중에 수치를 지어내지 않는다', () => {
    // 스토리 도달 전에는 추천 연쇄가 꺼져 있다 — 그 상태의 표기는 —(대시)다.
    expect(renderStory()).toContain('—')
  })

  /*
   * 실측(1440x900): 카운터가 있을 때 스티키 콘텐츠가 877px 로 쓸 수 있는 띠
   * 835px(100dvh − 헤더)를 넘어 바닥 42px 이 화면 밖으로 나갔다. 카운터 제거로
   * 여유가 생겼지만, 더 낮은 뷰포트에서도 넘치지 않도록 데모 행이 줄어들 수 있어야 한다.
   */
  it('데모 행은 기본 600px 이되 좁은 높이에서 줄어들 수 있다', () => {
    const css = renderStoryStyles()

    expect(css).toContain('flex:0 1 600px')
    expect(css).toContain('min-height:0')
  })

  /*
   * flex 축소는 컨테이너에 **상한**이 있어야 발동한다. min-height 만 있으면
   * 컨테이너가 콘텐츠만큼 커져 부족분이 생기지 않는다 — 실측(1100x800)으로
   * 콘텐츠 762px 가 가용 띠 735px 를 27px 넘겼다.
   */
  it('스티키 박스에 상한이 있어야 데모 행이 실제로 줄어든다', () => {
    const css = renderStoryStyles()

    expect(css).toContain('max-height:calc(100dvh - 65px)')
  })

  /*
   * 상한만 두면 낮은 뷰포트에서 스텝 목록이 줄어든 행보다 커져 박스 밖으로 그려진다
   * (실측 1280x620: 행 393px 안에 목록 534px). 밖으로 새는 대신 스크롤한다.
   */
  it('스텝 목록은 밖으로 새지 않고 스크롤한다', () => {
    const css = renderStoryStyles()

    expect(css).toContain('overflow:auto')
  })
})
