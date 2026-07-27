import { describe, expect, it } from 'vitest'

import { readAdjacentPosts, saveAdjacentPosts } from './adjacent-posts'

const value = {
  currentPostId: 3,
  contextKey: '{"view":"latest"}',
  previous: { postId: 2, title: '이전 글' },
  next: { postId: 4, title: '다음 글' },
}

describe('adjacent posts storage', () => {
  it('유효한 인접 글을 저장하고 복원한다', () => {
    let stored: string | null = null
    const storage = {
      setItem: (_key: string, next: string) => {
        stored = next
      },
      getItem: () => stored,
    }
    saveAdjacentPosts(storage, value)
    expect(readAdjacentPosts(storage, 3, value.contextKey)).toEqual(value)
  })

  it('storage 저장 오류를 삼키고 실패를 반환한다', () => {
    expect(() =>
      saveAdjacentPosts(
        {
          setItem: () => {
            throw new Error('quota exceeded')
          },
        },
        value,
      ),
    ).not.toThrow()
    expect(
      saveAdjacentPosts(
        {
          setItem: () => {
            throw new Error('quota exceeded')
          },
        },
        value,
      ),
    ).toBe(false)
  })

  it('깨진 JSON과 누락된 값은 null을 반환한다', () => {
    expect(
      readAdjacentPosts({ getItem: () => '{' }, 3, value.contextKey),
    ).toBeNull()
    expect(
      readAdjacentPosts({ getItem: () => null }, 3, value.contextKey),
    ).toBeNull()
  })

  it('잘못된 shape은 null을 반환한다', () => {
    expect(
      readAdjacentPosts(
        {
          getItem: () =>
            JSON.stringify({
              currentPostId: '3',
              contextKey: value.contextKey,
            }),
        },
        3,
        value.contextKey,
      ),
    ).toBeNull()
    expect(
      readAdjacentPosts(
        {
          getItem: () =>
            JSON.stringify({
              ...value,
              previous: { postId: '2', title: '이전' },
            }),
        },
        3,
        value.contextKey,
      ),
    ).toBeNull()
  })

  it('다른 게시글 또는 목록 context에서는 복원하지 않는다', () => {
    const storage = { getItem: () => JSON.stringify(value) }
    expect(readAdjacentPosts(storage, 4, value.contextKey)).toBeNull()
    expect(readAdjacentPosts(storage, 3, 'other')).toBeNull()
  })

  it('previous와 next가 null인 상태를 지원한다', () => {
    const emptyAdjacent = { ...value, previous: null, next: null }
    expect(
      readAdjacentPosts(
        { getItem: () => JSON.stringify(emptyAdjacent) },
        3,
        value.contextKey,
      ),
    ).toEqual(emptyAdjacent)
  })
})
