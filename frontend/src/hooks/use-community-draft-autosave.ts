'use client'

import { useEffect, useRef } from 'react'
import {
  COMMUNITY_DRAFT_AUTOSAVE_DELAY_MS,
  createCommunityStoredDraft,
  getBrowserLocalStorage,
  removeCommunityStoredDraft,
  writeCommunityStoredDraft,
  type CommunityStorageGetter,
} from '@/lib/community/editor-draft'
import type { CommunityEditorValue } from '@/lib/community/editor-compose'

export type UseCommunityDraftAutosaveOptions = {
  /** `null` 이면 저장하지 않는다 — 비교 초안으로 들어온 글(초안이 이긴다)·회원 id 를 모를 때. */
  storageKey: string | null
  value: Pick<CommunityEditorValue, 'title' | 'content' | 'location'> &
    Partial<Pick<CommunityEditorValue, 'category'>>
  /** 처음 값과 다른가. 같아지면 앞서 쓴 저장본을 지운다. */
  dirty: boolean
  /** 저장 요청 중. 새 타이머는 잡지 않고, 잡혀 있던 저장은 **그 자리에서 밀어 쓴다.** */
  pending: boolean
  /** 등록·수정 성공 뒤 이동하는 중. 잡혀 있던 저장도 버린다. */
  submitted: boolean
  /**
   * 이어 쓰기로 시작했는가. 그렇다면 이 키에 이미 저장본이 있다 — 원래 값으로 되돌렸을 때 이 훅이
   * 아직 한 번도 쓰지 않았어도 지워야 한다.
   */
  startedFromStored?: boolean
  getStorage?: CommunityStorageGetter
  delayMs?: number
}

/**
 * 입력이 멈추고 1초 뒤 제목·본문·지역·말머리를 저장한다(community.md §S4 「잃지 않게」).
 *
 * - **사진은 넣지 않는다**(`createCommunityStoredDraft` 가 고른 필드만 담는다).
 * - `submitted` 가 켜지면 잡힌 타이머를 버린다. 등록 성공 뒤 이동이 끝나기 전에 타이머가 돌면
 *   방금 지운 저장본이 되살아난다 — 성공 표시가 mutation 의 pending 이 끝나기 전에 먼저 켜지므로
 *   (register-page onSuccess) 그 사이 타이머가 잡힐 틈이 없다.
 * - `pending` 이 켜지면 잡힌 저장을 버리지 않고 곧바로 쓴다. 요청이 401 이면 로그인으로 보내지며
 *   폼이 언마운트되는데, 그때 1초 안에 친 글자가 남아 있어야 한다. 성공하면 onSuccess 가 지운다.
 * - 1초가 차기 전에 나가거나(언마운트) 새로고침하면(`pagehide`) 그 자리에서 밀어 쓴다.
 *   이탈 확인 문구가 「임시 저장돼요」라고 말하므로 그 말이 참이어야 한다.
 */
export function useCommunityDraftAutosave({
  storageKey,
  value,
  dirty,
  pending,
  submitted,
  startedFromStored = false,
  getStorage = getBrowserLocalStorage,
  delayMs = COMMUNITY_DRAFT_AUTOSAVE_DELAY_MS,
}: UseCommunityDraftAutosaveOptions) {
  const pendingRef = useRef<(() => void) | null>(null)
  const wroteRef = useRef(startedFromStored)
  const { title, content, location, category = null } = value

  useEffect(() => {
    if (!storageKey || submitted) {
      pendingRef.current = null
      return
    }

    if (pending) {
      // 직전 렌더가 잡아 둔 저장(그때의 값)을 지금 쓴다. 저장 중에는 입력이 잠겨 값이 같다.
      pendingRef.current?.()
      return
    }

    // 처음부터 바뀐 것이 없으면 storage 를 건드리지도 않는다.
    if (!dirty && !wroteRef.current) {
      pendingRef.current = null
      return
    }

    const save = () => {
      pendingRef.current = null

      if (dirty) {
        const wrote = writeCommunityStoredDraft(
          getStorage,
          storageKey,
          createCommunityStoredDraft(
            { title, content, location, category },
            Date.now(),
          ),
        )
        wroteRef.current = wroteRef.current || wrote
        return
      }

      removeCommunityStoredDraft(getStorage, storageKey)
      wroteRef.current = false
    }

    pendingRef.current = save
    const timer = window.setTimeout(save, delayMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    storageKey,
    pending,
    submitted,
    dirty,
    title,
    content,
    location,
    category,
    getStorage,
    delayMs,
  ])

  useEffect(() => {
    const flush = () => {
      pendingRef.current?.()
    }

    window.addEventListener('pagehide', flush)

    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])
}

export default useCommunityDraftAutosave
