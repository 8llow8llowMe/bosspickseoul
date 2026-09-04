import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'

import FunnelCounter from '@/components/home/funnel-counter'
import { districts } from '@/data/districts'
import { DEFAULT_SELECTION } from '@/data/home-demo'
import type { RecommendPreviewState } from '@/hooks/use-recommend-preview'

/*
 * D8-3: 4단계는 각자 독립된 그림이 아니라 하나의 선택을 이어받고, 그 좁혀짐을
 * 카운터로 보여준다. 카운터의 모든 숫자는 화면에서 유도돼야 한다 — 특히 03의
 * "추천 M" 을 5로 하드코딩하지 않는지가 이 파일의 핵심 관심사다.
 */

const loadingState: RecommendPreviewState = {
  administrationName: null,
  isLoading: true,
  commercialsCount: 0,
  view: { rows: [], reason: null, isSample: true },
}

const sampleState: RecommendPreviewState = {
  administrationName: null,
  isLoading: false,
  commercialsCount: 0,
  view: {
    rows: [
      { key: 's1', rank: 1, name: '역삼역', score: 92, scoreLabel: '92.0점' },
      { key: 's2', rank: 2, name: '국기원', score: 85, scoreLabel: '85.0점' },
      {
        key: 's3',
        rank: 3,
        name: '언주역 8번',
        score: 83,
        scoreLabel: '83.0점',
      },
      {
        key: 's4',
        rank: 4,
        name: '역삼역 8번',
        score: 79,
        scoreLabel: '79.0점',
      },
      { key: 's5', rank: 5, name: '선릉역', score: 77, scoreLabel: '77.0점' },
    ],
    reason: null,
    isSample: true,
  },
}

// 실측: 스포츠 강습(CS200005)은 topN=5 를 요청해도 추천이 3건만 온다.
// topN 은 상한이지 보장이 아니므로 3을 그대로 보여줘야 한다 — 5로 굳히면 거짓말이다.
const realThreeState: RecommendPreviewState = {
  administrationName: '논현2동',
  isLoading: false,
  commercialsCount: 12,
  view: {
    rows: [
      { key: 'r1', rank: 1, name: '역삼역', score: 84, scoreLabel: '84.0점' },
      {
        key: 'r2',
        rank: 2,
        name: '선정릉역 4번',
        score: 78,
        scoreLabel: '78.0점',
      },
      { key: 'r3', rank: 3, name: '국기원', score: 71, scoreLabel: '71.0점' },
    ],
    reason: '공격형 기준으로 기회도 높음을 우선 반영했습니다.',
    isSample: false,
  },
}

const render = (overrides: Partial<Parameters<typeof FunnelCounter>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(FunnelCounter, {
      selection: DEFAULT_SELECTION,
      recommend: loadingState,
      ...overrides,
    }),
  )

describe('FunnelCounter', () => {
  it('01 노드는 자치구 목록 길이를 그대로 읽는다(하드코딩 금지)', () => {
    const html = render()

    // districts.ts 가 몇 개든 이 숫자를 따라가야 한다 — '25' 를 직접 적지 않는다.
    expect(html).toContain(`${districts.length}개 자치구`)
  })

  it('02 노드는 선택한 지역·업종 이름을 그대로 보여준다', () => {
    const html = render({
      selection: { districtId: 'mapo', industryId: 'gym' },
    })

    expect(html).toContain('마포구')
    expect(html).toContain('헬스장')
  })

  it('로딩 중인 03 노드는 —로 둔다', () => {
    const html = render({ recommend: loadingState })

    const label = html.indexOf('03 후보 추천')
    const window = html.slice(label, label + 200)

    expect(window).toContain('—')
    expect(window).not.toContain('상권')
  })

  it('03 노드는 실제 추천 개수를 읽는다 — 5로 하드코딩하지 않는다', () => {
    const html = render({ recommend: realThreeState })

    expect(html).toContain('상권 12곳 중 추천 3곳')
    expect(html).not.toContain('추천 5곳')
  })

  it('03 이 폴백이면 「예시」를 명시한다', () => {
    const html = render({ recommend: sampleState })

    const label = html.indexOf('03 후보 추천')
    const window = html.slice(label, label + 200)
    expect(window).toContain('예시')
  })

  it('04는 선택과 무관한 고정 예시임을 명시한다', () => {
    const html = render()

    const label = html.indexOf('04 창업 시뮬레이션')
    const window = html.slice(label, label + 200)
    expect(window).toContain('예시')
    expect(window).toContain('선택과 무관')
  })

  it('스티키 모드(active 지정)에서는 활성 노드만 aria-current를 갖는다', () => {
    const html = render({ active: 2 })

    expect(html).toContain('aria-current="step"')
    // 4개 중 1개 노드만 활성이어야 한다.
    expect(html.match(/aria-current="step"/g)).toHaveLength(1)
  })

  it('스택 모드(active 미지정)에서는 강조가 없다', () => {
    const html = render()

    expect(html).not.toContain('aria-current')
  })
})

