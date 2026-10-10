import { describe, expect, it } from 'vitest'

import {
  buildSimulationCompareHref,
  buildSimulationCompareHrefFromReport,
  isSameSimulationComparePair,
  parseSimulationCompareConditionPair,
  parseSimulationComparePair,
  resolveSimulationPairFailedSide,
} from '@/lib/simulation/compare-route'
import type { SimulationReportRequest } from '@/types/simulation'

const personal: SimulationReportRequest = {
  franchisee: false,
  districtCode: '11740',
  serviceCode: 'CS100001',
  storeSize: 66,
  floorType: 'FIRST_FLOOR',
}

const franchise: SimulationReportRequest = {
  franchisee: true,
  franchiseeId: 101,
  districtCode: '11680',
  serviceCode: 'CS100008',
  storeSize: 40,
  floorType: 'OTHER',
}

/** `buildSimulationCompareHref` 의 결과에서 쿼리만 떼어 파서에 물린다. */
const readBack = (href: string) =>
  new URLSearchParams(href.slice(href.indexOf('?') + 1))

describe('buildSimulationCompareHref', () => {
  it('좌우를 a. / b. 접두사로 싣는다', () => {
    const href = buildSimulationCompareHref({
      left: personal,
      right: franchise,
    })

    expect(href.startsWith('/simulation/compare?')).toBe(true)
    const params = readBack(href)
    expect(params.get('a.districtCode')).toBe('11740')
    expect(params.get('a.franchisee')).toBe('false')
    expect(params.get('b.districtCode')).toBe('11680')
    expect(params.get('b.franchiseeId')).toBe('101')
  })

  it('비프랜차이즈 쪽에는 franchiseeId 키를 싣지 않는다', () => {
    const params = readBack(
      buildSimulationCompareHref({ left: personal, right: franchise }),
    )

    expect(params.has('a.franchiseeId')).toBe(false)
    expect(params.has('b.franchiseeId')).toBe(true)
  })

  it('한쪽만 있으면 그쪽 키만 싣는다 — 리포트의 "비교에 추가" 경로다', () => {
    const params = readBack(
      buildSimulationCompareHref({ left: personal, right: null }),
    )

    expect(params.get('a.districtCode')).toBe('11740')
    expect(params.has('b.districtCode')).toBe(false)
    expect(params.has('b.franchisee')).toBe(false)
  })

  it('양쪽이 다 없으면 쿼리 없는 맨 경로다', () => {
    expect(buildSimulationCompareHref({ left: null, right: null })).toBe(
      '/simulation/compare',
    )
  })

  it('analysis variant 는 분석 하위 경로를 쓴다', () => {
    const href = buildSimulationCompareHref(
      { left: personal, right: franchise },
      'analysis',
    )

    expect(href.startsWith('/analysis/simulation/compare?')).toBe(true)
  })
})

describe('parseSimulationComparePair (쿼리스트링 → 완성된 요청 쌍)', () => {
  it('쌍을 왕복시켜도 값이 그대로다', () => {
    const pair = parseSimulationComparePair(
      readBack(
        buildSimulationCompareHref({ left: personal, right: franchise }),
      ),
    )

    expect(pair.left).toEqual(personal)
    expect(pair.right).toEqual(franchise)
  })

  it('한쪽이 결손이면 그쪽만 null 이고 오류가 아니다', () => {
    const pair = parseSimulationComparePair(
      readBack(buildSimulationCompareHref({ left: personal, right: null })),
    )

    expect(pair.left).toEqual(personal)
    expect(pair.right).toBeNull()
  })

  it('한쪽이 절반만 유효하면 그쪽은 null 이지만 반대쪽은 살아남는다', () => {
    const params = new URLSearchParams({
      'a.franchisee': 'false',
      'a.districtCode': '11740',
      'a.serviceCode': 'CS100001',
      'a.storeSize': '66',
      'a.floorType': 'FIRST_FLOOR',
      // 오른쪽은 자치구만 있다 — 요청으로 완성되지 않는다.
      'b.districtCode': '11680',
    })

    const pair = parseSimulationComparePair(params)
    expect(pair.left).toEqual(personal)
    expect(pair.right).toBeNull()
  })

  it('프랜차이즈인데 브랜드가 없으면 완성으로 보지 않는다', () => {
    const params = new URLSearchParams({
      'a.franchisee': 'true',
      'a.districtCode': '11680',
      'a.serviceCode': 'CS100008',
      'a.storeSize': '40',
      'a.floorType': 'OTHER',
    })

    expect(parseSimulationComparePair(params).left).toBeNull()
  })

  it('접두사 없는 단일 리포트 키는 어느 쪽으로도 읽지 않는다', () => {
    const params = new URLSearchParams({
      franchisee: 'false',
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: '66',
      floorType: 'FIRST_FLOOR',
    })

    const pair = parseSimulationComparePair(params)
    expect(pair.left).toBeNull()
    expect(pair.right).toBeNull()
  })
})

