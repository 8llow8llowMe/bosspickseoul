'use client'

import { useEffect, useRef } from 'react'

import {
  clearCommunityListScroll,
  communityHistoryTraversal,
  getCommunityListScrollStep,
  getCommunityListScrollTop,
  readCommunityListScroll,
} from '@/lib/community/list-scroll'

/** 글 행 링크에 다는 속성. 복원할 때 이 속성으로 누른 행을 찾는다. */
export const COMMUNITY_POST_ROW_ATTRIBUTE = 'data-community-post-id'

const findRowDocumentTop = (postId: string) => {
  const rows = document.querySelectorAll<HTMLElement>(
    `[${COMMUNITY_POST_ROW_ATTRIBUTE}]`,
  )

  for (const row of rows) {
    if (row.getAttribute(COMMUNITY_POST_ROW_ATTRIBUTE) === postId) {
      return row.getBoundingClientRect().top + window.scrollY
    }
  }

  return null
}

type UseCommunityListScrollRestoreOptions = {
  contextKey: string
  status: 'loading' | 'error' | 'empty' | 'ready'
}

/**
 * 상세에서 돌아왔을 때 보던 행 근처로 스크롤한다(community.md §S4, CM-030). 저장은 글 행을
 * 누를 때 목록 페이지가 한다(`saveCommunityListScroll`). 판단 근거는 `lib/community/list-scroll.ts`.
 *
 * - 브라우저 뒤로/앞으로(popstate 직후 마운트)일 때만 복원한다. 헤더 링크 같은 새 진입은 맨 위에서
 *   시작하고 자리는 **지우지 않는다** — 뒤로 두 번 눌러 원래 목록 기록으로 돌아가면 그 목록이 쓴다.
 *   뒤로 가기 여부는 마운트 때 정한다(첫 쪽 응답이 늦어도 그대로).
 * - 이 마운트에서 **처음 한 번만** 본다. 첫 쪽을 기다렸다가(loading) 글이 그려지면 복원하고,
 *   비었거나 실패면 자리를 버린다. 누른 행이 다시 그려지지 않았으면(캐시가 버려짐) 복원하지 않고
 *   자리만 버린다. 그 뒤 보기·검색을 바꿔도 다시 끌어오지 않는다.
 * - 한 프레임 미뤄 행 배치가 끝난 뒤 잰다. 「처리 완료」 표시는 그 프레임 안에서 한다 —
 *   StrictMode 의 이펙트 두 번 실행에서 첫 번째 프레임이 취소돼도 두 번째가 복원한다.
 */
export const useCommunityListScrollRestore = ({
  contextKey,
  status,
}: UseCommunityListScrollRestoreOptions) => {
  const settledRef = useRef(false)
  /** 이 마운트가 popstate 직후였는가. 첫 이펙트에서 정한다(null = 아직 모름). */
  const traversalRef = useRef<boolean | null>(null)

  // 아래 복원 이펙트보다 먼저 선언해 같은 커밋에서 먼저 정한다.
  useEffect(() => {
    communityHistoryTraversal.start(window)

    if (traversalRef.current === null) {
      traversalRef.current = communityHistoryTraversal.wasRecent()
    }
  }, [])

  useEffect(() => {
    if (settledRef.current || typeof window === 'undefined') {
      return
    }

    if (!traversalRef.current) {
      settledRef.current = true
      return
    }

    const step = getCommunityListScrollStep(status)

    if (step === 'wait') {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      settledRef.current = true

      let storage: Storage

      try {
        storage = window.sessionStorage
      } catch {
        return
      }

      const snapshot = readCommunityListScroll(storage, {
        contextKey,
        now: Date.now(),
      })

      if (!snapshot) {
        return
      }

      clearCommunityListScroll(storage)

      if (step === 'discard') {
        return
      }

      const top = getCommunityListScrollTop(
        snapshot,
        findRowDocumentTop(snapshot.postId),
      )

      if (top === null) {
        return
      }

      window.scrollTo({ top, behavior: 'instant' })
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [contextKey, status])
}

export default useCommunityListScrollRestore