/** 조건부 CSS(미디어쿼리) 검증용 — styled 가 실제로 낸 규칙을 문자열로 뽑는다. */
const renderStyles = (): string => {
  const sheet = new ServerStyleSheet()

  try {
    renderToStaticMarkup(
      sheet.collectStyles(
        createElement(FunnelCounter, {
          selection: DEFAULT_SELECTION,
          recommend: loadingState,
        }),
      ),
    )
    return sheet.getStyleTags()
  } finally {
    sheet.seal()
  }
}

describe('FunnelCounter — 노드 연결(R6)', () => {
  /*
   * 4노드가 서로 무관한 박스 4개처럼 보였다. 흐름을 보여주는 건 화살표만이고,
   * 순서의 의미는 이미 <ol> 과 aria-current 가 나른다 — 그래서 순수 장식이다.
   */
  it('노드 사이에 화살표를 3개 둔다(4노드 사이니까 3개)', () => {
    expect((render().match(/lucide-arrow-right/g) ?? []).length).toBe(3)
  })

  it('화살표는 접근성 트리에서 감춘다', () => {
    /*
     * aria-hidden 총 개수를 세면 안 된다 — lucide 가 svg 에 스스로 붙이고 래퍼도
     * 붙여서 화살표당 2개가 나온다. 라이브러리 내부에 의존하지 않도록, 각 화살표
     * 자신이 감춰졌는지만 본다.
     */
    const arrows = render().match(/<svg[^>]*lucide-arrow-right[^>]*>/g) ?? []

    expect(arrows).toHaveLength(3)
    for (const arrow of arrows) {
      expect(arrow).toContain('aria-hidden="true"')
    }
  })

  /*
   * 2열이 되면 1->2 오른쪽, 2->3 아래-왼쪽, 3->4 오른쪽으로 방향이 깨진다.
   * 4열일 때만 그린다.
   */
  it('2열로 접히는 폭에서는 화살표를 숨긴다', () => {
    const styles = renderStyles()

    expect(styles).toContain('@media (max-width: 640px)')
    expect(styles).toContain('display:none')
  })

  /*
   * DESIGN.md 는 재무 데이터 표시에 장식을 더하지 말라고 못 박고, home-page.tsx 에
   * 대해 gradient grep 무결과를 요구한다. 「더 강조하고 싶다」가 색으로 새지 않게
   * 가드를 둔다.
   */
  it('그라데이션을 쓰지 않는다', () => {
    expect(render() + renderStyles()).not.toContain('gradient')
  })

  /*
   * 화살표는 활성 강조와 무관한 정적 장식이다 — active 를 주지 않는 스택 모드에서도
   * 같은 개수가 나와야 한다.
   */
  it('스택 모드에서도 화살표 개수는 같다', () => {
    const stacked = render()
    const sticky = render({ active: 1 })

    expect((stacked.match(/lucide-arrow-right/g) ?? []).length).toBe(
      (sticky.match(/lucide-arrow-right/g) ?? []).length,
    )
  })
})
