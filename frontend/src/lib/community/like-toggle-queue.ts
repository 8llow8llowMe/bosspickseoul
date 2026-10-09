/*
  좋아요 낙관적 갱신과 요청 직렬화(#580, community.md §S4 「좋아요 — 누르면 바로 바뀐다」).

  서버 API 는 **토글**이다(`POST …/likes` 가 누를 때마다 뒤집고 결과 `{ liked, likeCount }` 를 준다). set 이
  아니라서 연타를 그대로 보내면 요청이 엇갈려 마지막 화면 상태와 서버 상태가 갈린다. 그래서

  - 화면은 누르는 즉시 뒤집는다(`flipCommunityLike`). 버튼을 잠그지 않는다.
  - 요청은 글·댓글 하나에 **한 번에 하나**만 보낸다. 진행 중에 또 누르면 「마지막 의도」만 적어 둔다.
  - 응답이 오면 서버 상태와 마지막 의도를 비교해, 다르면 토글을 한 번 더 보낸다. 같으면 끝난다.
  - 실패하면 마지막으로 **서버가 확인해 준 상태**로 되돌린다(`getConfirmed`).

  React 를 모른다 — 화면 없이 연타·실패 순서를 검증한다.
*/

export type CommunityLikeState = {
  /** null 은 「모른다」(댓글 좋아요의 첫 상태 — BE #594 전, 비로그인). */
  liked: boolean | null
  likeCount: number
}

export type CommunityLikeResult = {
  liked: boolean
  likeCount: number
}

/** 좋아요 요청 결과를 스레드에 돌려주는 모양. 실패면 되돌린 상태(서버가 마지막으로 확인한 상태)다. */
export type CommunityLikeOutcome = CommunityLikeState & { ok: boolean }

/**
 * 누른 즉시 그릴 상태. 이미 그 상태면 그대로 둔다. 수는 0 아래로 내려가지 않는다 — 모르는 상태에서
 * 뺀 수가 음수로 비치면 안 된다. 정확한 수는 응답이 덮는다.
 */
export const flipCommunityLike = (
  state: CommunityLikeState,
  desired: boolean,
): CommunityLikeState =>
  state.liked === desired
    ? state
    : {
        liked: desired,
        likeCount: Math.max(0, state.likeCount + (desired ? 1 : -1)),
      }

/** 화면이 지금 그리는 하트 → 누르면 갈 상태. 모르는 상태(null)는 빈 하트로 그리므로 「누름」이다. */
export const getCommunityLikeIntent = (liked: boolean | null | undefined) =>
  liked !== true

/**
 * 응답이 끝없이 엇갈리는 경우(서버 토글이 고장 났을 때)를 끊는 상한. 정상이면 의도 한 번당 많아야 두 번
 * 보낸다 — 첫 응답이 의도와 다르면(진행 중 반대로 누름·모르던 상태) 한 번 더.
 */
const MAX_SENDS_PER_RUN = 4

export type CommunityLikeToggleQueue = {
  /**
   * 의도를 적고, 진행 중인 요청이 없으면 보낸다. 같은 실행에 묶인 요청은 **모두 같은 최종 결과**로
   * 끝난다(실패도 같다). `current` 는 쉬고 있을 때만 읽는다 — 그때 캐시가 서버가 확인한 상태다.
   */
  request: (
    desired: boolean,
    current: CommunityLikeState,
    send: () => Promise<CommunityLikeResult>,
  ) => Promise<CommunityLikeResult>
  /** 마지막으로 서버가 확인한 상태(실패 시 되돌릴 자리). 한 번도 요청하지 않았으면 null. */
  getConfirmed: () => CommunityLikeState | null
  isRunning: () => boolean
}

export const createCommunityLikeToggleQueue = (): CommunityLikeToggleQueue => {
  let confirmed: CommunityLikeState | null = null
  let desired = false
  let latestSend: (() => Promise<CommunityLikeResult>) | null = null
  let running: Promise<CommunityLikeResult> | null = null

  const run = async (): Promise<CommunityLikeResult> => {
    let sends = 0
    let last: CommunityLikeResult | null = null

    while (
      confirmed &&
      (confirmed.liked === null || confirmed.liked !== desired) &&
      sends < MAX_SENDS_PER_RUN &&
      latestSend
    ) {
      sends += 1
      last = await latestSend()
      confirmed = { liked: last.liked, likeCount: last.likeCount }
    }

    if (last) {
      return last
    }

    // 보낼 필요가 없었다(이미 의도대로). 확인된 상태를 그대로 돌려준다.
    return {
      liked: confirmed?.liked ?? desired,
      likeCount: confirmed?.likeCount ?? 0,
    }
  }

  return {
    request: (nextDesired, current, send) => {
      desired = nextDesired
      latestSend = send

      if (running) {
        return running
      }

      confirmed = { ...current }
      const execution = run()
      running = execution
      const clear = () => {
        if (running === execution) {
          running = null
        }
      }
      execution.then(clear, clear)
      return execution
    },
    getConfirmed: () => (confirmed ? { ...confirmed } : null),
    isRunning: () => running !== null,
  }
}

/** 글·댓글마다 큐 하나. 키는 부르는 쪽이 정한다(글 id · 댓글 id). */
export const createCommunityLikeToggleQueues = () => {
  const queues = new Map<string, CommunityLikeToggleQueue>()

  return {
    get: (key: string) => {
      const existing = queues.get(key)
      if (existing) {
        return existing
      }

      const created = createCommunityLikeToggleQueue()
      queues.set(key, created)
      return created
    },
  }
}
