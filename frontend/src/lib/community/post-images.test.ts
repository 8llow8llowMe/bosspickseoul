import { describe, expect, it } from 'vitest'

import {
  MAX_POST_IMAGES,
  selectPostImages,
  sortPostImages,
  toImageKeys,
} from '@/lib/community/post-images'
import { MAX_IMAGE_BYTES } from '@/lib/upload/image-rules'

const image = (key: string, sortOrder: number) => ({
  imageKey: key,
  imageUrl: `https://minio.test/${key}`,
  sortOrder,
})

const file = (name: string, size = 1024, type = 'image/png') => {
  const value = new File(['x'], name, { type })
  Object.defineProperty(value, 'size', { value: size })
  return value
}

describe('toImageKeys', () => {
  /**
   * **A4 에서 가장 중요한 함수다.** 수정 요청의 `imageKeys` 는 「수정 후 남길 목록」이고,
   * 백엔드는 여기 없는 기존 이미지를 연결 해제한 뒤 **파일까지 지운다.** 게다가
   * `normalize(null)` 이 빈 목록을 돌려주므로 필드를 빼는 것과 `[]` 를 보내는 것이
   * 같은 뜻이다 — 둘 다 전부 삭제. 그래서 순서까지 그대로 보존해야 한다.
   */
  it('순서를 유지한 채 키만 뽑는다', () => {
    expect(toImageKeys([image('a.png', 0), image('b.png', 1)])).toEqual([
      'a.png',
      'b.png',
    ])
  })

  it('빈 목록은 빈 배열이다 — 그리고 그것은 「전부 지워라」라는 뜻이다', () => {
    expect(toImageKeys([])).toEqual([])
  })
})

describe('sortPostImages', () => {
  it('sortOrder 오름차순으로 세운다', () => {
    const sorted = sortPostImages([image('b.png', 1), image('a.png', 0)])

    expect(sorted.map(item => item.imageKey)).toEqual(['a.png', 'b.png'])
  })

  it('원본을 건드리지 않는다', () => {
    const input = [image('b.png', 1), image('a.png', 0)]
    sortPostImages(input)

    expect(input[0].imageKey).toBe('b.png')
  })

  it('null·undefined 도 빈 배열로 받는다', () => {
    expect(sortPostImages(null)).toEqual([])
    expect(sortPostImages(undefined)).toEqual([])
  })
})

describe('selectPostImages', () => {
  it('남은 자리 안이면 전부 받는다', () => {
    const result = selectPostImages([file('a.png'), file('b.png')], 0)

    expect(result.accepted).toHaveLength(2)
    expect(result.error).toBeNull()
  })

  /*
   * 넘쳐도 앞의 몇 장은 살린다 — 전부 거절하면 사용자가 다시 고르면서 몇 장을
   * 빼야 하는지 세어야 한다. 대신 **몇 장이 빠졌는지 반드시 말한다.**
   */
  it('남은 자리만큼만 받고 몇 장이 빠졌는지 말한다', () => {
    const files = Array.from({ length: 4 }, (_, index) => file(`${index}.png`))

    const result = selectPostImages(files, 3)

    expect(result.accepted).toHaveLength(2)
    expect(result.error).toContain('2장은 올리지 않았어요')
  })

  it('이미 다 채웠으면 아무것도 받지 않는다', () => {
    const result = selectPostImages([file('a.png')], MAX_POST_IMAGES)

    expect(result.accepted).toEqual([])
    expect(result.error).toContain('지운 뒤에')
  })

  it('규칙을 어긴 파일은 이름과 함께 이유를 말한다', () => {
    const result = selectPostImages(
      [file('big.png', MAX_IMAGE_BYTES + 1), file('ok.png')],
      0,
    )

    expect(result.accepted.map(item => item.name)).toEqual(['ok.png'])
    expect(result.error).toContain('big.png')
  })

  it('허용하지 않는 형식도 거른다', () => {
    const result = selectPostImages([file('a.pdf', 1024, 'application/pdf')], 0)

    expect(result.accepted).toEqual([])
    expect(result.error).toContain('a.pdf')
  })
})
