import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import ProductStory from '@/components/home/product-story'
import { STORY_PANEL_ID, storyTabId } from '@/components/home/step-tabs'
import { STORY_STEPS } from '@/components/home/story-steps'
import { districts } from '@/data/districts'

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
    expect(html).toContain('손에 남는 것')
    expect(html).toContain(STORY_STEPS[0].outcome)
  })

  it('나머지 단계의 CTA 목적지는 데이터로 고정한다', () => {
    expect(STORY_STEPS.map(step => step.cta?.href ?? null)).toEqual([
      '/status',
      null,
      '/recommend',
      '/simulation',
    ])
  })
})

describe('ProductStory — 스크롤 고정이 없다 (TC-HR-004 · 005)', () => {
  it('100dvh 도 sticky 도 쓰지 않는다', () => {
    const css = renderStyles()

    expect(css).not.toContain('100dvh')
    expect(css).not.toContain('position:sticky')
  })

  it('데스크톱 패널은 가장 큰 데모 높이를 예약한다', () => {
    expect(renderStyles()).toContain('min-height:560px')
  })

  it('768 이하에서 탭은 2x2 로 접힌다', () => {
    expect(renderStyles()).toMatch(
      /@media\(max-width:768px\)\{\.\w+\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);/,
    )
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

  it('탭 수치는 화면에서 유도한다 — 25 를 하드코딩하지 않는다', () => {
    const html = renderStory()

    expect(html).toContain(`${districts.length}개 자치구`)
    expect(html).toContain('강남구 · 카페')
  })

  /* 스토리 도달 전에는 03 연쇄가 꺼져 있다(IntersectionObserver 게이트). */
  it('03 수치는 로딩 표기(—)로 남는다', () => {
    expect(renderStory()).toContain('—')
  })
})