describe('parseSimulationCompareConditionPair', () => {
  it('미완성 조건도 읽어 편집기 초기값으로 준다', () => {
    const params = new URLSearchParams({
      'a.franchisee': 'true',
      'a.districtCode': '11680',
      'a.serviceCode': 'CS100008',
      'a.franchiseeId': '101',
      'a.brandName': '메가커피',
    })

    const pair = parseSimulationCompareConditionPair(params)
    expect(pair.left.districtCode).toBe('11680')
    expect(pair.left.franchiseeId).toBe(101)
    // brandName 은 표시 전용이지만 조건 코덱은 싣고 읽는다 — 편집기가 브랜드명을 써야 한다.
    expect(pair.left.brandName).toBe('메가커피')
    // 매장 조건이 비어 있어도 오류가 아니다.
    expect(pair.left.storeSize).toBeNull()
  })

  it('한쪽이 통째로 비어도 빈 상태를 준다 (null 이 아니다)', () => {
    const pair = parseSimulationCompareConditionPair(new URLSearchParams())

    expect(pair.left.districtCode).toBeNull()
    expect(pair.right.districtCode).toBeNull()
  })
})

/*
 * C1 — 비교 편집기는 고른 브랜드를 「브랜드 · 변경」 한 줄로 접는다. 그 줄에 이름을 쓰려면 URL 이
 * 표시용 brandName 을 들고 있어야 한다(id 만으로는 이름을 모른다).
 */
describe('buildSimulationCompareHref — 표시용 브랜드명 (C1)', () => {
  it('프랜차이즈 쪽에만 brandName 을 접두사와 함께 싣는다', () => {
    const params = readBack(
      buildSimulationCompareHref(
        { left: franchise, right: personal },
        'standalone',
        { left: '  맛나감자탕 ', right: '무시됨' },
      ),
    )

    expect(params.get('a.brandName')).toBe('맛나감자탕')
    // 개인 창업 쪽은 브랜드가 없다 — 이름이 와도 싣지 않는다.
    expect(params.get('b.brandName')).toBeNull()
  })

  it('편집기 초기값으로 이름이 되돌아오고, 조회 요청에는 섞이지 않는다', () => {
    const params = readBack(
      buildSimulationCompareHref(
        { left: franchise, right: personal },
        'standalone',
        { left: '맛나감자탕' },
      ),
    )

    expect(parseSimulationCompareConditionPair(params).left.brandName).toBe(
      '맛나감자탕',
    )
    expect(parseSimulationComparePair(params).left).toEqual(franchise)
  })
})

/*
 * C2 — 결과 무효화와 「같은 계산 다시」 판정이 이 함수 하나에 걸린다. href 로 견주면 표시용
 * brandName 만 달라도 다른 조건이 된다.
 */
describe('isSameSimulationComparePair', () => {
  it('좌우가 모두 같아야 같다', () => {
    expect(
      isSameSimulationComparePair(
        { left: personal, right: franchise },
        { left: { ...personal }, right: { ...franchise } },
      ),
    ).toBe(true)
    expect(
      isSameSimulationComparePair(
        { left: personal, right: franchise },
        { left: personal, right: { ...franchise, storeSize: 41 } },
      ),
    ).toBe(false)
  })

  it('한쪽이 미완성(null)이면 같지 않다', () => {
    expect(
      isSameSimulationComparePair(
        { left: personal, right: null },
        { left: personal, right: null },
      ),
    ).toBe(false)
  })
})

describe('resolveSimulationPairFailedSide', () => {
  it('실패 여부 둘을 쪽으로 바꾼다', () => {
    expect(resolveSimulationPairFailedSide(true, false)).toBe('left')
    expect(resolveSimulationPairFailedSide(false, true)).toBe('right')
    expect(resolveSimulationPairFailedSide(true, true)).toBe('both')
    expect(resolveSimulationPairFailedSide(false, false)).toBeNull()
  })
})

/** #567 — 조건 하나에서 비교로 넘어가면 B 는 A 의 복사본으로 시작한다(결정 D-3). */
describe('buildSimulationCompareHrefFromReport', () => {
  it('B 에 A 를 그대로 복사한다 — 편집기 양쪽이 같은 조건으로 열린다', () => {
    const href = buildSimulationCompareHrefFromReport(
      { ...franchise, periodCode: '20261' },
      'standalone',
      '맛나감자탕',
    )
    const pair = parseSimulationCompareConditionPair(readBack(href))

    expect(pair.right).toEqual(pair.left)
    expect(pair.left.brandName).toBe('맛나감자탕')
    expect(pair.left.franchiseeId).toBe(101)
  })

  it('복사한 쌍은 같은 계산이다 — 비교 화면은 이 쌍을 조회하지 않는다', () => {
    const href = buildSimulationCompareHrefFromReport(personal, 'analysis')
    const pair = parseSimulationComparePair(readBack(href))

    expect(href.startsWith('/analysis/simulation/compare?')).toBe(true)
    expect(pair.left).not.toBeNull()
    expect(
      isSameSimulationComparePair(pair, { left: personal, right: personal }),
    ).toBe(true)
  })
})
