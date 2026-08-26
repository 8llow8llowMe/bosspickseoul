import type { ReactNode } from 'react'

import AnalysisMapShell from '@/components/analysis/analysis-map-shell'

/**
 * 지도 셸 레이아웃.
 *
 * URL 세그먼트가 없는 라우트 그룹 `(map-shell)` 을 쓰는 이유: `analysis/layout.tsx`
 * 는 `/analysis/**` 전체(= `report`·`simulation` 포함)에 걸리므로 그 자리에 지도를
 * 올릴 수 없다. 지도를 원하는 두 라우트(`/analysis`, `/analysis/result`)만 이 그룹
 * 안에 둔다. 정본: `docs/features/analysis/map-shell.md` D3-1.
 *
 * App Router 레이아웃은 형제 라우트 이동에서 리마운트되지 않으므로, 두 라우트를
 * 오가도 지도 인스턴스와 셸 상태가 유지된다.
 */
export default function AnalysisMapShellLayout({
  children,
}: {
  children: ReactNode
}) {
  return <AnalysisMapShell>{children}</AnalysisMapShell>
}
