import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api/client'
import {
  addMemberBookmark,
  fetchMemberBookmarks,
  removeMemberBookmark,
} from './user'

const successResponse = {
  dataHeader: {
    success: true,
    resultCode: null,
    resultMessage: null,
  },
  dataBody: {
    bookmarks: {
      contents: [],
      hasNext: false,
    },
  },
}

describe('member bookmark API', () => {
  afterEach(() => vi.restoreAllMocks())

  it('serializes size and optional last bookmark id with URLSearchParams', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ data: successResponse })

    await fetchMemberBookmarks(91, 20)

    expect(get).toHaveBeenCalledWith(
      '/members/me/bookmarks?size=20&lastBookmarkId=91',
    )
  })

  it('omits lastBookmarkId on the first page', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ data: successResponse })

    await fetchMemberBookmarks()

    expect(get).toHaveBeenCalledWith('/members/me/bookmarks?size=50')
  })

  it('passes an AbortSignal to the member bookmark request', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ data: successResponse })
    const signal = new AbortController().signal

    await fetchMemberBookmarks(91, 20, signal)

    expect(get).toHaveBeenCalledWith(
      '/members/me/bookmarks?size=20&lastBookmarkId=91',
      { signal },
    )
  })

  it('creates a COMMERCIAL bookmark with the exact target payload', async () => {
    const response = {
      ...successResponse,
      dataBody: {
        bookmarkId: 7,
        targetType: 'COMMERCIAL',
        targetCode: 'C001',
        targetName: '테헤란로',
        createdAt: '2026-07-24T10:00:00',
      },
    }
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: response })

    await addMemberBookmark({
      targetType: 'COMMERCIAL',
      targetCode: 'C001',
      targetName: '테헤란로',
    })

    expect(post).toHaveBeenCalledWith('/members/me/bookmarks', {
      targetType: 'COMMERCIAL',
      targetCode: 'C001',
      targetName: '테헤란로',
    })
  })

  it('deletes the exact bookmark id', async () => {
    const response = {
      ...successResponse,
      dataBody: null,
    }
    const remove = vi
      .spyOn(apiClient, 'delete')
      .mockResolvedValue({ data: response })

    await removeMemberBookmark(701)

    expect(remove).toHaveBeenCalledWith('/members/me/bookmarks/701')
  })
})
