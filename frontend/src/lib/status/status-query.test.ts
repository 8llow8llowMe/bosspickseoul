import { describe, expect, it } from 'vitest'

import { HOME_TOP_TEN_QUERY_KEY } from '@/hooks/use-district-top-ten'
import { ANALYSIS_PERIOD_CODE } from '@/lib/analysis/selection'
import { statusQueryKeys } from '@/lib/status/status-query'

describe('statusQueryKeys', () => {
  it('Top10 키에 분기를 넣어 분기별 캐시를 가른다', () => {
    expect(statusQueryKeys.topTen('20261')).toEqual([
      'status',
      'topTen',
      '20261',
    ])
    expect(statusQueryKeys.topTen('20261')).not.toEqual(
      statusQueryKeys.topTen('20233'),
    )
  })

  it('상세 키에 분기와 구 코드를 함께 넣는다', () => {
    expect(statusQueryKeys.detail('20233', '11680')).toEqual([
      'status',
      'detail',
      '20233',
      '11680',
    ])
    expect(statusQueryKeys.detail('20233', '11680')).not.toEqual(
      statusQueryKeys.detail('20261', '11680'),
    )
  })

  it('홈 Top10 키는 최신 분기를 담고 status 키와 겹치지 않는다', () => {
    expect(HOME_TOP_TEN_QUERY_KEY).toEqual([
      'home',
      'districtTopTen',
      ANALYSIS_PERIOD_CODE,
    ])
    // 같은 분기여도 홈과 status 는 retry·staleTime 이 달라 캐시를 나눈다(status.md 1.6).
    expect(HOME_TOP_TEN_QUERY_KEY).not.toEqual(
      statusQueryKeys.topTen(ANALYSIS_PERIOD_CODE),
    )
  })
})
