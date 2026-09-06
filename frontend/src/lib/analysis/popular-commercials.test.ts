import { describe, expect, it } from 'vitest'

import {
  resolveCommercialName,
  toPopularCommercials,
  toPopularCommercialsView,
} from '@/lib/analysis/popular-commercials'
import type { AnalysisRankingBody, AnalysisRankingItem } from '@/types/status'

const item = (patch: Partial<AnalysisRankingItem> = {}): AnalysisRankingItem =>
  ({
    rank: 1,
    areaCode: '3110008',
    areaName: '역삼역',
    viewCount: 2104,
    ...patch,
  }) as AnalysisRankingItem

const body = (rankings: AnalysisRankingItem[], windowHours = 24) =>
  ({
    areaType: { code: 'COMMERCIAL', name: '상권', description: '' },
    windowHours,
    rankings,
  }) as AnalysisRankingBody

describe('resolveCommercialName', () => {
  it('이름이 있으면 그대로 쓴다', () => {
    expect(resolveCommercialName('3110008', '역삼역')).toBe('역삼역')
  })

  /*
   * 자치구는 25개뿐이라 정적 표로 이름을 메울 수 있었지만 상권은 수천 개다.
   * 이름이 없으면 코드라도 적는다 — 이름 자리가 비면 「누를 수는 있는데 무엇인지
   * 모르는 버튼」이 된다.
   */
  it('이름이 없으면 코드라도 적는다', () => {
    expect(resolveCommercialName('3110008', null)).toBe('3110008')
    expect(resolveCommercialName('3110008', '   ')).toBe('3110008')
  })
})

describe('toPopularCommercials', () => {
  it('순위를 화면이 쓸 형태로 옮긴다', () => {
    const rows = toPopularCommercials([item()], 3)

    expect(rows).toEqual([
      { rank: 1, commercialCode: '3110008', name: '역삼역', viewCount: 2104 },
    ])
  })

  /* 역조회할 코드가 없으면 눌러도 갈 데가 없다. 죽은 행을 남기지 않는다. */
  it('코드가 없는 항목은 버린다', () => {
    const rows = toPopularCommercials(
      [
        item({ areaCode: '' }),
        item({ rank: 2, areaCode: '  ' }),
        item({ rank: 3 }),
      ],
      3,
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].rank).toBe(3)
  })

  it('패널을 밀어내지 않도록 개수를 자른다', () => {
    const rows = toPopularCommercials(
      Array.from({ length: 8 }, (_, index) =>
        item({ rank: index + 1, areaCode: `31100${index}` }),
      ),
      3,
    )

    expect(rows).toHaveLength(3)
    expect(rows.map(row => row.rank)).toEqual([1, 2, 3])
  })
})

describe('toPopularCommercialsView', () => {
  it('집계 창을 함께 낸다', () => {
    expect(toPopularCommercialsView(body([item()], 24), 3).windowLabel).toBe(
      '최근 24시간',
    )
  })

  /* 틀린 기간을 적느니 안 적는다. */
  it('집계 창이 이상하면 표기를 포기한다', () => {
    expect(
      toPopularCommercialsView(body([item()], 0), 3).windowLabel,
    ).toBeNull()
  })

  it('rankings 가 없어도 터지지 않는다', () => {
    const view = toPopularCommercialsView(
      { ...body([]), rankings: undefined } as unknown as AnalysisRankingBody,
      3,
    )

    expect(view.items).toEqual([])
  })
})
