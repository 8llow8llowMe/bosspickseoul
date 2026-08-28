/**
 * 지도 화면 모바일 바텀시트의 스냅/드래그 순수 로직. **상권분석·상권추천이 같은 모듈을
 * 쓴다.**
 *
 * 원래는 `lib/analysis/analysis-sheet-state.ts` 였고 추천 시트는 컴포넌트 파일 안에
 * 자기 복사본을 들고 있었다. 같은 서비스 안에서 접힘 높이(72 vs 44px)와 스냅 판정이
 * 서로 달라 조작감이 어긋나던 원인이다(ux-followups C). 규격을 여기 한 곳에 둔다.
 *
 * 시각·동작 규칙은 status(`status-state`) 바텀시트와도 맞춘다: `height` + `clamp()`
 * 드래그, 2단 스냅(collapsed/expanded), 탭/드래그/키보드 판정.
 */

export type BottomSheetSnap = 'collapsed' | 'expanded'

/**
 * 접힘 상태 높이. **내용 첫 줄이 보이는 높이다** — 손잡이만 남기면(44px) 시트가
 * 「닫힌 것」처럼 읽혀서 다시 펼칠 단서가 손잡이뿐이 된다.
 */
export const BOTTOM_SHEET_COLLAPSED_HEIGHT = 72
export const BOTTOM_SHEET_EXPANDED_RATIO = 0.72
/**
 * 펼쳐도 지도에 남겨 두는 최소 높이. 지도가 주인공인 화면이라 시트가 끝까지 올라와
 * 지도를 덮으면 방금 고른 지역·결과 폴리곤이 사라진다.
 */
export const BOTTOM_SHEET_MINIMUM_MAP_HEIGHT = 180
/** 탭과 드래그를 가르는 이동 임계값(px). */
export const BOTTOM_SHEET_DRAG_TOLERANCE = 4
/** 드래그로 스냅을 전환하는 최소 이동 비율(전체 여정 대비). */
export const BOTTOM_SHEET_SNAP_RATIO = 0.3
/** 이 속도(px/ms)를 넘기면 이동 거리와 무관하게 방향대로 스냅한다(플링). */
export const BOTTOM_SHEET_FLING_VELOCITY = 0.45

/**
 * 시트의 스냅 기준 높이를 계산할 "뷰포트"(= 지도 컨테이너) 높이를 고른다.
 * 시트는 `display: contents` 래퍼(MobilePanel) 안에 있어 `parentElement.clientHeight`가
 * 0으로 나올 수 있다. 이때 0을 그대로 쓰면 접힘/펼침 높이가 같아져(getBottomSheetHeightBounds의
 * 비정상 분기) 드래그 스냅이 절대 전환되지 않는다. 그래서 후보들 중 첫 번째 유한·양수 값을 쓴다
 * (실사용: offsetParent(=위치지정 조상 MapArea).clientHeight → parentElement.clientHeight → window.innerHeight).
 */
export const resolveBottomSheetViewportHeight = (
  ...candidates: Array<number | null | undefined>
): number => {
  for (const candidate of candidates) {
    if (
      typeof candidate === 'number' &&
      Number.isFinite(candidate) &&
      candidate > 0
    ) {
      return candidate
    }
  }
  return 0
}

export const getBottomSheetHeightBounds = (
  viewportHeight: number,
): { collapsedHeight: number; expandedHeight: number } => {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    return {
      collapsedHeight: BOTTOM_SHEET_COLLAPSED_HEIGHT,
      expandedHeight: BOTTOM_SHEET_COLLAPSED_HEIGHT,
    }
  }

  return {
    collapsedHeight: BOTTOM_SHEET_COLLAPSED_HEIGHT,
    expandedHeight: Math.max(
      BOTTOM_SHEET_COLLAPSED_HEIGHT,
      Math.min(
        viewportHeight * BOTTOM_SHEET_EXPANDED_RATIO,
        viewportHeight - BOTTOM_SHEET_MINIMUM_MAP_HEIGHT,
      ),
    ),
  }
}

/**
 * 놓은 지점으로 스냅을 정한다. 거리 규칙(여정의 30%)이 기본이고, **속도를 넘기면**
 * 짧게 튕겨도 방향대로 간다. 분석 시트는 속도를 넘기지 않아 거리 규칙만 쓴다 —
 * 추천 시트가 이미 갖고 있던 플링을 잃지 않게 optional 로 둔다.
 */
export const resolveBottomSheetSnapFromDrag = (
  startSnap: BottomSheetSnap,
  deltaY: number,
  collapsedHeight: number,
  expandedHeight: number,
  velocityY?: number,
): BottomSheetSnap => {
  if (
    !Number.isFinite(deltaY) ||
    !Number.isFinite(collapsedHeight) ||
    !Number.isFinite(expandedHeight) ||
    collapsedHeight <= 0 ||
    expandedHeight <= collapsedHeight
  ) {
    return startSnap
  }

  // deltaY<0 = 위로(펼치는 방향), deltaY>0 = 아래로(접는 방향)
  if (
    typeof velocityY === 'number' &&
    Number.isFinite(velocityY) &&
    Math.abs(velocityY) >= BOTTOM_SHEET_FLING_VELOCITY
  ) {
    return velocityY < 0 ? 'expanded' : 'collapsed'
  }

  const travel = expandedHeight - collapsedHeight
  const threshold = travel * BOTTOM_SHEET_SNAP_RATIO

  if (startSnap === 'collapsed') {
    return -deltaY >= threshold ? 'expanded' : 'collapsed'
  }
  return deltaY >= threshold ? 'collapsed' : 'expanded'
}

export const didBottomSheetDrag = (deltaY: number): boolean =>
  Number.isFinite(deltaY) && Math.abs(deltaY) > BOTTOM_SHEET_DRAG_TOLERANCE

/** 드래그로 끝난 포인터의 뒤따르는 click은 무시한다(키보드 click은 detail===0). */
export const shouldSuppressBottomSheetClick = (
  didDrag: boolean,
  eventDetail: number,
): boolean => didDrag && eventDetail !== 0
