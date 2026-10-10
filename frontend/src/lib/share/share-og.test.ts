import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { CommercialBenchmark } from '@/types/commercial-analysis'
import {
  buildShareOgCard,
  createGlyphChecker,
  readShareOgLookup,
  type ShareOgLookup,
} from './share-og'

const hasGlyph = createGlyphChecker(
  readFileSync(join(process.cwd(), 'public/fonts/charset.txt'), 'utf8'),
)

const PAYLOAD = {
  districtCode: '11110',
  administrationCode: '11110515',
  commercialCode: '3110008',
  serviceCode: 'CS100010',
  periodCode: '20252',
}

const LOOKUP: ShareOgLookup = {
  shareType: 'COMMERCIAL_ANALYSIS',
  commercialCode: '3110008',
  serviceCode: 'CS100010',
  periodCode: '20252',
}

/** dev `GET /commercials/3110008/benchmarks?serviceCode=CS100010&periodCode=20252` 에서 필요한 부분만 옮겼다. */
const BENCHMARK: CommercialBenchmark = {
  commercialCode: '3110008',
  commercialName: '배화여자대학교(박노수미술관)',
  districtName: '종로구',
  administrationName: '청운효자동',
  salesSummary: {
    commercial: {
      code: '3110008',
      serviceName: '커피-음료',
      monthlySalesAmount: 2352271044,
    },
  },
  salesPerStore: {
    serviceCode: 'CS100010',
    serviceName: '커피-음료',
    commercial: {
      code: '3110008',
      monthlySalesAmount: 2352271044,
      storeCount: 45,
      monthlySalesPerStore: 52272690,
    },
  },
}

describe('readShareOgLookup', () => {
  it('상권분석·AI 리포트 공유에서 지표 조회 코드를 꺼낸다', () => {
    expect(
      readShareOgLookup({
        ok: true,
        shareType: 'COMMERCIAL_ANALYSIS',
        payload: PAYLOAD,
      }),
    ).toEqual(LOOKUP)
    expect(
      readShareOgLookup({ ok: true, shareType: 'AI_REPORT', payload: PAYLOAD }),
    ).toEqual({ ...LOOKUP, shareType: 'AI_REPORT' })
  })

  it.each([
    ['비교(분기 없음)', 'COMMERCIAL_COMPARISON'],
    ['행정동 탐색(업종 없음)', 'ADMINISTRATION_ANALYSIS'],
    ['자치구 현황', 'DISTRICT_ANALYSIS'],
    ['알 수 없는 유형', 'SOMETHING_NEW'],
    ['유형 없음', null],
  ])('%s 공유는 기본 이미지다', (_, shareType) => {
    expect(
      readShareOgLookup({ ok: true, shareType, payload: PAYLOAD }),
    ).toBeNull()
  })

  it('해석 실패·코드 누락·분기 형식 오류는 null 이다', () => {
    expect(readShareOgLookup({ ok: false })).toBeNull()
    expect(
      readShareOgLookup({
        ok: true,
        shareType: 'COMMERCIAL_ANALYSIS',
        payload: { ...PAYLOAD, serviceCode: ' ' },
      }),
    ).toBeNull()
    expect(
      readShareOgLookup({
        ok: true,
        shareType: 'COMMERCIAL_ANALYSIS',
        payload: { ...PAYLOAD, periodCode: '2025Q2' },
      }),
    ).toBeNull()
    expect(
      readShareOgLookup({
        ok: true,
        shareType: 'COMMERCIAL_ANALYSIS',
        payload: [PAYLOAD],
      }),
    ).toBeNull()
  })
})

