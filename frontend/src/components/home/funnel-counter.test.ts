import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
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
