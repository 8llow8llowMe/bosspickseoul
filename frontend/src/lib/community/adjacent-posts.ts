export type AdjacentPostItem = {
  postId: number
  title: string
}

export type AdjacentPostState = {
  currentPostId: number
  contextKey: string
  previous: AdjacentPostItem | null
  next: AdjacentPostItem | null
}

const STORAGE_KEY = 'community-adjacent-posts'

const isAdjacentPostItem = (value: unknown): value is AdjacentPostItem =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as AdjacentPostItem).postId === 'number' &&
  typeof (value as AdjacentPostItem).title === 'string'

const isAdjacentPostState = (value: unknown): value is AdjacentPostState => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const state = value as AdjacentPostState

  return (
    typeof state.currentPostId === 'number' &&
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
  currentPostId: number,
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
