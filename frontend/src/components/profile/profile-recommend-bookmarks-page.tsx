'use client'

import {
  CardEyebrow,
  CardGrid,
  CardText,
  CardTitle,
  ContentCard,
  MetaItem,
  MetaList,
  SectionNotice,
  SectionPanel,
  SectionStack,
  SectionTitle,
  SectionBody,
} from '@/components/profile/profile-ui'
import { useCommercialBookmarks } from '@/hooks/use-commercial-bookmarks'
import { formatDateTime } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'
import type { MemberBookmark } from '@/types/bookmark'

export type ProfileRecommendBookmarkItem = Pick<
  MemberBookmark,
  'bookmarkId' | 'targetCode' | 'targetName' | 'createdAt'
>

export const createProfileRecommendBookmarkView = (
  bookmarks: readonly MemberBookmark[],
): ProfileRecommendBookmarkItem[] =>
  bookmarks.flatMap(bookmark =>
    bookmark.targetType === 'COMMERCIAL'
      ? [
          {
            bookmarkId: bookmark.bookmarkId,
            targetCode: bookmark.targetCode,
            targetName: bookmark.targetName,
            createdAt: bookmark.createdAt,
          },
        ]
      : [],
  )

export function ProfileRecommendBookmarkCards({
  bookmarks,
}: {
  bookmarks: readonly ProfileRecommendBookmarkItem[]
}) {
  return (
    <CardGrid>
      {bookmarks.map(bookmark => (
        <ContentCard key={bookmark.bookmarkId}>
          <CardEyebrow>상권 북마크</CardEyebrow>
          <CardTitle>{bookmark.targetName}</CardTitle>
          <CardText>상권 코드 {bookmark.targetCode}</CardText>
          <MetaList>
            <MetaItem>{formatDateTime(bookmark.createdAt)}</MetaItem>
          </MetaList>
        </ContentCard>
      ))}
    </CardGrid>
  )
}

export default function ProfileRecommendBookmarksPage() {
  const memberId = useAuthStore(auth => auth.memberInfo?.memberId ?? null)
  const query = useCommercialBookmarks(memberId, true)
  const bookmarks = createProfileRecommendBookmarkView(query.bookmarks)

  if (query.isLoading) {
    return (
      <SectionStack>
        <SectionNotice $tone="info">
          추천 상권 저장 목록을 불러오는 중입니다.
        </SectionNotice>
      </SectionStack>
    )
  }

  if (query.isError) {
    return (
      <SectionStack>
        <SectionNotice $tone="error">
          {query.errorMessage ?? '추천 상권 저장 목록을 불러오지 못했습니다.'}
        </SectionNotice>
      </SectionStack>
    )
  }

  if (bookmarks.length === 0) {
    return (
      <SectionStack>
        <SectionPanel>
          <SectionTitle>상권 북마크</SectionTitle>
          <SectionBody>
            아직 저장된 상권이 없어요. 상권 분석이나 추천 화면에서 저장하면 이
            목록에 표시됩니다.
          </SectionBody>
        </SectionPanel>
      </SectionStack>
    )
  }

  return (
    <SectionStack>
      <SectionPanel>
        <SectionTitle>상권 북마크</SectionTitle>
        <SectionBody>저장한 상권 목록입니다.</SectionBody>
      </SectionPanel>
      <ProfileRecommendBookmarkCards bookmarks={bookmarks} />
    </SectionStack>
  )
}
