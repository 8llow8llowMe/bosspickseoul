// src/components/home/break-even-chart.test.ts
import { describe, expect, it } from 'vitest'
import {
  BREAK_EVEN_CHART_HEIGHT,
  buildCumulativeProfit,
  findBreakEvenMonth,
} from '@/components/home/break-even-chart'

/*
 * 이슈 #223. 04단계만 데모 영역 494px 중 296px(60%)만 차서 다른 단계(92 · 85 · 68%)
 * 보다 헐렁했다. 원인은 차트 플롯이 200px 이라는 것 하나였다.
 */
describe('BreakEvenChart — 플롯 높이(#223)', () => {
  it('차트가 260px 이다', () => {
    expect(BREAK_EVEN_CHART_HEIGHT).toBe(260)
  })

  /*
   * 상한을 함께 잠근다. 낮은 뷰포트(1280×620)에서 패널이 내부 스크롤로 열화하는데,
   * 이 값을 키울수록 그 구간이 넓어진다 — 실측 없이 올리지 않도록 막는다.
   */
  it('낮은 뷰포트 여유를 넘기지 않는다', () => {
    expect(BREAK_EVEN_CHART_HEIGHT).toBeLessThanOrEqual(280)
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
