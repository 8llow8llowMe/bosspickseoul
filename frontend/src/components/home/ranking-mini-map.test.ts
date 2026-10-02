import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RankingMiniMap from '@/components/home/ranking-mini-map'
import { SEOUL_STATUS_VIEW_BOX } from '@/data/seoul-status-map'
import type { RankingMapLayers } from '@/lib/home/ranking-map'

/**
 * 미니 지도 마크업(ranking-mini-map.md D7-2 · D7-3).
 *
 * 브라우저 없이 서버 렌더로 본다. 연출·호버는 e2e(`e2e/home/ranking-mini-map.spec.ts`)가 맡는다.
 */

const FILLS = new Map([
  ['11680', 1],
  ['11620', 2],
  ['11710', 3],
  ['11290', 4],
  ['11500', 5],
])

const BADGES = [
  '11740',
  '11680',
  '11560',
  '11440',
  '11500',
  '11305',
  '11110',
  '11710',
].map((code, index) => ({ code, rank: index + 1 }))

const DUAL: RankingMapLayers = {
  fills: FILLS,
  badges: BADGES,
  overlap: ['11680', '11500', '11710'],
  summary:
    '서울 지도에 많이 본 8곳과 유동인구 Top 5 를 표시했어요. 둘 다 든 곳은 강남구, 강서구, 송파구예요.',
}

const render = (props: Parameters<typeof RankingMiniMap>[0]) =>
  renderToStaticMarkup(createElement(RankingMiniMap, props))

const count = (html: string, pattern: RegExp) =>
  (html.match(pattern) ?? []).length

describe('RankingMiniMap — 듀얼', () => {
  const html = render({ layers: DUAL, metricLabel: '유동인구' })

  it('지도는 role="img" 한 덩어리이고 요약 문장을 이름으로 갖는다', () => {
    expect(html).toContain('role="img"')
    expect(html).toContain(`aria-label="${DUAL.summary}"`)
  })

  it('칠 단계 다섯 개와 배지 여덟 개를 그린다', () => {
    for (const rank of [1, 2, 3, 4, 5]) {
      expect(count(html, new RegExp(`data-rank="${rank}"`, 'g'))).toBe(1)
    }
    expect(count(html, /data-badge-rank="/g)).toBe(8)
  })

  /* 높은 순위가 가려지지 않게 낮은 순위부터 그린다 — 나중에 그린 것이 위에 온다(D6). */
  it('배지는 8위부터 1위 순서로 그려 1위가 맨 위에 온다', () => {
    const order = [...html.matchAll(/data-badge-rank="(\d)"/g)].map(match =>
      Number(match[1]),
    )
    expect(order).toEqual([8, 7, 6, 5, 4, 3, 2, 1])
  })

  it('범례에 칠·배지 두 항목을 둔다', () => {
    expect(html).toContain('data-legend-item="fill"')
    expect(html).toContain('유동인구 Top 5 · 진할수록 위')
    expect(html).toContain('data-legend-item="badge"')
    expect(html).toContain('많이 본 순위')
  })

  /* 폴리곤이 포커스되지 않아야 터치 타깃·Tab 수가 늘지 않는다(D4-3). */
  it('폴리곤에는 role·tabindex 가 없다', () => {
    const paths = html.match(/<path[^>]*data-district-code[^>]*>/g) ?? []
    expect(paths).toHaveLength(25)
    for (const path of paths) {
      expect(path).not.toMatch(/\srole=/)
      expect(path).not.toMatch(/tabindex/i)
    }
  })

  it('값·변화율을 지도에 쓰지 않는다 — 목록을 되풀이하지 않는다', () => {
    expect(html).not.toMatch(/만명|억|%/)
  })
})

describe('RankingMiniMap — 강조', () => {
  it('강조한 구에 data-active 와 테두리를 그린다', () => {
    const html = render({ layers: DUAL, activeCode: '11680' })

    expect(count(html, /data-active="true"/g)).toBe(1)
    expect(html).toMatch(
      /data-district-code="11680"[^>]*data-active="true"|data-active="true"[^>]*data-district-code="11680"/,
    )
    expect(html).toContain('data-has-active="true"')
  })

  it('강조가 없으면 아무 구도 낮추지 않는다', () => {
    const html = render({ layers: DUAL })

    expect(html).not.toContain('data-active="true"')
    expect(html).toContain('data-has-active="false"')
  })
})

describe('RankingMiniMap — 분기 상태(D5-3)', () => {
  it('지표만 — 칠과 범례 한 항목', () => {
    const html = render({
      layers: { fills: FILLS, badges: [], overlap: [], summary: '지표만' },
      metricLabel: '매출',
    })

    expect(count(html, /data-rank="\d"/g)).toBe(5)
    expect(count(html, /data-badge-rank="/g)).toBe(0)
    expect(html).toContain('매출 Top 5 · 진할수록 위')
    expect(html).not.toContain('data-legend-item="badge"')
  })

  it('조회만 — 배지와 범례 한 항목', () => {
    const html = render({
      layers: {
        fills: new Map(),
        badges: BADGES,
        overlap: [],
        summary: '조회만',
      },
      metricLabel: '유동인구',
    })

    expect(count(html, /data-rank="\d"/g)).toBe(0)
    expect(count(html, /data-badge-rank="/g)).toBe(8)
    expect(html).not.toContain('data-legend-item="fill"')
    expect(html).toContain('data-legend-item="badge"')
  })

  it('스켈레톤 — 같은 viewBox 의 회색 실루엣, 범례 자리만 남는다', () => {
    const html = render({ layers: null })

    expect(html).toContain(`viewBox="${SEOUL_STATUS_VIEW_BOX}"`)
    expect(count(html, /data-district-code="/g)).toBe(25)
    expect(count(html, /data-rank="\d"/g)).toBe(0)
    expect(count(html, /data-badge-rank="/g)).toBe(0)
    expect(html).toContain('data-ranking-map-legend')
    expect(html).not.toContain('data-legend-item')
  })

  it('보이기 전에는 칠을 열지 않는다 — 등장 연출이 그 뒤에 한다', () => {
    const html = render({ layers: DUAL, metricLabel: '유동인구' })

    expect(html).toContain('data-revealed="false"')
  })
})