describe('buildShareOgCard', () => {
  it('상권명·업종·분기와 점포당 월 매출·점포 수를 싣는다', () => {
    expect(buildShareOgCard(LOOKUP, BENCHMARK, hasGlyph)).toEqual({
      kind: '상권분석',
      period: '2025년 2분기',
      title: '배화여자대학교(박노수미술관)',
      subtitle: '종로구 청운효자동 · 커피-음료',
      metrics: [
        { label: '점포당 월 매출', value: '약 5227만원' },
        { label: '같은 업종 점포', value: '45개' },
      ],
    })
  })

  it('AI 리포트는 유형 칩만 다르다', () => {
    expect(
      buildShareOgCard(
        { ...LOOKUP, shareType: 'AI_REPORT' },
        BENCHMARK,
        hasGlyph,
      )?.kind,
    ).toBe('AI 리포트')
  })

  it('#485 이전 응답(salesPerStore 없음)이면 점포당 값을 셀 수 없어 지표가 없다 — 기본 이미지', () => {
    expect(
      buildShareOgCard(LOOKUP, { ...BENCHMARK, salesPerStore: null }, hasGlyph),
    ).toBeNull()
  })

  it('점포당 값이 서버에 없으면 합계 ÷ 점포 수로 낸다(요약 카드와 같은 규칙)', () => {
    const card = buildShareOgCard(
      LOOKUP,
      {
        ...BENCHMARK,
        salesPerStore: {
          ...BENCHMARK.salesPerStore,
          commercial: { monthlySalesAmount: 100_000_000, storeCount: 4 },
        },
      },
      hasGlyph,
    )
    expect(card?.metrics).toEqual([
      { label: '점포당 월 매출', value: '약 2500만원' },
      { label: '같은 업종 점포', value: '4개' },
    ])
  })

  it('점포 0 이면 점포당 매출·점포 수를 적지 않고, 남는 지표가 없으면 기본 이미지다', () => {
    expect(
      buildShareOgCard(
        LOOKUP,
        {
          ...BENCHMARK,
          salesPerStore: {
            ...BENCHMARK.salesPerStore,
            commercial: {
              monthlySalesAmount: 5_000_000,
              storeCount: 0,
              monthlySalesPerStore: null,
            },
          },
        },
        hasGlyph,
      ),
    ).toBeNull()
  })

  it('업종 이름이 응답에 없으면 정적 카탈로그로 채운다', () => {
    const card = buildShareOgCard(
      LOOKUP,
      {
        ...BENCHMARK,
        salesPerStore: { ...BENCHMARK.salesPerStore, serviceName: null },
      },
      hasGlyph,
    )
    expect(card?.subtitle).toBe('종로구 청운효자동 · 커피-음료')
  })

  it('상권 이름이 없거나 응답이 없으면 기본 이미지다', () => {
    expect(
      buildShareOgCard(LOOKUP, { ...BENCHMARK, commercialName: ' ' }, hasGlyph),
    ).toBeNull()
    expect(buildShareOgCard(LOOKUP, null, hasGlyph)).toBeNull()
  })

  it('행정동명이 원천에서 깨져 ? 가 있으면 부제에서 행정동만 뺀다', () => {
    const card = buildShareOgCard(
      LOOKUP,
      { ...BENCHMARK, administrationName: '종로1?2?3?4가동' },
      hasGlyph,
    )
    expect(card?.subtitle).toBe('종로구 · 커피-음료')
  })

  it('상권명에 ? 가 있으면 깨진 이름을 그리지 않고 기본 이미지다', () => {
    expect(
      buildShareOgCard(
        LOOKUP,
        { ...BENCHMARK, commercialName: '종로1?2가 골목' },
        hasGlyph,
      ),
    ).toBeNull()
  })

  it('폰트 서브셋(KS X 1001) 밖 글자가 있으면 빈칸으로 그리지 않고 기본 이미지로 보낸다', () => {
    // 「똠」은 KS X 1001 완성형 2,350자 밖이다.
    expect(hasGlyph('똠')).toBe(false)
    expect(
      buildShareOgCard(
        LOOKUP,
        { ...BENCHMARK, commercialName: '똠양꿍 골목' },
        hasGlyph,
      ),
    ).toBeNull()
  })
})
