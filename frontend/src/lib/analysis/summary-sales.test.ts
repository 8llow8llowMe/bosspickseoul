import { describe, expect, it } from 'vitest'

import {
  describeSalesPerStoreEmpty,
  describeSalesPerStoreSentence,
  describeSalesShareSentence,
  describeTotalSalesCaption,
  resolveMonthlySalesPerStore,
} from '@/lib/analysis/summary-sales'

/*
 * #561 — 요약 첫 숫자는 업종 전체 합계가 아니라 점포당 월 매출이다. dev 실화면(홍대 걷고싶은
 * 거리 · 커피-음료 · 2026년 1분기): 합계 26억 3527만원 · 점포 59개 → 한 곳당 약 4466만원.
 */
describe('resolveMonthlySalesPerStore', () => {
  it('서버 점포당 값이 있으면 그대로 쓴다', () => {
    expect(
      resolveMonthlySalesPerStore({
        monthlySalesPerStore: 44_665_600,
        monthlySales: 2_635_270_379,
        storeCount: 59,
      }),
    ).toBe(44_665_600)
  })

  it('서버 값이 없으면 합계 ÷ 점포 수로 계산한다', () => {
    const value = resolveMonthlySalesPerStore({
      monthlySales: 2_635_270_379,
      storeCount: 59,
    })
    expect(value).toBeCloseTo(44_665_599.6, 0)
  })

  it('점포 수가 0 이면 나누지 않고 null 이다 — 0 원으로 적지 않는다', () => {
    expect(
      resolveMonthlySalesPerStore({ monthlySales: 1_000_000, storeCount: 0 }),
    ).toBeNull()
  })

  it('합계나 점포 수가 없으면 null 이다', () => {
    expect(resolveMonthlySalesPerStore({ storeCount: 10 })).toBeNull()
    expect(resolveMonthlySalesPerStore({ monthlySales: 1_000_000 })).toBeNull()
    expect(
      resolveMonthlySalesPerStore({
        monthlySalesPerStore: null,
        monthlySales: null,
        storeCount: null,
      }),
    ).toBeNull()
    expect(
      resolveMonthlySalesPerStore({
        monthlySalesPerStore: Number.NaN,
        monthlySales: Number.NaN,
        storeCount: 3,
      }),
    ).toBeNull()
  })

  it('합계 0 · 점포 있음은 실제 값 0 원이다', () => {
    expect(
      resolveMonthlySalesPerStore({ monthlySales: 0, storeCount: 4 }),
    ).toBe(0)
  })
})

describe('describeTotalSalesCaption', () => {
  it('합계에 분모(업종 전체)를 밝힌다', () => {
    expect(describeTotalSalesCaption('커피-음료', 2_635_270_379)).toBe(
      '커피-음료 전체 26억 3527만원',
    )
  })

  it('업종 이름이 없으면 코드 대신 「이 업종」으로 적는다', () => {
    expect(describeTotalSalesCaption(undefined, 2_635_270_379)).toBe(
      '이 업종 전체 26억 3527만원',
    )
  })

  it('합계가 없으면 캡션을 만들지 않는다', () => {
    expect(describeTotalSalesCaption('커피-음료', null)).toBeNull()
  })
})

describe('describeSalesPerStoreEmpty', () => {
  it('점포 0 · 합계 0 또는 결측이면 「점포 없음」이다', () => {
    expect(describeSalesPerStoreEmpty(0, 0)).toBe('점포 없음')
    expect(describeSalesPerStoreEmpty(0, null)).toBe('점포 없음')
    expect(describeSalesPerStoreEmpty(0, undefined)).toBe('점포 없음')
  })

  /* 원천 불일치 — 매출은 잡혔는데 점포 행이 0 이다. 「점포 없음」이라 단정하면 매출 비중과 모순된다. */
  it('점포 0 · 합계 > 0 이면 「점포 수 집계 없음」이다', () => {
    expect(describeSalesPerStoreEmpty(0, 12_000_000)).toBe('점포 수 집계 없음')
  })

  it('점포 수가 결측이거나 있으면 기본 표기를 따른다', () => {
    expect(describeSalesPerStoreEmpty(null, 12_000_000)).toBeNull()
    expect(describeSalesPerStoreEmpty(undefined, null)).toBeNull()
    expect(describeSalesPerStoreEmpty(12, 12_000_000)).toBeNull()
  })
})

