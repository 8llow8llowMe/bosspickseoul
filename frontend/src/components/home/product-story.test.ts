import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import {
  buildCumulativeProfit,
  findBreakEvenMonth,
} from '@/components/home/break-even-chart'
import ProductStory, { stepHighlight } from '@/components/home/product-story'
import { STORY_PANEL_ID, storyTabId } from '@/components/home/step-tabs'
import { STORY_PIN_QUERY } from '@/components/home/story-scroll'
import { STORY_STEPS } from '@/components/home/story-steps'
import { districts } from '@/data/districts'
import { DEFAULT_SELECTION, getDemoSample } from '@/data/home-demo'
import type { RecommendPreviewState } from '@/hooks/use-recommend-preview'
import { RECOMMEND_PREVIEW_FALLBACK } from '@/lib/home/recommend-preview'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
  }),
}))

/*
 * 01 데모(MetricRankingBoard)가 useQuery 를 쓰므로 QueryClientProvider 가 필요하다.
 * top-ten 을 캐시에 심지 않는다 — 폴백 렌더로 골격을 본다.
 */
const element = () =>
  createElement(
    QueryClientProvider,
    {
      client: new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
    },
    createElement(ProductStory),
  )

const renderStory = () => renderToStaticMarkup(element())

const renderStyles = (): string => {
  const sheet = new ServerStyleSheet()
  try {
    renderToStaticMarkup(sheet.collectStyles(element()))
    return sheet.getStyleTags().replace(/\s+/g, '')
  } finally {
    sheet.seal()
  }
}

describe('ProductStory — 탭 구조 (TC-HR-002)', () => {
  it('탭 네 개와 패널 하나, 기본 선택은 01 이다', () => {
    const html = renderStory()

    expect(html.match(/role="tab"/g)).toHaveLength(4)
    expect(html.match(/role="tabpanel"/g)).toHaveLength(1)
    expect(html).toMatch(
      new RegExp(`id="${storyTabId('01')}"[^>]*aria-selected="true"`),
    )
  })

  it('패널이 활성 탭으로 이름을 얻는다', () => {
    expect(renderStory()).toMatch(
      new RegExp(
        `role="tabpanel"[^>]*id="${STORY_PANEL_ID}"[^>]*aria-labelledby="${storyTabId('01')}"`,
      ),
    )
  })

  it('네 단계 제목을 모두 탭에 싣는다', () => {
    const html = renderStory()
    for (const step of STORY_STEPS) expect(html).toContain(step.title)
  })
})

describe('ProductStory — 활성 패널만 그린다 (TC-HR-003)', () => {
  /*
   * 비활성 패널을 hidden 으로 두면 04 차트·03 추천이 첫 페인트에 마운트돼 요청이
   * 늘어난다(첫 페인트 BFF 2개 유지, 명세 D4-3).
   */
  it('01 패널의 CTA 만 있고 다른 도구 CTA 는 없다', () => {
    const html = renderStory()

    expect(html).toContain('href="/status"')
    expect(html).not.toContain('href="/recommend"')
    expect(html).not.toContain('href="/simulation"')
  })

  it('01 패널은 설명과 손에 남는 것을 싣는다', () => {
    const html = renderStory()

    expect(html).toContain(STORY_STEPS[0].body)
    expect(html).toContain(STORY_STEPS[0].outcome)
  })

  /* 라벨 글자는 화면에서 뺐다 — 체크 아이콘이 말하고, 보조기기에만 라벨을 읽힌다(D4-2). */
  it('「손에 남는 것」 라벨은 보조기기용으로만 남긴다 (TC-SP-003)', () => {
    const html = renderStory()
    const index = html.indexOf('손에 남는 것')

    expect(index).toBeGreaterThan(-1)
    expect(html.slice(index, index + 60)).toContain(STORY_STEPS[0].outcome)
    expect(html.match(/손에 남는 것/g)).toHaveLength(1)
  })

  it('패널 왼쪽에 큰 숫자를 싣는다 — 25 를 하드코딩하지 않는다 (TC-SP-003)', () => {
    const html = renderStory()

    expect(html).toContain(`>${districts.length}<span`)
    expect(html).toContain('서울 자치구 전체')
  })
})

