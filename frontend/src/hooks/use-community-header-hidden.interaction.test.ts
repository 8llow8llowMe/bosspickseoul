// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useCommunityHeaderHidden } from '@/hooks/use-community-header-hidden'
import { COMMUNITY_HEADER_HIDDEN_ATTRIBUTE } from '@/lib/community/hidden-header'

/*
  목록 숨는 헤더(community.md §S4 「숨는 헤더」, CM-043)의 연결 계약.
  목록이 <html> 의 data 속성 하나만 켜고 끈다 — 사이트 헤더·툴바는 그 속성을 CSS 로 읽는다.
*/

const readAttribute = () =>
  document.documentElement.getAttribute(COMMUNITY_HEADER_HIDDEN_ATTRIBUTE)

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute(COMMUNITY_HEADER_HIDDEN_ATTRIBUTE)
})

describe('useCommunityHeaderHidden', () => {
  it('sets the root attribute while hidden and removes it when shown again', () => {
    const { rerender } = renderHook(
      ({ hidden }) => useCommunityHeaderHidden(hidden),
      { initialProps: { hidden: false } },
    )

    expect(readAttribute()).toBeNull()

    rerender({ hidden: true })
    expect(readAttribute()).toBe('true')

    rerender({ hidden: false })
    expect(readAttribute()).toBeNull()
  })

  it('removes the attribute when the list unmounts while hidden', () => {
    const { unmount } = renderHook(() => useCommunityHeaderHidden(true))

    expect(readAttribute()).toBe('true')

    unmount()
    expect(readAttribute()).toBeNull()
  })
})
