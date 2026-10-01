import type { CommunityId } from '@/types/community'

/*
  목록 → 상세 → 뒤로 스크롤 복원(community.md §S4 「목록 — 끊기지 않는 피드」 뒤로 가기, CM-030).

  기본 동작으로는 안 된다. Next App Router(16.3)는 뒤로 가기에서 스크롤을 직접 복원하지 않고
  (`next/dist/client` 에 scrollRestoration 처리가 없다) 브라우저 기본 복원에 맡기는데, 브라우저는
  popstate 순간 — 아직 상세 화면이 그려진 문서 — 에 복원하므로 목록이 다시 그려지기 전의 짧은
  문서 높이에 걸려 위쪽으로 잘린다. 목록은 쿼리 캐시로 불러온 쪽을 즉시 그리므로(staleTime 5분)
  행만 다시 그려진 뒤 스크롤 위치를 한 번 맞추면 된다.

  저장은 sessionStorage(탭 단위)다. 토큰이 아니라 화면 위치라 저장해도 된다(engineering 규칙상
  storage 금지 대상은 토큰).
*/

const STORAGE_KEY = 'community-list-scroll'

/** 이보다 오래된 자리는 버린다 — 한참 뒤 다른 길로 목록에 들어왔는데 옛 자리로 튀지 않게. */
export const COMMUNITY_LIST_SCROLL_TTL_MS = 30 * 60 * 1000

export type CommunityListScrollSnapshot = {
  /** `createCommunityContextKey(state)`. 같은 보기·검색·지역 목록일 때만 복원한다. */
  contextKey: string
  /** 누른 글 행. 그 행이 다시 그려지면 행 기준으로 맞춘다. */
  postId: CommunityId
  /** 누를 때의 `window.scrollY`. 행을 못 찾을 때 대체값. */
  scrollY: number
  /** 누를 때 그 행의 화면 위 거리(`getBoundingClientRect().top`). */
  rowOffset: number
  savedAt: number
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isSnapshot = (value: unknown): value is CommunityListScrollSnapshot => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const snapshot = value as CommunityListScrollSnapshot

  return (
    typeof snapshot.contextKey === 'string' &&
    typeof snapshot.postId === 'string' &&
    isFiniteNumber(snapshot.scrollY) &&
    isFiniteNumber(snapshot.rowOffset) &&
    isFiniteNumber(snapshot.savedAt)
  )
}

export const saveCommunityListScroll = (
  storage: Pick<Storage, 'setItem'>,
  snapshot: CommunityListScrollSnapshot,
) => {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    return true
  } catch {
    return false
  }
}

export const clearCommunityListScroll = (
  storage: Pick<Storage, 'removeItem'>,
) => {
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // 저장소를 못 쓰면 지울 것도 없다.
  }
}

/**
 * 이 목록(`contextKey`)의 자리를 돌려준다. 다른 목록의 자리는 **지우지 않고 둔다** — 상세에서
 * 지역 칩으로 다른 목록을 들렀다가 뒤로 두 번 돌아오는 길에서 원래 목록이 쓴다.
 * 만료된 자리는 지운다.
 */
export const readCommunityListScroll = (
  storage: Pick<Storage, 'getItem' | 'removeItem'>,
  { contextKey, now }: { contextKey: string; now: number },
): CommunityListScrollSnapshot | null => {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : null

    if (!isSnapshot(parsed)) {
      return null
    }

    if (now - parsed.savedAt > COMMUNITY_LIST_SCROLL_TTL_MS) {
      clearCommunityListScroll(storage)
      return null
    }

    return parsed.contextKey === contextKey ? parsed : null
  } catch {
    return null
  }
}

/**
 * 돌아갈 스크롤 위치. 행이 그려져 있으면(`rowDocumentTop` = 행의 문서 기준 top) 그 행을 누를
 * 때와 같은 화면 높이에 둔다 — 위쪽 내용 높이가 달라져도(지역 이름 응답 등) 보던 행이 같은
 * 자리에 온다. 행이 없으면 저장한 scrollY 로 간다.
 */
export const getCommunityListScrollTop = (
  snapshot: Pick<CommunityListScrollSnapshot, 'scrollY' | 'rowOffset'>,
  rowDocumentTop: number | null,
) =>
  Math.max(
    0,
    rowDocumentTop === null
      ? snapshot.scrollY
      : rowDocumentTop - snapshot.rowOffset,
  )

export type CommunityListScrollStep = 'wait' | 'restore' | 'discard'

/** 첫 쪽을 기다리고, 글이 그려지면 복원하고, 비었거나 실패면 돌아갈 자리가 없으니 버린다. */
export const getCommunityListScrollStep = (
  status: 'loading' | 'error' | 'empty' | 'ready',
): CommunityListScrollStep =>
  status === 'loading' ? 'wait' : status === 'ready' ? 'restore' : 'discard'
