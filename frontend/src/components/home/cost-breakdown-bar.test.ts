import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import CostBreakdownBar, {
  segmentShare,
} from '@/components/home/cost-breakdown-bar'

const render = () => renderToStaticMarkup(createElement(CostBreakdownBar))

describe('segmentShare', () => {
  it('만원 단위 예시를 소수점 1자리 백분율로 바꾼다', () => {
    expect(segmentShare(1050, 4200)).toBe(25)
    expect(segmentShare(1200, 4200)).toBe(28.6)
    expect(segmentShare(350, 4200)).toBe(8.3)
    expect(segmentShare(1600, 4200)).toBe(38.1)
  })

  /*
   * 네 세그먼트를 합치면 매출과 정확히 같다 — 이것이 세로 막대 5개와의 핵심
   * 차이다. 반올림 후에도 합이 100.0 이어야 폭 배분이 어긋나지 않는다.
   */
  it('네 세그먼트 비율의 합이 100 이다', () => {
    const total = 4200
    const sum = [1050, 1200, 350, 1600].reduce(
      (acc, amount) => acc + segmentShare(amount, total),
      0,
    )

    expect(sum).toBeCloseTo(100, 1)
  })
})

describe('CostBreakdownBar', () => {
  it('매출을 전체로 두고 비용 3항목과 순이익을 세그먼트로 나눈다', () => {
    const html = render()

    for (const label of ['월매출', '임차료', '인건비', '기타', '순이익']) {
      expect(html).toContain(label)
    }
  })

  it('금액 단위는 만원이다', () => {
    // 시뮬레이션 Feature 규약.
    expect(render()).toContain('만원')
  })

  it('합계가 맞는다', () => {
    // 4,200 - 1,050 - 1,200 - 350 = 1,600
    const html = render()

    expect(html).toContain('4,200')
    expect(html).toContain('1,600')
  })

  it('예시 데이터임을 계속 밝힌다', () => {
    expect(render()).toContain('대표 예시 데이터')
  })

  /*
   * 의미는 role="img" 의 aria-label 하나가 전담한다 — 세그먼트·범례를 각각
   * 읽히게 하면 같은 숫자를 세 번 듣는다(기존 패턴 유지).
   */
  it('그래프 전체를 한 문장으로 읽힌다', () => {
    const html = render()

    expect(html).toContain('role="img"')
    expect(html).toContain(
      '월 손익 구조 예시. 월매출 4,200만원에서 임차료·인건비·기타를 빼면 순이익 1,600만원입니다.',
    )
  })

  /*
   * 카테고리 3개에 억지로 3가지 색을 배정하지 않는다(카운터 화살표와 같은 원칙).
   * 비용은 한 색, 순이익은 한 색 — 두 가지뿐이다.
   */
  it('색은 비용·순이익 두 가지만 쓴다', () => {
    const html = render()
    const colors = new Set(
      (html.match(/var\(--color-[a-z0-9-]+\)/g) ?? []).filter(token =>
        /border-200|primary-600/.test(token),
      ),
    )

    expect(colors).toEqual(
      new Set(['var(--color-border-200)', 'var(--color-primary-600)']),
    )
  })

  /*
   * 세로 막대 5개에서는 「기타」막대 자체가 13px 로 얇아 값을 얹기 어려웠다.
   * 가로 바는 라벨을 막대 밖 범례에 두므로 폭이 8.3% 여도 라벨이 온전하다.
   */
  it('얇은 세그먼트도 범례에서 금액과 비율을 읽을 수 있다', () => {
    const html = render()

    expect(html).toContain('350')
    expect(html).toContain('8.3%')
  })
})
