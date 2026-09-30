// src/components/home/break-even-chart.test.ts
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import BreakEvenChart, {
  BREAK_EVEN_CHART_HEIGHT,
  buildCumulativeProfit,
  findBreakEvenMonth,
  formatManwonTick,
} from '@/components/home/break-even-chart'

/*
 * 이슈 #223 에서 200 → 260, story-panel-redesign D4-9 에서 300. 헤드라인·캡션을 머리줄로
 * 옮기고 틀이 칸을 채우게 되어 차트가 그 자리를 쓴다. 상한은 02 미니데모보다 커지지 않게
 * 잡는다 — 04 가 가장 큰 데모가 되면 패널 높이 예약을 다시 재야 한다.
 */
describe('BreakEvenChart — 플롯 높이', () => {
  it('차트가 300px 이다', () => {
    expect(BREAK_EVEN_CHART_HEIGHT).toBe(300)
  })

  it('02 미니데모보다 큰 데모가 되지 않는다', () => {
    expect(BREAK_EVEN_CHART_HEIGHT).toBeLessThanOrEqual(320)
  })
})

/*
 * 이 파일에는 테스트가 없었다. 헤드라인(「N개월째에 투자금을 회수합니다」)과 곡선이
 * **서로 다른 식으로 구해지면 문구와 선이 어긋난다** — 컴포넌트 주석이 `Math.ceil` 을
 * 쓰지 않는 이유로 든 것이 정확히 그것이라, 그 불변식을 여기서 잠근다.
 */
describe('BreakEvenChart — 누적 손익 계열', () => {
  it('0개월부터 그려 시작점이 초기 투자액이다', () => {
    const points = buildCumulativeProfit()

    expect(points).toHaveLength(13)
    expect(points[0].periodLabel).toBe('0개월')
    // 개업 시점은 아직 아무것도 못 벌었으므로 정확히 -초기투자다.
    expect(points[0].value).toBeLessThan(0)
  })

  it('매달 같은 금액씩 오른다', () => {
    const points = buildCumulativeProfit()
    const steps = points.slice(1).map((p, i) => p.value - points[i].value)

    expect(new Set(steps).size).toBe(1)
    expect(steps[0]).toBeGreaterThan(0)
  })

  it('손익분기 달이 계열에서 처음 0 이상이 되는 달과 일치한다', () => {
    const points = buildCumulativeProfit()
    const month = findBreakEvenMonth(points)

    expect(month).not.toBeNull()
    // 그 달은 0 이상이고, 바로 앞 달은 아직 음수여야 한다 — 「처음」의 정의다.
    expect(points[month!].value).toBeGreaterThanOrEqual(0)
    expect(points[month! - 1].value).toBeLessThan(0)
  })

  it('기간 안에 넘지 못하면 null 을 낸다', () => {
    // 1개월치만 그리면 초기 투자를 회수하지 못한다.
    expect(findBreakEvenMonth(buildCumulativeProfit(1))).toBeNull()
  })
})

describe('formatManwonTick — 금액 눈금 (TC-SP-007)', () => {
  it.each([
    [0, '0'],
    [6000, '+6,000만'],
    [-6000, '-6,000만'],
    [-12000, '-1.2억'],
    [10000, '+1억'],
  ])('%d → %s', (input, output) => {
    expect(formatManwonTick(input)).toBe(output)
  })
})

describe('BreakEvenChart — 렌더 (TC-SP-008)', () => {
  const html = () => renderToStaticMarkup(createElement(BreakEvenChart))

  /* 헤드라인 대신 차트가 그 지점을 직접 가리킨다 — 문구와 선이 같은 계열에서 나온다. */
  it('손익분기 달을 차트 위 라벨로 가리킨다', () => {
    const month = findBreakEvenMonth(buildCumulativeProfit())

    expect(html()).toContain(`${month}개월째 손익분기`)
  })

  it('헤드라인 문장과 흩어진 캡션 대신 예시 배지를 단다', () => {
    const markup = html()

    expect(markup).not.toContain('투자금을 회수합니다')
    expect(markup).not.toContain('대표 예시 데이터')
    expect(markup).toContain('예시 데이터')
  })

  it('요약 금액을 억·만으로 적는다', () => {
    expect(html()).toContain('1억 2,000만원')
  })

  it('홈 전용 꺾은선이다 — recharts 마크업이 없다', () => {
    const markup = html()

    expect(markup).toContain('<polyline')
    expect(markup).not.toContain('recharts')
  })
})
