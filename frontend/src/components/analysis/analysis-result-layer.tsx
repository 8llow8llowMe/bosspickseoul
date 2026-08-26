'use client'

import { useAnalysisMapShell } from '@/components/analysis/analysis-map-shell-context'
import { AnalysisResultModalSurface } from '@/components/analysis/analysis-result-modal'
import AnalysisResultView from '@/components/analysis/analysis-result-view'

/**
 * 지도 셸 위에 뜨는 결과 레이어. `/analysis/result` 의 **유일한** 표면이다.
 *
 * 닫기는 셸이 소유한다 — `push` 로 열렸으면 `router.back()`, 하드 로드·공유 링크
 * 진입이면 탐색 URL 로 `replace` 한다(map-shell.md D4-5). 그래서 X 버튼·Escape·배경
 * mousedown 세 경로가 모두 같은 `closeResultLayer` 를 호출한다.
 *
 * 접근성(`role="dialog"`·`aria-modal`·포커스 트랩·Escape·스크롤 락)은
 * `AnalysisResultModalSurface` 가 그대로 담당하므로 하드 로드 경로에서도 유지된다.
 */
export default function AnalysisResultLayer() {
  const { closeResultLayer } = useAnalysisMapShell()

  return (
    <AnalysisResultModalSurface onClose={closeResultLayer}>
      <AnalysisResultView onClose={closeResultLayer} />
    </AnalysisResultModalSurface>
  )
}
