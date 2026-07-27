import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CommunityDetailPage from '@/components/community/community-detail-page'
import { buildCommunityMetadataDescription } from '@/lib/community'
import { fetchCommunityPostForMetadata } from '@/lib/api/community-server'
import { parseCommunityPostId } from '@/lib/community/community-state'
import { createPageMetadata } from '@/lib/metadata'

type PageProps = {
  params: Promise<{
    communityId: string
  }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { communityId } = await params
  const resolvedCommunityId = parseCommunityPostId(communityId)

  if (resolvedCommunityId === null) {
    return createPageMetadata({
      title: '커뮤니티 게시글',
      description: '창업 경험과 상권 인사이트를 나누는 커뮤니티 게시글입니다.',
      path: `/community/${communityId}`,
      index: true,
      type: 'article',
    })
  }

  try {
    const detail = await fetchCommunityPostForMetadata(resolvedCommunityId)

    if (detail) {
      return createPageMetadata({
        title: detail.title,
        description: buildCommunityMetadataDescription(
          detail.targetName,
          detail.content,
        ),
        path: `/community/${communityId}`,
        index: true,
        type: 'article',
      })
    }
  } catch {
    //
  }

  return createPageMetadata({
    title: '커뮤니티 게시글',
    description: '창업 경험과 상권 인사이트를 나누는 커뮤니티 게시글입니다.',
    path: `/community/${communityId}`,
    index: true,
    type: 'article',
  })
}

export default async function Page({ params }: PageProps) {
  const { communityId } = await params
  const resolvedCommunityId = parseCommunityPostId(communityId)

  if (resolvedCommunityId === null) {
    notFound()
  }

  return <CommunityDetailPage communityId={resolvedCommunityId} />
}
