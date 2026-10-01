import { describe, expect, it } from 'vitest'

import {
  PHOTO_STRIP_GAP,
  PHOTO_SWIPE_THRESHOLD,
  formatPhotoPosition,
  getPhotoStripIndex,
  getPhotoSwipeStep,
  stepPhotoIndex,
} from './photo-viewer'

/*
  사진 보기(community.md §S4 4단계 「사진 보기」, CM-041·042)의 판정 규칙.
  화면은 이 함수들을 부를 뿐이다 — 상호작용은 community-image-lightbox.interaction.test.ts.
*/

describe('getPhotoSwipeStep — 라이트박스 좌우 스와이프', () => {
  it('문턱은 40px 이다', () => {
    expect(PHOTO_SWIPE_THRESHOLD).toBe(40)
  })

  it('왼쪽으로 40px 이상 밀면 다음(+1), 오른쪽이면 이전(-1)', () => {
    expect(getPhotoSwipeStep(-40, 0)).toBe(1)
    expect(getPhotoSwipeStep(-120, 10)).toBe(1)
    expect(getPhotoSwipeStep(40, 0)).toBe(-1)
    expect(getPhotoSwipeStep(90, -20)).toBe(-1)
  })

  it('40px 미만은 무시한다', () => {
    expect(getPhotoSwipeStep(-39, 0)).toBe(0)
    expect(getPhotoSwipeStep(39.9, 0)).toBe(0)
    expect(getPhotoSwipeStep(0, 0)).toBe(0)
  })

  it('수직 이동이 수평보다 크거나 같으면 무시한다(세로 스크롤·당겨 닫기 시도)', () => {
    expect(getPhotoSwipeStep(-60, 80)).toBe(0)
    expect(getPhotoSwipeStep(60, -60)).toBe(0)
    expect(getPhotoSwipeStep(-41, 40)).toBe(1)
  })
})

describe('stepPhotoIndex — 이전/다음은 순환하지 않는다', () => {
  it('범위 안에서 한 칸 옮긴다', () => {
    expect(stepPhotoIndex(1, 1, 3)).toBe(2)
    expect(stepPhotoIndex(1, -1, 3)).toBe(0)
  })

  it('끝에서는 그 자리에 머문다', () => {
    expect(stepPhotoIndex(2, 1, 3)).toBe(2)
    expect(stepPhotoIndex(0, -1, 3)).toBe(0)
  })

  it('사진이 없거나 한 장이면 0 이다', () => {
    expect(stepPhotoIndex(0, 1, 1)).toBe(0)
    expect(stepPhotoIndex(0, 1, 0)).toBe(0)
  })
})

describe('getPhotoStripIndex — 모바일 사진 줄의 지금 장', () => {
  it('줄의 장 사이 간격은 8 이다(CSS 와 계산이 같은 값을 쓴다)', () => {
    expect(PHOTO_STRIP_GAP).toBe(8)
  })

  it('스크롤 위치를 한 장 폭 + 간격으로 나눠 가장 가까운 장을 고른다', () => {
    // 한 장 358 + 간격 8 = 366
    expect(getPhotoStripIndex(0, 358, 8, 3)).toBe(0)
    expect(getPhotoStripIndex(366, 358, 8, 3)).toBe(1)
    expect(getPhotoStripIndex(366 * 2, 358, 8, 3)).toBe(2)
    expect(getPhotoStripIndex(170, 358, 8, 3)).toBe(0)
    expect(getPhotoStripIndex(190, 358, 8, 3)).toBe(1)
  })

  it('범위를 넘으면 끝 장으로 자른다(iOS 바운스)', () => {
    expect(getPhotoStripIndex(-40, 358, 8, 3)).toBe(0)
    expect(getPhotoStripIndex(5000, 358, 8, 3)).toBe(2)
  })

  it('폭을 모르면(0) 첫 장이다', () => {
    expect(getPhotoStripIndex(300, 0, 8, 3)).toBe(0)
    expect(getPhotoStripIndex(300, 358, 8, 0)).toBe(0)
  })
})

describe('formatPhotoPosition', () => {
  it('사람이 읽는 1부터 센다', () => {
    expect(formatPhotoPosition(1, 3)).toBe('2 / 3')
    expect(formatPhotoPosition(0, 1)).toBe('1 / 1')
  })
})
