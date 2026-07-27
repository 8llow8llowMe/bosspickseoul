import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCommunityMetadataDescription } from '@/lib/community'

const { fetchCommunityPostForMetadata, notFound } = vi.hoisted(() => ({
  fetchCommunityPostForMetadata: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('@/lib/api/community-server', () => ({
  fetchCommunityPostForMetadata,
}))
vi.mock('next/navigation', () => ({ notFound }))

import Page, { generateMetadata } from './page'

describe('community detail route ID validation', () => {
  beforeEach(() => {
    fetchCommunityPostForMetadata.mockReset()
    notFound.mockClear()
  })

  it.each(['1.5', '1e2', '+1', ' 1', '01', '9007199254740992'])(
    'does not fetch metadata for malformed ID %s',
    async communityId => {
      await generateMetadata({ params: Promise.resolve({ communityId }) })

      expect(fetchCommunityPostForMetadata).not.toHaveBeenCalled()
    },
  )

  it('builds successful metadata from the canonical server response', async () => {
    fetchCommunityPostForMetadata.mockResolvedValue({
      postId: 7,
      memberId: 9001,
      targetType: {
        code: 'COMMERCIAL',
        name: '상권',
        description: '상권 게시판',
      },
      targetCode: '3110008',
      targetName: '강남역 상권',
      title: '강남역 운영 경험',
      content: '점심 시간 운영 경험을 공유합니다.',
      likeCount: 1,
      commentCount: 2,
      viewCount: 3,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ communityId: '7' }),
    })

    expect(fetchCommunityPostForMetadata).toHaveBeenCalledWith(7)
    expect(metadata.title).toBe('강남역 운영 경험')
    expect(metadata.description).toBe(
      buildCommunityMetadataDescription(
        '강남역 상권',
        '점심 시간 운영 경험을 공유합니다.',
      ),
    )
  })

  it('returns fallback metadata when the canonical server request is unavailable', async () => {
    fetchCommunityPostForMetadata.mockResolvedValue(null)

    const metadata = await generateMetadata({
      params: Promise.resolve({ communityId: '7' }),
    })

    expect(metadata.title).toBe('커뮤니티 게시글')
    expect(metadata.description).toBe(
      '창업 경험과 상권 인사이트를 나누는 커뮤니티 게시글입니다.',
    )
  })

  it.each(['1.5', '1e2', '+1', ' 1', '01', '9007199254740992'])(
    'routes malformed ID %s to notFound',
    async communityId => {
      await expect(
        Page({ params: Promise.resolve({ communityId }) }),
      ).rejects.toThrow('NEXT_NOT_FOUND')
      expect(notFound).toHaveBeenCalledOnce()
    },
  )
})
