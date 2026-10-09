import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationResultPreview from '@/components/simulation/simulation-result-preview'
import { KEY_MONEY_EXCLUDED_NOTE } from '@/lib/simulation/report-presentation'
import type { SimulationReport } from '@/types/simulation'

const report = (
  overrides: Partial<SimulationReport> = {},
): SimulationReport => ({
  condition: {
    franchisee: false,
    franchiseeId: null,
    brandName: null,
    districtCode: '11740',
    districtName: '강동구',
    serviceCode: 'CS100001',
    serviceName: '한식음식점',
    storeSize: 66,
    floorType: { code: 'FIRST_FLOOR', name: '1층', description: '1층 점포' },
    periodCode: '20233',
  },
  dataBaseYear: '2024',
  totalPrice: 23_450,
  keyMoney: { keyMoneyRatio: 62, keyMoneyAverage: 4_200, keyMoneyLevel: 63 },
  costDetail: { rentPrice: 300, deposit: 3_000, interior: 5_000, levy: null },
  similarFranchisees: [],
  genderAgeAnalysis: null,
  seasonAnalysis: null,
  ...overrides,
})

describe('SimulationResultPreview', () => {
  it('총 창업 비용을 만원 단위 표기로 보여준다', () => {
    const markup = renderToStaticMarkup(
      createElement(SimulationResultPreview, {
        report: report(),
        reportHref: '/simulation/report',
        compareHref: '/simulation/compare?a.franchisee=false',
      }),
    )

    // totalPrice 는 만원 단위다. 23,450만원 = 2억 3,450만원.
    expect(markup).toContain('2억 3,450만원')
    expect(markup).toContain('예상 총 창업 비용')
  })

  it('기준 연도 안내문을 반드시 노출한다', () => {
    const markup = renderToStaticMarkup(
      createElement(SimulationResultPreview, {
        report: report(),
        reportHref: '/simulation/report',
        compareHref: '/simulation/compare?a.franchisee=false',
      }),
    )

    expect(markup).toContain('2024년 자료로 계산한 결과예요.')
  })

  it('조건 요약에 응답의 floorType 이름을 쓴다', () => {
    const markup = renderToStaticMarkup(
      createElement(SimulationResultPreview, {
        report: report(),
        reportHref: '/simulation/report',
        compareHref: '/simulation/compare?a.franchisee=false',
      }),
    )

    expect(markup).toContain('강동구')
    expect(markup).toContain('한식음식점')
    expect(markup).toContain('66㎡ (약 20평)')
    expect(markup).toContain('1층')
    expect(markup).toContain('개인 창업')
  })

  it('프랜차이즈면 브랜드명을 보여준다', () => {
    const markup = renderToStaticMarkup(
      createElement(SimulationResultPreview, {
        report: report({
          condition: {
            ...report().condition,
            franchisee: true,
            franchiseeId: 101,
            brandName: '테스트브랜드',
          },
        }),
        reportHref: '/simulation/report',
        compareHref: '/simulation/compare?a.franchisee=false',
      }),
    )

    expect(markup).toContain('테스트브랜드')
    expect(markup).toContain('프랜차이즈')
  })

  it('상세 리포트로 가는 링크를 준다', () => {
    const markup = renderToStaticMarkup(
      createElement(SimulationResultPreview, {
        report: report(),
        reportHref: '/simulation/report?franchisee=false',
        compareHref: '/simulation/compare?a.franchisee=false',
      }),
    )

    expect(markup).toContain('상세 리포트 보기')
    expect(markup).toContain('/simulation/report?franchisee=false')
    // 권리금은 리포트 화면 몫이다 — 총액에 들지 않는 값을 요약 카드에 섞지 않는다.
    expect(markup).not.toContain('4,200')
  })

  it('이 조건을 A 에 채운 비교 화면으로 가는 링크를 준다 (B12)', () => {
    const markup = renderToStaticMarkup(
      createElement(SimulationResultPreview, {
        report: report(),
        reportHref: '/simulation/report',
        compareHref: '/simulation/compare?a.franchisee=false',
      }),
    )

    expect(markup).toContain('다른 조건과 비교')
    expect(markup).toContain('href="/simulation/compare?a.franchisee=false"')
  })
})

/*
 * B8 — 계산 직후 사용자가 보는 것은 이 카드다. 총액만 두면 무엇이 이만큼인지 알려고 화면을
 * 옮겨야 했다. 행·비중은 리포트 비용 구성과 같은 함수에서 나와야 두 화면이 어긋나지 않는다.
 */
