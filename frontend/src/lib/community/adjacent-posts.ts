import type { CommunityId } from '@/types/community'

/**
 * 이웃 글 상태는 localStorage 에 남는다. 식별자가 숫자에서 문자열로 바뀌었으므로
 * 예전에 저장된 항목은 타입 가드에서 탈락해 null 이 된다 — 이웃 글 이동이 한 번
 * 비어 보일 뿐이고, 다음 목록 방문에서 다시 채워진다. 마이그레이션은 두지 않는다.
 */
export type AdjacentPostItem = {
  postId: CommunityId
  title: string
}

export type AdjacentPostState = {
  currentPostId: CommunityId
  contextKey: string
  previous: AdjacentPostItem | null
  next: AdjacentPostItem | null
}

const STORAGE_KEY = 'community-adjacent-posts'

const isAdjacentPostItem = (value: unknown): value is AdjacentPostItem =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as AdjacentPostItem).postId === 'string' &&
  typeof (value as AdjacentPostItem).title === 'string'

const isAdjacentPostState = (value: unknown): value is AdjacentPostState => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const state = value as AdjacentPostState

  return (
    typeof state.currentPostId === 'string' &&
    typeof state.contextKey === 'string' &&
    (state.previous === null || isAdjacentPostItem(state.previous)) &&
    (state.next === null || isAdjacentPostItem(state.next))
  )
}

export const saveAdjacentPosts = (
  storage: Pick<Storage, 'setItem'>,
  value: AdjacentPostState,
) => {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const readAdjacentPosts = (
  storage: Pick<Storage, 'getItem'>,
  currentPostId: CommunityId,
  contextKey: string,
) => {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : null

    return isAdjacentPostState(parsed) &&
      parsed.currentPostId === currentPostId &&
      parsed.contextKey === contextKey
      ? parsed
      : null
  } catch {
    return null
  }
}
