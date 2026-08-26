import type { Metadata } from 'next'

import AnalysisResultLayer from '@/components/analysis/analysis-result-layer'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '상권분석 결과',
  description: '선택한 상권과 업종 기준의 분석 결과를 확인합니다.',
  path: '/analysis/result',
  index: false,
})

/**
 * `/analysis/result` — 지도 셸 위에 열리는 결과 레이어.
 *
 * 하드 로드·새로고침·공유 링크 진입도 이 한 경로를 탄다. 예전의 `@modal`
 * intercepting route + 독립 결과 페이지 2표면 구조는 폐기됐다(map-shell.md D3-1).
 */
export default function Page() {
  return <AnalysisResultLayer />
}
