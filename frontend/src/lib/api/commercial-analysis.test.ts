import { describe, expect, it } from 'vitest'

import {
  buildAnalysisContextSearchParams,
  buildDistrictsSearchParams,
  buildTrendSearchParams,
} from '@/lib/api/commercial-analysis'

describe('commercial analysis API search params', () => {
  it('지역·업종·시점 파라미터를 Swagger 이름으로 만든다', () => {
    expect(
      buildAnalysisContextSearchParams({
        districtCode: '11680',
        administrationCode: '11680640',
        serviceCode: 'CS100001',
        periodCode: '20233',
      }).toString(),
    ).toBe(
      'districtCode=11680&administrationCode=11680640&serviceCode=CS100001&periodCode=20233',
    )
  })

  it('트렌드 지표와 조회 분기 수를 Swagger 이름으로 만든다', () => {
    expect(
      buildTrendSearchParams({
        serviceCode: 'CS100001',
        metricType: 'SALES',
        periodCode: '20233',
        periodCount: 4,
      }).toString(),
    ).toBe(
      'serviceCode=CS100001&metricType=SALES&periodCode=20233&periodCount=4',
    )
  })

  it('자치구 목록의 현재 분기 파라미터를 Swagger 이름으로 만든다', () => {
    expect(buildDistrictsSearchParams('20233').toString()).toBe(
      'currentPeriodCode=20233',
    )
  })
})
