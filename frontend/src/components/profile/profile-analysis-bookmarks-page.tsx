'use client'

import {
  CardEyebrow,
  CardGrid,
  CardText,
  CardTitle,
  ContentCard,
  EmptyState,
  MetaItem,
  MetaList,
  SectionNotice,
  SectionPanel,
  SectionStack,
  SectionTitle,
  SectionBody,
} from '@/components/profile/profile-ui'
import { useMemberBookmarks } from '@/hooks/use-member-bookmarks'
import { formatDateTime } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'
import type { MemberBookmark } from '@/types/bookmark'

export type ProfileRegionBookmarkItem = MemberBookmark & {
  targetType: 'DISTRICT' | 'ADMINISTRATION'
}

export const createProfileRegionBookmarkView = (
  bookmarks: readonly MemberBookmark[],
): ProfileRegionBookmarkItem[] =>
  bookmarks.filter(
    (bookmark): bookmark is ProfileRegionBookmarkItem =>
      bookmark.targetType === 'DISTRICT' ||
      bookmark.targetType === 'ADMINISTRATION',
  )

const targetLabels: Record<ProfileRegionBookmarkItem['targetType'], string> = {
  DISTRICT: '자치구',
  ADMINISTRATION: '행정동',
}

export function ProfileRegionBookmarkCards({
  bookmarks,
}: {
  bookmarks: readonly ProfileRegionBookmarkItem[]
}) {
  return (
    <CardGrid>
      {bookmarks.map(bookmark => (
        <ContentCard key={bookmark.bookmarkId}>
          <CardEyebrow>{targetLabels[bookmark.targetType]}</CardEyebrow>
          <CardTitle>{bookmark.targetName}</CardTitle>
          <CardText>지역 코드 {bookmark.targetCode}</CardText>
          <MetaList>
            <MetaItem>{formatDateTime(bookmark.createdAt)}</MetaItem>
          </MetaList>
        </ContentCard>
      ))}
    </CardGrid>
  )
}

export default function ProfileAnalysisBookmarksPage() {
  const memberId = useAuthStore(auth => auth.memberInfo?.memberId ?? null)
  const query = useMemberBookmarks(memberId, true)
  const bookmarks = createProfileRegionBookmarkView(query.bookmarks)

  if (query.isLoading) {
    return (
      <SectionStack>
        <SectionNotice $tone="info">
          저장한 지역을 불러오는 중입니다.
        </SectionNotice>
      </SectionStack>
    )
  }

  if (query.isError) {
    return (
      <SectionStack>
        <SectionNotice $tone="error">
          {query.errorMessage ?? '저장한 지역을 불러오지 못했습니다.'}
        </SectionNotice>
      </SectionStack>
    )
  }

  if (bookmarks.length === 0) {
    return (
      <SectionStack>
        <SectionPanel>
          <SectionTitle>자치구·행정동 북마크</SectionTitle>
          <SectionBody>
            상권 탐색 중 저장한 자치구와 행정동이 이 목록에 표시됩니다.
          </SectionBody>
        </SectionPanel>
        <EmptyState>저장한 자치구나 행정동이 아직 없습니다.</EmptyState>
      </SectionStack>
    )
  }

  return (
    <SectionStack>
      <SectionPanel>
        <SectionTitle>자치구·행정동 북마크</SectionTitle>
        <SectionBody>
          V2 회원 북마크에 저장된 지역입니다. 분석 결과를 복원하는 업종·기간
          조건은 현재 북마크 계약에 포함되지 않아 저장된 지역 정보만 표시합니다.
        </SectionBody>
      </SectionPanel>
      <ProfileRegionBookmarkCards bookmarks={bookmarks} />
    </SectionStack>
  )
}
