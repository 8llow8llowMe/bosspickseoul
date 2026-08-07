import { describe, expect, it } from 'vitest'

import { aiReportPath } from '@/lib/api/ai-report'

describe('aiReportPath', () => {
  it('레벨별 엔드포인트 경로를 만든다', () => {
    expect(aiReportPath.district('11680')).toBe('/ai-reports/districts/11680')
    expect(aiReportPath.administration('11680640')).toBe(
      '/ai-reports/administrations/11680640',
    )
    expect(aiReportPath.commercialSubmit('3110008')).toBe(
      '/ai-reports/commercials/3110008',
    )
    expect(aiReportPath.job('job-1')).toBe('/ai-reports/jobs/job-1')
  })
})
