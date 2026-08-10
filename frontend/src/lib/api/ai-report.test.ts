import { describe, expect, it } from 'vitest'

import {
  aiReportPath,
  buildAdministrationSubmitPath,
  buildCommercialSubmitPath,
  buildDistrictSubmitPath,
} from '@/lib/api/ai-report'

describe('AI 리포트 제출 경로', () => {
  it('region은 periodCode만, 상권은 serviceCode+periodCode를 쿼리로 붙인다', () => {
    expect(buildDistrictSubmitPath('11680', '20233')).toBe(
      '/ai-reports/districts/11680?periodCode=20233',
    )
    expect(buildAdministrationSubmitPath('11680640', '20233')).toBe(
      '/ai-reports/administrations/11680640?periodCode=20233',
    )
    expect(buildCommercialSubmitPath('3110008', 'CS100001', '20233')).toBe(
      '/ai-reports/commercials/3110008?serviceCode=CS100001&periodCode=20233',
    )
    expect(aiReportPath.job('job-1')).toBe('/ai-reports/jobs/job-1')
  })
})
