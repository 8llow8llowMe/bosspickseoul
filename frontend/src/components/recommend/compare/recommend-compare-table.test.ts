import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RecommendCompareTable from '@/components/recommend/compare/recommend-compare-table'
import { toComparisonGroups } from '@/lib/recommend/comparison-presentation'
import type {
  CommercialComparisonBody,
  ComparisonMetric,
} from '@/types/commercial-comparison'

const emptyGroups = {
  salesMetrics: null,
  footTrafficMetrics: null,
  storeMetrics: null,
  spendingMetrics: null,
  residentPopulationMetrics: null,
  facilityMetrics: null,
  salesTimeSlotMetrics: null,
  salesAgeMetrics: null,
  salesAgeGenderMetrics: null,
  footTrafficTimeSlotMetrics: null,
  footTrafficAgeMetrics: null,
  footTrafficAgeGenderMetrics: null,
}

const body = (
  overrides: Partial<CommercialComparisonBody> = {},
): CommercialComparisonBody =>
  ({
    left: null,
    right: null,
    comparisonSummary: null,
    recommendedSide: null,
    recommendedReasons: null,
    cautionPoints: null,
    businessFitSummary: null,
    dominantTimeSlots: null,
    dominantAgeGroups: null,
    comparisonHighlights: null,
    highlights: null,
    ...emptyGroups,
    ...overrides,
  }) as CommercialComparisonBody

const render = (
  overrides: Partial<CommercialComparisonBody> = {},
  bases?: string[],
) =>
  renderToStaticMarkup(
    createElement(RecommendCompareTable, {
      groups: toComparisonGroups(body(overrides)),
      leftName: '역삼역',
      rightName: '선릉역',
      bases,
    }),
  )

/** 새 응답(BE #381) 모양의 지표. */
const metric = (
  overrides: Partial<ComparisonMetric> = {},
): ComparisonMetric => ({
  label: '총 매출액',
  leftValue: 43267840,
  rightValue: 293433501,
  diffValue: -250165661,
  diffRate: -85.25463525720602,
  unit: '원',
  displayPrecision: 0,
  differenceUnit: '원',
  description: '선택 분기의 요일별 매출액을 합산한 값입니다.',
  winnerSide: null,
  ...overrides,
})

const guideWithGroups = (
  metricGroups: { code: string; name: string; description: string }[],
) => ({
  periodBasis: null,
  serviceBasis: null,
  differenceBasis: null,
  diffRateBasis: null,
  recommendationDisclaimer: null,
  metricGroups,
})

