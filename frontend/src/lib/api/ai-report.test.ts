import { describe, expect, it } from 'vitest'

import { aiReportPath, buildCommercialSubmitPath } from '@/lib/api/ai-report'

describe('aiReportPath', () => {
  it('레벨별 엔드포인트 경로를 만든다', () => {
    expect(aiReportPath.district('11680')).toBe('/ai-reports/districts/11680')
    expect(aiReportPath.administration('11680640')).toBe(
      '/ai-reports/administrations/11680640',
    )
    expect(aiReportPath.job('job-1')).toBe('/ai-reports/jobs/job-1')
  })
})

describe('buildCommercialSubmitPath', () => {
  it('serviceCode/periodCode를 쿼리로 포함한 경로를 만든다', () => {
    expect(buildCommercialSubmitPath('3110008', 'CS100001', '20233')).toBe(
      '/ai-reports/commercials/3110008?serviceCode=CS100001&periodCode=20233',
    )
  })
})