describe('ProductStory — 스크롤 고정이 없다 (TC-HR-004 · 005)', () => {
  /*
   * story-scroll-pin: 넓고 높은 화면에서만 고정한다. 고정·트랙 높이는 STORY_PIN_QUERY
   * 미디어 쿼리 **안에만** 있어야 한다 — 밖에 새면 모바일·낮은 화면에 스크롤 고정이 생긴다.
   */
  it('sticky 와 dvh 트랙은 고정 모드 미디어 쿼리 안에만 있다 (TC-SP2-003)', () => {
    const css = renderStyles()
    const query = STORY_PIN_QUERY.replace(/\s+/g, '')
    const blocks = [...css.matchAll(/@media([^{]+)\{\.[\w-]+\{([^}]*)\}\}/g)]
    const pinned = blocks.filter(([, media]) => media === query)

    expect(pinned.some(([, , body]) => body.includes('position:sticky'))).toBe(
      true,
    )
    expect(pinned.some(([, , body]) => body.includes('dvh'))).toBe(true)

    const outside = blocks.reduce(
      (rest, [whole]) => rest.replace(whole, ''),
      css,
    )
    expect(outside).not.toContain('position:sticky')
    // 섹션 최소 높이(한 화면, full-screen-sections-and-live-tooltip.md D4-1)만 예외다.
    expect(
      outside.replaceAll('min-height:calc(100dvh-65px)', ''),
    ).not.toContain('dvh')
  })

  it('1100px 이상은 가장 큰 데모 높이를 예약하고, 그 아래는 풀어 준다', () => {
    const css = renderStyles()

    expect(css).toMatch(/min-height:\d+px/)
    expect(css).toMatch(/@media\(max-width:1099px\)\{\.\w+\{min-height:0;/)
  })

  /* 한 줄 가로 스크롤은 쓰지 않는다 — 좁은 화면은 4열 균등 + 짧은 이름이다(D4-1). */
  it('768 이하에서 탭은 4열 균등 그리드다', () => {
    expect(renderStyles()).toMatch(
      /@media\(max-width:768px\)\{\.\w+\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\);/,
    )
  })

  it('패널은 4:8 두 칸이고 왼쪽 묶음은 세로 가운데다', () => {
    const css = renderStyles()

    expect(css).toContain('grid-template-columns:minmax(0,4fr)minmax(0,8fr)')
    expect(css).toContain('align-self:center')
  })

  it('섹션은 전폭 배경 밴드 위의 홈 공용 컬럼이다', () => {
    const css = renderStyles()

    expect(css).toContain('background:var(--color-background-muted)')
    expect(css).toContain('width:min(var(--w-wide),var(--w-shell))')
  })
})

describe('ProductStory — 문구 (TC-HR-006)', () => {
  it('제목과 아이브로는 해요체다', () => {
    const html = renderStory()

    expect(html).toContain('이렇게 판단해요')
    expect(html).toContain(
      '자치구 25곳에서 시작해 가게 하나의 손익까지, 네 단계로 좁혀요.',
    )
  })

  it('내부 용어를 쓰지 않는다', () => {
    const html = renderStory()

    expect(html).not.toContain('선택과 무관한 고정 예시')
    expect(html).not.toContain('1개 예시')
  })
})

describe('stepHighlight — 큰 숫자 (TC-SP-002)', () => {
  const realView = {
    ...RECOMMEND_PREVIEW_FALLBACK,
    isSample: false,
  }
  const state = (
    overrides: Partial<RecommendPreviewState> = {},
  ): RecommendPreviewState => ({
    administrationName: '논현2동',
    isLoading: false,
    commercialsCount: 9,
    view: realView,
    ...overrides,
  })

  it('01 은 자치구 수를 센다', () => {
    expect(stepHighlight(0, DEFAULT_SELECTION, state())).toEqual({
      value: String(districts.length),
      unit: '곳',
      caption: '서울 자치구 전체',
    })
  })

  it('02 는 고른 조건의 매출 증감을 부호와 함께 싣는다', () => {
    const sample = getDemoSample(
      DEFAULT_SELECTION.districtId,
      DEFAULT_SELECTION.industryId,
    )
    const highlight = stepHighlight(1, DEFAULT_SELECTION, state())

    expect(highlight.value).toBe(`+${sample.salesChangePct}`)
    expect(highlight.unit).toBe('%')
    expect(highlight.caption).toBe('강남구 카페 · 최근 6개월 매출')
  })

  it('03 로딩 중에는 숫자를 지어내지 않는다', () => {
    expect(
      stepHighlight(2, DEFAULT_SELECTION, state({ isLoading: true })),
    ).toEqual({
      value: '—',
      unit: '',
      caption: '조건에 맞는 상권을 찾고 있어요',
    })
  })

  it('03 실데이터는 좁혀진 폭을 싣는다', () => {
    expect(stepHighlight(2, DEFAULT_SELECTION, state())).toEqual({
      value: '9 → 5',
      unit: '곳',
      caption: '상권 9곳 중 조건에 맞는 곳',
    })
  })

  it('03 총계가 추천 수보다 작으면 비율을 말하지 않는다', () => {
    expect(
      stepHighlight(2, DEFAULT_SELECTION, state({ commercialsCount: 0 })),
    ).toEqual({ value: '5', unit: '곳', caption: '조건에 맞는 상권' })
  })

  it('03 예시 폴백은 예시라고 적는다', () => {
    expect(
      stepHighlight(
        2,
        DEFAULT_SELECTION,
        state({ view: RECOMMEND_PREVIEW_FALLBACK }),
      ),
    ).toEqual({ value: '5', unit: '곳', caption: '추천 후보 · 예시' })
  })

  it('04 는 누적 손익 계열에서 손익분기 달을 읽는다', () => {
    const month = findBreakEvenMonth(buildCumulativeProfit())

    expect(stepHighlight(3, DEFAULT_SELECTION, state())).toEqual({
      value: String(month),
      unit: '개월',
      caption: '투자금을 회수하는 시점 · 예시',
    })
  })
})