describe('describeSalesPerStoreSentence', () => {
  const base = {
    commercialName: '홍대 걷고싶은 거리',
    serviceName: '커피-음료',
    storeCount: 59,
    monthlySales: 2_635_270_379,
    salesPerStore: 44_665_600,
  }

  it('점포 수와 한 곳당 월 평균을 한 문장으로 말한다 — 점포 수 단위는 화면과 같은 「개」', () => {
    expect(describeSalesPerStoreSentence(base)).toBe(
      '홍대 걷고싶은 거리의 커피-음료 점포 59개가 한 곳당 월 평균 약 4466만원어치를 팔아요.',
    )
  })

  it('점포 수에 천 단위 구분을 넣는다', () => {
    expect(
      describeSalesPerStoreSentence({ ...base, storeCount: 1_204 }),
    ).toContain('점포 1,204개가')
  })

  it('점포는 있는데 매출이 0 이면 「약 0원어치」 대신 매출이 잡히지 않았다고 말한다', () => {
    expect(
      describeSalesPerStoreSentence({
        ...base,
        storeCount: 4,
        monthlySales: 0,
        salesPerStore: 0,
      }),
    ).toBe(
      '홍대 걷고싶은 거리의 커피-음료 점포 4개가 있지만 이 분기 매출이 잡히지 않았어요.',
    )
  })

  it('점포 0 · 합계 0 또는 결측이면 점포가 없다고 말한다', () => {
    const empty = {
      ...base,
      commercialName: '경춘선숲길 우측',
      storeCount: 0,
      salesPerStore: null,
    }
    expect(describeSalesPerStoreSentence({ ...empty, monthlySales: 0 })).toBe(
      '경춘선숲길 우측에는 커피-음료 점포가 없어요.',
    )
    expect(
      describeSalesPerStoreSentence({ ...empty, monthlySales: null }),
    ).toBe('경춘선숲길 우측에는 커피-음료 점포가 없어요.')
  })

  /* 「점포가 없어요」와 「매출의 X%가 이 상권에서 나와요」가 한 설명에 같이 서면 모순이다. */
  it('점포 0 · 합계 > 0(원천 불일치)이면 첫 문장을 만들지 않는다', () => {
    expect(
      describeSalesPerStoreSentence({
        ...base,
        storeCount: 0,
        salesPerStore: null,
      }),
    ).toBeUndefined()
  })

  it('상권 이름이 없으면 「이 상권」으로 적는다', () => {
    expect(
      describeSalesPerStoreSentence({
        serviceName: '커피-음료',
        storeCount: 3,
        salesPerStore: 10_000_000,
      }),
    ).toBe(
      '이 상권의 커피-음료 점포 3개가 한 곳당 월 평균 약 1000만원어치를 팔아요.',
    )
  })

  /* 지어내지 않는다 — 업종 코드(「CS100010」)나 빈 값을 문장에 넣지 않는다. */
  it('업종 이름·점포 수·점포당 값 중 하나라도 없으면 문장을 비운다', () => {
    expect(
      describeSalesPerStoreSentence({ ...base, serviceName: undefined }),
    ).toBeUndefined()
    expect(
      describeSalesPerStoreSentence({ ...base, serviceName: '  ' }),
    ).toBeUndefined()
    expect(
      describeSalesPerStoreSentence({ ...base, storeCount: null }),
    ).toBeUndefined()
    expect(
      describeSalesPerStoreSentence({ ...base, salesPerStore: null }),
    ).toBeUndefined()
  })
})

describe('describeSalesShareSentence', () => {
  it('행정동 안 업종 매출 중 이 상권 몫을 말한다', () => {
    expect(
      describeSalesShareSentence({
        administrationName: '서교동',
        serviceName: '커피-음료',
        share: 0.0975,
      }),
    ).toBe('서교동 전체 커피-음료 매출의 9.8%가 이 상권에서 나와요.')
  })

  it('비중이 없거나 0~1 밖이면 문장을 비운다', () => {
    const base = { administrationName: '서교동', serviceName: '커피-음료' }
    expect(
      describeSalesShareSentence({ ...base, share: undefined }),
    ).toBeUndefined()
    expect(describeSalesShareSentence({ ...base, share: 1.2 })).toBeUndefined()
    expect(describeSalesShareSentence({ ...base, share: -0.1 })).toBeUndefined()
    expect(
      describeSalesShareSentence({ ...base, share: Number.NaN }),
    ).toBeUndefined()
  })

  it('행정동·업종 이름이 없으면 문장을 비운다', () => {
    expect(
      describeSalesShareSentence({
        administrationName: undefined,
        serviceName: '커피-음료',
        share: 0.1,
      }),
    ).toBeUndefined()
    expect(
      describeSalesShareSentence({
        administrationName: '서교동',
        serviceName: null,
        share: 0.1,
      }),
    ).toBeUndefined()
  })
})
