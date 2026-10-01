import type { CommunityId } from '@/types/community'

/*
  목록 → 상세 → 뒤로 스크롤 복원(community.md §S4 「목록 — 끊기지 않는 피드」 뒤로 가기, CM-030).

  기본 동작으로는 안 된다. Next App Router(16.3)는 뒤로 가기에서 스크롤을 직접 복원하지 않고
  (`next/dist/client` 에 scrollRestoration 처리가 없다) 브라우저 기본 복원에 맡기는데, 브라우저는
  popstate 순간 — 아직 상세 화면이 그려진 문서 — 에 복원하므로 목록이 다시 그려지기 전의 짧은
  문서 높이에 걸려 위쪽으로 잘린다. 목록은 쿼리 캐시가 불러온 쪽을 들고 있으면 즉시 그리므로
  행만 다시 그려진 뒤 스크롤 위치를 한 번 맞추면 된다.

  캐시가 불러온 쪽을 들고 있는 기간은 staleTime 이 아니라 gcTime 이 정한다 — 목록을 떠나 쿼리가
  비활성이 되면 gcTime(React Query 기본 5분, 이 앱은 바꾸지 않았다) 뒤 버려진다. 버려졌거나
  새로고침으로 메모리 캐시가 사라졌으면 첫 쪽만 다시 받으므로 누른 행이 없을 수 있다. 그때는
  복원하지 않는다(맨 위) — 옛 scrollY 로 가면 엉뚱한 글에 떨어진다.

  복원은 브라우저 뒤로/앞으로(popstate)로 돌아왔을 때만 한다. 헤더 「커뮤니티」 링크처럼 새로
  들어온 목록은 맨 위에서 시작한다(`createHistoryTraversalTracker`).

  저장은 sessionStorage(탭 단위)다. 토큰이 아니라 화면 위치라 저장해도 된다(engineering 규칙상
  storage 금지 대상은 토큰).
*/

const STORAGE_KEY = 'community-list-scroll'

/**
 * 이보다 오래된 자리는 버린다. 비활성 목록 쿼리가 버려지는 gcTime 기본값(5분)과 맞췄다 — 그
 * 뒤에는 불러온 쪽이 사라져 누른 행을 다시 그릴 수 없을 가능성이 크다.
 */
export const COMMUNITY_LIST_SCROLL_TTL_MS = 5 * 60 * 1000

export type CommunityListScrollSnapshot = {
  /** `createCommunityContextKey(state)`. 같은 보기·검색·지역 목록일 때만 복원한다. */
  contextKey: string
  /** 누른 글 행. 그 행이 다시 그려졌을 때만 행 기준으로 맞춘다. */
  postId: CommunityId
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
 * 자리에 온다. 행이 없으면(캐시가 버려져 첫 쪽만 다시 받음) `null` — 복원하지 않는다.
 */
export const getCommunityListScrollTop = (
  snapshot: Pick<CommunityListScrollSnapshot, 'rowOffset'>,
  rowDocumentTop: number | null,
) =>
  rowDocumentTop === null
    ? null
    : Math.max(0, rowDocumentTop - snapshot.rowOffset)

export type CommunityListScrollStep = 'wait' | 'restore' | 'discard'

/** 첫 쪽을 기다리고, 글이 그려지면 복원하고, 비었거나 실패면 돌아갈 자리가 없으니 버린다. */
export const getCommunityListScrollStep = (
  status: 'loading' | 'error' | 'empty' | 'ready',
): CommunityListScrollStep =>
  status === 'loading' ? 'wait' : status === 'ready' ? 'restore' : 'discard'

/**
 * 마운트가 popstate(브라우저 뒤로/앞으로) 직후인지 본다. App Router 는 뒤로 가기도 같은 문서 안의
 * 클라이언트 이동이라 popstate 뒤 곧바로 목록이 다시 마운트된다. push 이동(헤더 링크 등)은
 * popstate 를 내지 않는다.
 */
export const COMMUNITY_HISTORY_TRAVERSAL_WINDOW_MS = 1000

type HistoryTarget = { addEventListener: EventTarget['addEventListener'] }

/**
 * popstate 를 한 번만 구독해 마지막 시각을 기억한다. 구독은 첫 목록 마운트(이펙트)에서 걸고 탭이
 * 살아 있는 동안 둔다 — 목록이 떠난 뒤(상세에 있는 동안) 일어나는 뒤로 가기를 들어야 하기 때문이다.
 * 모듈을 불러오는 것만으로는 브라우저 API 를 건드리지 않는다(SSR 안전).
 */
export const createHistoryTraversalTracker = (now: () => number) => {
  let lastPopstateAt: number | null = null
  let started = false

  return {
    start(target: HistoryTarget) {
      if (started) {
        return
      }

      started = true
      target.addEventListener('popstate', () => {
        lastPopstateAt = now()
      })
    },
    wasRecent() {
      return (
        lastPopstateAt !== null &&
        now() - lastPopstateAt <= COMMUNITY_HISTORY_TRAVERSAL_WINDOW_MS
      )
    },
  }
}

/** 탭 전체가 함께 쓰는 하나. */
export const communityHistoryTraversal = createHistoryTraversalTracker(() =>
  Date.now(),
)
