/**
 * 가로 스크롤 컨테이너가 좌·우로 더 갈 여지가 있는지 판정한다.
 *
 * 화살표 버튼의 표시 여부가 이 값이다. 눌러도 아무 일이 없는 죽은 버튼을 만들지
 * 않으려면 「여지가 있는 쪽에만」 띄워야 한다.
 */
export type ScrollReach = {
  left: boolean
  right: boolean
}

/**
 * 양 끝에서 1px 의 여유를 둔다.
 *
 * 브라우저가 `scrollLeft` 를 소수점으로 잡아 끝까지 밀어도 `max` 에 0.5px 쯤
 * 못 미치는 일이 있다. 허용치가 없으면 그 상태에서 오른쪽 화살표가 사라지지
 * 않는다. 넘치지 않는 목록(`scrollWidth === clientWidth`)은 `max` 가 0 이라
 * 양쪽 모두 false 가 된다 — 화살표가 아예 뜨지 않아야 하는 경우다.
 */
export const computeScrollReach = (
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number,
): ScrollReach => {
  const max = scrollWidth - clientWidth

  return {
    left: scrollLeft > 1,
    right: scrollLeft < max - 1,
  }
}
