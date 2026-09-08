import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import BrandMark, { type BrandMarkProps } from './brand-mark'

const render = (props: BrandMarkProps): string =>
  renderToStaticMarkup(createElement(BrandMark, props))

const countRects = (svg: string): number => (svg.match(/<rect/g) ?? []).length

describe('BrandMark 변형', () => {
  it('Primary 는 본체 17 · 고스트 7 · 강조 1 = 25칸을 그린다', () => {
    const svg = render({ height: 80 })

    expect(svg).toContain('viewBox="0 0 19 34"')
    expect(countRects(svg)).toBe(25)
    expect(svg).toContain('fill="#edf0f3"')
    expect(svg).toContain('fill="#00795c"')
  })

  it('Grid 는 고스트를 그리지 않는다 — 본체 17 + 강조 1', () => {
    const svg = render({ height: 40 })

    expect(svg).toContain('viewBox="0 0 19 34"')
    expect(countRects(svg)).toBe(18)
    expect(svg).not.toContain('#edf0f3')
  })

  it('Solid 는 갭 없는 16x28 박스를 쓴다', () => {
    const svg = render({ height: 20 })

    expect(svg).toContain('viewBox="0 0 16 28"')
    expect(countRects(svg)).toBe(18)
    expect(svg).not.toContain('#edf0f3')
  })

  it('variant 를 직접 주면 높이 규칙을 덮는다', () => {
    expect(render({ height: 20, variant: 'primary' })).toContain(
      'viewBox="0 0 19 34"',
    )
  })

  /**
   * 3열 노치는 어떤 변형에서도 채우지 않는다. 채우면 실루엣이 사각형이 되어
   * B 가 죽는다 — 초안에서 실제로 그랬다.
   */
  it('3열 노치를 어떤 변형에서도 채우지 않는다', () => {
    for (const height of [20, 40, 80]) {
      const svg = render({ height })

      expect(svg).not.toContain('x="15" y="0"')
      expect(svg).not.toContain('x="15" y="15"')
      expect(svg).not.toContain('x="15" y="30"')
      expect(svg).not.toContain('x="12" y="0"')
      expect(svg).not.toContain('x="12" y="12"')
      expect(svg).not.toContain('x="12" y="24"')
    }
  })
})

describe('BrandMark 치수', () => {
  it('폭을 높이에서 파생한다', () => {
    const svg = render({ height: 34 })

    expect(svg).toContain('height="34"')
    expect(svg).toContain('width="19"')
  })

  it('컨테이너 모드는 정사각이고 radius 가 변의 25% 다', () => {
    const svg = render({ height: 32, container: true })

    expect(svg).toContain('width="32"')
    expect(svg).toContain('height="32"')
    expect(svg).toContain('viewBox="0 0 44.8 44.8"')
    expect(svg).toContain('rx="11.2"')
    expect(svg).toContain('data-role="container"')
    // 심볼은 컨테이너 안에서 중앙에 놓인다.
    expect(svg).toContain('translate(14.4 8.4)')
  })

  it('컨테이너 32px 는 Solid 를 담는다 — 그 크기에서 갭이 무너진다', () => {
    expect(render({ height: 32, container: true })).toContain(
      'viewBox="0 0 44.8 44.8"',
    )
  })

  it('컨테이너 180px 는 Primary 를 담는다', () => {
    const svg = render({ height: 180, container: true })

    expect(svg).toContain('viewBox="0 0 54.4 54.4"')
    expect(svg).toContain('rx="13.6"')
    expect(countRects(svg)).toBe(26)
  })
})

describe('BrandMark 톤', () => {
  it('ink 톤은 본체를 잉크로, 강조를 잉크 그린으로 그린다', () => {
    const svg = render({ height: 80 })

    expect(svg).toContain('fill="#191f28"')
    expect(svg).toContain('fill="#00795c"')
  })

  it('inverse 톤은 본체를 흰색으로 하고 강조·고스트를 반전값으로 바꾼다', () => {
    const svg = render({ height: 80, tone: 'inverse' })

    expect(svg).toContain('fill="#ffffff"')
    expect(svg).toContain('fill="#12a47c"')
    expect(svg).toContain('fill="#333d4b"')
    // 반전에서 원래 강조색을 쓰면 반전 고스트 대비가 2.04 로 무너진다.
    expect(svg).not.toContain('#00795c')
  })

  /**
   * 잉크 컨테이너 안에서는 본체가 흰색이므로 반전 팔레트를 쓴다. 여기서
   * `#00795c` 를 쓰면 고스트가 있는 크기(48px+)에서 대비가 2.04 로 무너진다.
   * 고스트가 없는 Solid 라도 팔레트를 갈라 쓰지 않는다.
   */
  it('잉크 컨테이너 안은 흰 본체 + 반전 강조색이다', () => {
    const solid = render({ height: 32, container: true })

    expect(solid).toContain('data-role="container" fill="#191f28"')
    expect(solid).toContain('fill="#ffffff"')
    expect(solid).toContain('fill="#12a47c"')
    expect(solid).not.toContain('#00795c')

    const primary = render({ height: 180, container: true })

    expect(primary).toContain('fill="#333d4b"')
    expect(primary).not.toContain('#edf0f3')
  })

  it('컨테이너 inverse 는 바탕을 흰색, 심볼을 잉크로 반전한다', () => {
    const svg = render({ height: 32, container: true, tone: 'inverse' })

    expect(svg).toContain('data-role="container" fill="#ffffff"')
    expect(svg).toContain('fill="#191f28"')
  })
})

describe('BrandMark 접근성', () => {
  it('title 이 없으면 장식으로 숨긴다', () => {
    const svg = render({ height: 32 })

    expect(svg).toContain('aria-hidden="true"')
    expect(svg).not.toContain('<title>')
  })

  it('title 을 주면 이미지로 노출한다', () => {
    const svg = render({ height: 32, title: 'BossPickSeoul' })

    expect(svg).toContain('role="img"')
    expect(svg).toContain('<title>BossPickSeoul</title>')
    expect(svg).not.toContain('aria-hidden')
  })
})
