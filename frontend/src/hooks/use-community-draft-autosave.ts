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
  /** `null` 이면 저장하지 않는다 — 비교 초안으로 들어온 글(초안이 이긴다). */
  storageKey: string | null
  value: Pick<CommunityEditorValue, 'title' | 'content' | 'location'>
  /** 처음 값과 다른가. 같아지면 앞서 쓴 저장본을 지운다. */
  dirty: boolean
  /** 저장 중(pending)·등록 성공 뒤. 잡혀 있던 저장도 버린다. */
  paused: boolean
  getStorage?: CommunityStorageGetter
  delayMs?: number
}

/**
 * 입력이 멈추고 1초 뒤 제목·본문·지역을 저장한다(community.md §S4 「잃지 않게」).
 *
 * - **사진은 넣지 않는다**(`createCommunityStoredDraft` 가 고른 필드만 담는다).
 * - `paused` 가 켜지면 잡힌 타이머를 버린다. 등록 성공 뒤 이동이 끝나기 전에 타이머가 돌면
 *   방금 지운 저장본이 되살아난다 — mutation 의 pending 이 끝나기 전에 성공 표시가 먼저
 *   켜지므로(register-page onSuccess) 그 사이 타이머가 잡힐 틈이 없다.
 * - 1초가 차기 전에 나가거나(언마운트) 새로고침하면(`pagehide`) 그 자리에서 밀어 쓴다.
 *   이탈 확인 문구가 「임시 저장돼요」라고 말하므로 그 말이 참이어야 한다.
 */
export function useCommunityDraftAutosave({
  storageKey,
  value,
  dirty,
  paused,
  getStorage = getBrowserLocalStorage,
  delayMs = COMMUNITY_DRAFT_AUTOSAVE_DELAY_MS,
}: UseCommunityDraftAutosaveOptions) {
  const pendingRef = useRef<(() => void) | null>(null)
  const wroteRef = useRef(false)
  const { title, content, location } = value

  useEffect(() => {
    // 처음부터 바뀐 것이 없으면 storage 를 건드리지도 않는다.
    if (!storageKey || paused || (!dirty && !wroteRef.current)) {
      pendingRef.current = null
      return
    }

    const save = () => {
      pendingRef.current = null

      if (dirty) {
        const wrote = writeCommunityStoredDraft(
          getStorage,
          storageKey,
          createCommunityStoredDraft({ title, content, location }, Date.now()),
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
  }, [storageKey, paused, dirty, title, content, location, getStorage, delayMs])

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