describe('비용 구성 행 (B8)', () => {
  const render = (overrides: Partial<SimulationReport> = {}) =>
    renderToStaticMarkup(
      createElement(SimulationResultPreview, {
        report: report(overrides),
        reportHref: '/simulation/report',
        compareHref: '/simulation/compare',
      }),
    )

  it('항목마다 리포트와 같은 라벨·금액·비중을 보여준다', () => {
    const markup = render()

    // 300 / 3,000 / 5,000 → 합 8,300. 비중은 도넛과 같은 반올림(4 · 36 · 60).
    expect(markup).toContain('첫 달 임대료')
    expect(markup).toContain('300만원')
    expect(markup).toContain('4%')
    expect(markup).toContain('보증금')
    expect(markup).toContain('3,000만원')
    expect(markup).toContain('36%')
    expect(markup).toContain('인테리어')
    expect(markup).toContain('5,000만원')
    expect(markup).toContain('60%')
  })

  it('개인 창업은 가맹 부담금 행이 없고, 프랜차이즈는 0원이어도 남긴다', () => {
    expect(render()).not.toContain('가맹 부담금')

    const franchise = render({
      costDetail: { rentPrice: 300, deposit: 3_000, interior: 5_000, levy: 0 },
    })
    // 0 은 formatLargeWon 이 「0원」으로 적는다. 행 안에서 라벨·금액·비중을 함께 본다 —
    // 「0만원」 같은 부분 문자열은 「300만원」에도 걸려 아무것도 검증하지 못한다.
    expect(franchise).toMatch(
      /가맹 부담금<\/dt><dd><strong[^>]*>0원<\/strong> <span[^>]*>0%/,
    )
  })

  it('버림 안내를 항상 둔다 — 항목 합이 총액과 어긋날 수 있다', () => {
    // 항목 합 8,300 · 총액 8,302 → 차이 2만원(항목 3개면 최대 2만원까지 버림으로 설명된다).
    const markup = render({ totalPrice: 8_302 })

    expect(markup).toContain('금액은 만원 미만을 버려 표시해요.')
    expect(markup).toContain('항목을 더하면 합계와 2만원 차이가 나요.')
  })

  it('합계 행은 리포트에만 둔다 — 카드의 헤드라인이 합계다', () => {
    const markup = render()

    expect(markup).not.toContain('이후 매달 같은 금액이 나가요')
    expect(markup).not.toContain('합계 · 예상 총 창업 비용')
  })
})

/*
 * #554 — 대부분은 이 카드에서 멈춘다. 권리금이 빠졌다는 사실이 리포트에만 있으면 수천만 원이
 * 빠진 금액을 필요 자금으로 받아들인다. 보증금도 왜 그 금액인지 카드에서 밝힌다.
 */
describe('권리금 제외 · 보증금 근거 (#554)', () => {
  const render = (overrides: Partial<SimulationReport> = {}) =>
    renderToStaticMarkup(
      createElement(SimulationResultPreview, {
        report: report(overrides),
        reportHref: '/simulation/report',
        compareHref: '/simulation/compare',
      }),
    )

  it('각주에 리포트와 같은 권리금 제외 문장을 둔다', () => {
    const markup = render()

    expect(markup).toContain(KEY_MONEY_EXCLUDED_NOTE)
    // 버림 안내 뒤에 이어 붙인다 — 합이 맞아도(차이 문장이 없어도) 늘 남는다.
    expect(markup).toContain(
      `금액은 만원 미만을 버려 표시해요. ${KEY_MONEY_EXCLUDED_NOTE}`,
    )
  })

  it('보증금 행에 근거를 캡션으로 붙인다', () => {
    const markup = render()

    expect(markup).toMatch(
      /임대 보증금 <span[^>]*>월 임대료 10개월분<\/span><\/dt>/,
    )
  })

  it('권리금 금액은 여전히 카드에 섞지 않는다', () => {
    expect(render()).not.toContain('4,200')
  })
})

/*
 * 계산 **전**에는 같은 문구가 h2 인데(`simulation-result-panel.tsx`) 계산 뒤에는
 * <p> 로 강등돼 있었다 — 페이지에서 제일 중요한 출력이 제목 아웃라인에서 사라져
 * 제목 단위로 훑는 사용자가 답을 건너뛴다(과업 흐름 감사 J3-3).
 */
describe('결과 제목 (과업 흐름 감사 J3-3)', () => {
  it('계산 결과의 「예상 총 창업 비용」은 heading 이다', () => {
    const html = renderToStaticMarkup(
      createElement(SimulationResultPreview, {
        report: report(),
        reportHref: '/simulation/report',
        compareHref: '/simulation/compare?a.franchisee=false',
      }),
    )

    expect(html).toMatch(/<h2[^>]*>예상 총 창업 비용<\/h2>/)
  })
})
