/*
  상세 사진 보기 판정(community.md §S4 4단계 「사진 보기」). 라이트박스와 모바일 사진 줄이 같이 쓴다.
  DOM 을 모르는 순수 함수만 둔다 — 포인터·스크롤 이벤트에서 숫자만 뽑아 넘긴다.
*/

/**
 * 모바일 사진 줄의 장 사이 간격(px, 간격 스케일 8). 줄의 CSS `gap` 과 지금 장 계산이 같이 쓴다 —
 * 둘이 갈리면 넘길수록 점이 한 장씩 밀린다.
 */
export const PHOTO_STRIP_GAP = 8

/** 라이트박스 좌우 스와이프로 인정하는 최소 수평 이동(px). */
export const PHOTO_SWIPE_THRESHOLD = 40

/**
 * 포인터를 누른 곳에서 뗀 곳까지의 이동으로 넘길 방향을 정한다.
 * 왼쪽으로 밀면(dx<0) 다음 장(+1), 오른쪽이면 이전 장(-1), 아니면 0.
 * 수직 이동이 수평 이상이면 넘기지 않는다 — 세로로 쓸어 내린 손가락이 옆 사진으로 튀지 않게.
 */
export const getPhotoSwipeStep = (
  deltaX: number,
  deltaY: number,
): -1 | 0 | 1 => {
  const horizontal = Math.abs(deltaX)

  if (horizontal < PHOTO_SWIPE_THRESHOLD || horizontal <= Math.abs(deltaY)) {
    return 0
  }

  return deltaX < 0 ? 1 : -1
}

/**
 * 라이트박스 스와이프를 이 화면이 맡을지. 핀치로 확대한 동안(`visualViewport.scale > 1`)에는 가로로
 * 끄는 손가락이 「확대한 사진 둘러보기」라 사진을 넘기지 않는다. 배율을 모르면(visualViewport 가 없는
 * 브라우저) 확대 여부를 알 수 없으니 지금처럼 넘긴다.
 */
export const shouldHandlePhotoSwipe = (scale: number | null | undefined) =>
  typeof scale !== 'number' || !Number.isFinite(scale) || scale <= 1

/** 이전/다음 이동. 끝에서 순환하지 않고 그 자리에 머문다(처음·끝을 알 수 있게). */
export const stepPhotoIndex = (index: number, step: number, count: number) => {
  if (count <= 1) {
    return 0
  }

  return Math.min(Math.max(index + step, 0), count - 1)
}

/**
 * 모바일 가로 사진 줄(scroll-snap)에서 지금 보이는 장. 한 장이 줄 폭 100% 이고 장 사이 간격이
 * `gap` 이라, 한 장씩 넘길 때 scrollLeft 는 (폭 + 간격)만큼 는다. 가장 가까운 장으로 반올림한다.
 */
export const getPhotoStripIndex = (
  scrollLeft: number,
  itemWidth: number,
  gap: number,
  count: number,
) => {
  const stride = itemWidth + gap

  if (count <= 0 || itemWidth <= 0 || stride <= 0) {
    return 0
  }

  return Math.min(Math.max(Math.round(scrollLeft / stride), 0), count - 1)
}

/** `2 / 3` — 사람이 읽는 1부터 센다. */
export const formatPhotoPosition = (index: number, total: number) =>
  `${index + 1} / ${total}`
