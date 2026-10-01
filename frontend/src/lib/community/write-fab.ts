/*
  모바일 글쓰기 FAB 접기(community.md §S4 「목록 — 끊기지 않는 피드」 FAB).
  아래로 내리면 아이콘만 남기고, 위로 올리거나 맨 위 근처면 `글쓰기` 를 편다.
*/

/** 같은 방향으로 이만큼 누적해 움직여야 상태를 바꾼다. 손가락 떨림·iOS 바운스에 깜빡이지 않게. */
export const WRITE_FAB_TRAVEL = 8

/** 이 위쪽(scrollY 미만)에서는 늘 편다. */
export const WRITE_FAB_EXPAND_TOP = 80

export type WriteFabScrollState = {
  collapsed: boolean
  lastY: number
  /** 지금 방향으로 누적한 이동량. 아래 +, 위 −. 방향이 바뀌면 0 에서 다시 센다. */
  travel: number
}

export const createWriteFabScrollState = (y: number): WriteFabScrollState => ({
  collapsed: false,
  lastY: y,
  travel: 0,
})

export const getNextWriteFabScrollState = (
  previous: WriteFabScrollState,
  y: number,
): WriteFabScrollState => {
  if (y < WRITE_FAB_EXPAND_TOP) {
    return { collapsed: false, lastY: y, travel: 0 }
  }

  const delta = y - previous.lastY

  if (delta === 0) {
    return previous
  }

  const sameDirection = Math.sign(delta) === Math.sign(previous.travel)
  const travel = sameDirection ? previous.travel + delta : delta
  const collapsed =
    travel >= WRITE_FAB_TRAVEL
      ? true
      : travel <= -WRITE_FAB_TRAVEL
        ? false
        : previous.collapsed

  return { collapsed, lastY: y, travel }
}
