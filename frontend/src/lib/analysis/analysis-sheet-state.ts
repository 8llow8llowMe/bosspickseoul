/**
 * 상권 분석 모바일 바텀시트의 스냅/드래그 순수 로직.
 *
 * status(`status-state`)·recommend(`recommend-state`) 바텀시트와 동일한 패턴을
 * 따른다: `height` + `clamp()` 드래그, 2단 스냅(collapsed/expanded), 탭/드래그/키보드
 * 판정. 서비스 전반의 바텀시트 인터랙션 일관성을 위해 시각·동작 규칙을 맞춘다.
 */

export type AnalysisSheetSnap = 'collapsed' | 'expanded'

/** 접힘 상태 높이. 단계 라벨 + 선택 요약 + AI 칩을 담아 status/recommend보다 크다. */
export const ANALYSIS_SHEET_COLLAPSED_HEIGHT = 72
export const ANALYSIS_SHEET_EXPANDED_RATIO = 0.72
export const ANALYSIS_SHEET_MINIMUM_MAP_HEIGHT = 180
/** 탭과 드래그를 가르는 이동 임계값(px). */
export const ANALYSIS_SHEET_DRAG_TOLERANCE = 4
/** 드래그로 스냅을 전환하는 최소 이동 비율(전체 여정 대비). */
export const ANALYSIS_SHEET_SNAP_RATIO = 0.3

export const getAnalysisSheetHeightBounds = (
  viewportHeight: number,
): { collapsedHeight: number; expandedHeight: number } => {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    return {
      collapsedHeight: ANALYSIS_SHEET_COLLAPSED_HEIGHT,
      expandedHeight: ANALYSIS_SHEET_COLLAPSED_HEIGHT,
    }
  }

  return {
    collapsedHeight: ANALYSIS_SHEET_COLLAPSED_HEIGHT,
    expandedHeight: Math.max(
      ANALYSIS_SHEET_COLLAPSED_HEIGHT,
      Math.min(
        viewportHeight * ANALYSIS_SHEET_EXPANDED_RATIO,
        viewportHeight - ANALYSIS_SHEET_MINIMUM_MAP_HEIGHT,
      ),
    ),
  }
}

export const resolveAnalysisSheetSnapFromDrag = (
  startSnap: AnalysisSheetSnap,
  deltaY: number,
  collapsedHeight: number,
  expandedHeight: number,
): AnalysisSheetSnap => {
  if (
    !Number.isFinite(deltaY) ||
    !Number.isFinite(collapsedHeight) ||
    !Number.isFinite(expandedHeight) ||
    collapsedHeight <= 0 ||
    expandedHeight <= collapsedHeight
  ) {
    return startSnap
  }

  const travel = expandedHeight - collapsedHeight
  const threshold = travel * ANALYSIS_SHEET_SNAP_RATIO
  // deltaY<0 = 위로(펼치는 방향), deltaY>0 = 아래로(접는 방향)
  if (startSnap === 'collapsed') {
    return -deltaY >= threshold ? 'expanded' : 'collapsed'
  }
  return deltaY >= threshold ? 'collapsed' : 'expanded'
}

export const didAnalysisSheetDrag = (deltaY: number): boolean =>
  Number.isFinite(deltaY) && Math.abs(deltaY) > ANALYSIS_SHEET_DRAG_TOLERANCE

/** 드래그로 끝난 포인터의 뒤따르는 click은 무시한다(키보드 click은 detail===0). */
export const shouldSuppressAnalysisSheetClick = (
  didDrag: boolean,
  eventDetail: number,
): boolean => didDrag && eventDetail !== 0