describe('RecommendCompareTable', () => {
  it('좌·우 값과 차이를 한 표에 적는다', () => {
    const markup = render({
      salesMetrics: [
        {
          label: '월 매출',
          leftValue: 1000,
          rightValue: 600,
          diffValue: 400,
          diffRate: 66.7,
          winnerSide: null,
        },
      ],
    })

    expect(markup).toContain('역삼역')
    expect(markup).toContain('선릉역')
    expect(markup).toContain('월 매출')
    expect(markup).toContain('매출') // 묶음 소제목
    expect(markup).toContain('+400')
  })

  /**
   * 이 표의 존재 이유에 가까운 계약이다. 응답에는 지표마다 `winnerSide` 가 있지만
   * 표는 그것을 받지도, 그리지도 않는다 — 값 옆에 승패가 붙으면 사용자는 그것을
   * "더 나은 선택" 으로 읽는다. 판단은 근거가 함께 나오는 리포트 영역이 말한다.
   */
  it('winnerSide 가 와도 표에 승패를 드러내지 않는다', () => {
    const markup = render({
      salesMetrics: [
        {
          label: '월 매출',
          leftValue: 1000,
          rightValue: 600,
          diffValue: 400,
          diffRate: 66.7,
          winnerSide: { code: 'LEFT', name: '역삼역 우세', description: '' },
        },
      ],
    })

    expect(markup).not.toContain('우세')
    expect(markup).not.toContain('승')
  })

  it('중립 안내를 항상 적는다', () => {
    const markup = render({
      storeMetrics: [
        {
          label: '점포 수',
          leftValue: 12,
          rightValue: 12,
          diffValue: 0,
          diffRate: 0,
          winnerSide: null,
        },
      ],
    })

    expect(markup).toContain('어느 상권이 더 나은지는 업종과 계획에 따라')
  })

  it('값이 없으면 빈 칸 기호를 적는다', () => {
    const markup = render({
      facilityMetrics: [
        {
          label: '집객시설',
          leftValue: null,
          rightValue: null,
          diffValue: null,
          diffRate: null,
          winnerSide: null,
        },
      ],
    })

    expect(markup).toContain('—')
  })

  it('행 머리는 scope="row", 묶음 소제목은 scope="rowgroup" 이다', () => {
    const markup = render({
      salesMetrics: [
        {
          label: '월 매출',
          leftValue: 1,
          rightValue: 2,
          diffValue: -1,
          diffRate: -50,
          winnerSide: null,
        },
      ],
    })

    expect(markup).toContain('scope="row"')
    expect(markup).toContain('scope="rowgroup"')
    expect(markup).toContain('scope="col"')
  })
  it('차이 열 머리가 뺄셈 방향을 말한다', () => {
    const markup = render({ salesMetrics: [metric()] })

    expect(markup).toContain('차이 (왼쪽 − 오른쪽)')
  })

  it('새 응답이면 값·차이에 단위를, 차이 아래에 차이율을 적는다', () => {
    const markup = render({
      salesMetrics: [metric()],
      footTrafficMetrics: [
        metric({
          label: '여성 유동인구 비중',
          leftValue: 53.8,
          rightValue: 52.9,
          diffValue: 0.9,
          diffRate: 1.701323,
          unit: '%',
          displayPrecision: 1,
          differenceUnit: '%p',
        }),
      ],
    })

    expect(markup).toContain('43,267,840원')
    expect(markup).toContain('293,433,501원')
    expect(markup).toContain('-250,165,661원')
    expect(markup).toContain('차이율 -85.3%')
    expect(markup).toContain('53.8%')
    expect(markup).toContain('+0.9%p')
    expect(markup).toContain('차이율 +1.7%')
  })

  it('우측 값이 0 이면 차이율 대신 비교 불가를 적는다', () => {
    const markup = render({
      storeMetrics: [
        metric({
          label: '프랜차이즈 점포 수',
          leftValue: 3,
          rightValue: 0,
          diffValue: 3,
          diffRate: 0,
          unit: '개',
          differenceUnit: '개',
        }),
      ],
    })

    expect(markup).toContain('차이율 비교 불가')
    expect(markup).not.toContain('차이율 0')
  })

  /*
   * 도움말은 인라인 펼침이다(떠 있는 툴팁은 가로 스크롤 컨테이너에 잘린다). 설명은
   * DOM 에 늘 있고 접혀 있을 때 `hidden` 이라 `aria-controls` 가 항상 유효하다.
   */
  it('지표 설명은 지표명 옆 도움말 버튼으로 접혀 있다', () => {
    const markup = render({ salesMetrics: [metric()] })

    expect(markup).toContain('aria-label="매출 총 매출액 설명"')
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).toMatch(
      /<button[^>]*aria-controls="([^"]+)"[^>]*>[\s\S]*?id="\1"[^>]*hidden/,
    )
    expect(markup).toContain('선택 분기의 요일별 매출액을 합산한 값입니다.')
  })

  it('비교 기준 문장을 받은 그대로 표 위에 적는다', () => {
    const markup = render({ salesMetrics: [metric()] }, [
      '모든 지표는 선택한 분기의 데이터를 기준으로 합니다.',
      '차이율은 오른쪽 상권 값을 기준으로 계산합니다.',
    ])

    expect(markup).toContain('aria-label="비교 기준"')
    expect(markup).toContain(
      '모든 지표는 선택한 분기의 데이터를 기준으로 합니다.',
    )
    expect(markup).toContain('차이율은 오른쪽 상권 값을 기준으로 계산합니다.')
  })

  it('묶음 설명을 소제목 아래에 적는다', () => {
    const markup = render({
      comparisonGuide: guideWithGroups([
        {
          code: 'spendingMetrics',
          name: '소비력',
          description:
            '상권 전체의 추정 소비 지출을 비교합니다. 원천이 값을 제공하지 않는 분기에는 0 으로 표시됩니다.',
        },
      ]),
      spendingMetrics: [
        metric({
          label: '총 지출액',
          leftValue: 0,
          rightValue: 0,
          diffValue: 0,
          diffRate: 0,
        }),
      ],
    })

    expect(markup).toContain('원천이 값을 제공하지 않는 분기에는 0 으로')
    // 0 은 받은 그대로 적는다 — 실제 0 인지 결측인지 화면은 가를 수 없다.
    expect(markup).toContain('0원')
  })

  it('시간대·연령·성별 상세 묶음은 접힌 채로 시작한다', () => {
    const markup = render({
      salesMetrics: [metric()],
      salesTimeSlotMetrics: [
        metric({ label: '00-06' }),
        metric({ label: '06-11' }),
      ],
    })

    // 접근 가능한 이름이 「매출 시간대2개 지표」로 붙지 않게 사이에 공백이 있다.
    expect(markup).toMatch(/매출 시간대 <span[^>]*>2개 지표<\/span>/)
    /*
     * 소제목(`scope="rowgroup"`)과 데이터 행이 **같은 tbody** 에 있어야 머리가 행에
     * 연결된다. 접기 버튼은 그 tbody 를 가리키고, 접힌 동안 데이터 `<tr>` 만 hidden 이다.
     */
    expect(markup).toMatch(
      /<tbody id="([^"]+)"><tr><th[^>]*scope="rowgroup"[^>]*>[\s\S]*?<button[^>]*aria-expanded="false"[^>]*aria-controls="\1"[\s\S]*?<\/tr><tr hidden="">[\s\S]*?00-06[\s\S]*?<\/tr><tr hidden="">[\s\S]*?06-11[\s\S]*?<\/tr><\/tbody>/,
    )
    // 묶음마다 tbody 는 하나다(매출 + 매출 시간대 = 2).
    expect(markup.match(/<tbody/g)).toHaveLength(2)
  })

  it('핵심 묶음은 접기 버튼 없이 펼쳐져 있다', () => {
    const markup = render({ salesMetrics: [metric()] })

    expect(markup).not.toContain('개 지표')
    expect(markup).not.toMatch(/<tbody[^>]*hidden/)
    expect(markup).not.toMatch(/<tr hidden/)
  })

  /* 매출·유동인구 시간대가 둘 다 `00-06` 이다. 버튼 이름이 겹치면 스크린리더가 가르지 못한다. */
  it('도움말 버튼 이름에 묶음 이름을 붙여 겹치지 않게 한다', () => {
    const markup = render({
      salesTimeSlotMetrics: [
        metric({ label: '00-06', description: '매출 시간대 설명' }),
      ],
      footTrafficTimeSlotMetrics: [
        metric({ label: '00-06', description: '유동인구 시간대 설명' }),
      ],
    })

    expect(markup).toContain('aria-label="매출 시간대 00-06 설명"')
    expect(markup).toContain('aria-label="유동인구 시간대 00-06 설명"')
  })

  /* 같은 문장에 행마다 Tab 정지를 두지 않는다 — 묶음 설명 아래에 한 번만 적는다. */
  it('행 설명이 모두 같으면 도움말 버튼 없이 묶음에 한 번만 적는다', () => {
    const shared = '선택 분기 선택 업종의 시간대별 매출액입니다.'
    const markup = render({
      salesTimeSlotMetrics: [
        metric({ label: '00-06', description: shared }),
        metric({ label: '06-11', description: shared }),
        metric({ label: '11-14', description: shared }),
      ],
    })

    expect(markup.split(shared)).toHaveLength(2)
    expect(markup).not.toMatch(/aria-label="[^"]*설명"/)
    // 공통 설명은 소제목 칸 안(행 머리)에 있어 접혀 있어도 읽힌다.
    expect(markup).toMatch(
      new RegExp(`scope="rowgroup"[^>]*>[\\s\\S]*?${shared}[\\s\\S]*?</th>`),
    )
  })

  it('구버전 응답이면 단위·차이율·도움말·기준 목록 없이 기존대로 그린다', () => {
    const markup = render({
      salesMetrics: [
        {
          label: '월 매출',
          leftValue: 1000,
          rightValue: 600,
          diffValue: 400,
          diffRate: 66.7,
          winnerSide: null,
        },
      ],
    })

    expect(markup).toContain('1,000')
    expect(markup).toContain('+400')
    expect(markup).not.toContain('차이율')
    expect(markup).not.toContain('설명"')
    expect(markup).not.toContain('비교 기준')
  })
})
