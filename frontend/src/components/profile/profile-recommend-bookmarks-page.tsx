'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, BookmarkMinus } from 'lucide-react'

import {
  CardEyebrow,
  CardGrid,
  CardHeaderRow,
  CardOverlayAction,
  CardStretchedButton,
  CardText,
  CardTitle,
  ContentCard,
  DangerGhostButton,
  EmptyState,
  MetaItem,
  MetaList,
  SectionNotice,
  SectionPanel,
  SectionStack,
  SectionTitle,
  SectionBody,
} from '@/components/profile/profile-ui'
import { useUndoableRemoval } from '@/components/profile/use-undoable-removal'
import { ButtonLink } from '@/components/ui/button'
import { useCommercialBookmarks } from '@/hooks/use-commercial-bookmarks'
import { fetchCommercialRegion } from '@/lib/api/recommend'
import { getResponseBody } from '@/lib/api/response'
import { removeMemberBookmark } from '@/lib/api/user'
import { formatDateTime } from '@/lib/format'
import { createCommercialBookmarkHref } from '@/lib/profile/bookmark-links'
import {
  excludeHiddenItems,
  requestRemoval,
} from '@/lib/profile/removal-request'
import { BOOKMARK_REMOVAL_BATCH_COPY } from '@/lib/profile/removal-batch-copy'
import { invalidateMemberBookmarksQuery } from '@/lib/recommend/recommend-bookmarks'
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

/** 상위 코드를 찾지 못해 분석 화면을 열 수 없을 때. 카드 안에 적는다. */
export const COMMERCIAL_BOOKMARK_OPEN_FAILED =
  '이 상권이 속한 행정동을 찾지 못해 분석 화면을 열 수 없어요. 잠시 후 다시 눌러 주세요.'

/**
 * 상권 카드. 내부 코드(「상권 코드 3110008」) 대신 무엇을 하는 카드인지 적는다(#574).
 *
 * 상위 지역 이름은 적지 않는다 — 북마크 응답에 없고, 카드마다 역조회하면 카드 수만큼 요청이 나간다(N+1). 카드를
 * 누를 때 그 하나만 역조회해 분석 화면으로 보낸다(`createCommercialBookmarkHref`).
 */
export function ProfileRecommendBookmarkCards({
  bookmarks,
  onOpen,
  onRemove,
  openingCode = null,
  failedCode = null,
}: {
  bookmarks: readonly ProfileRecommendBookmarkItem[]
  onOpen: (bookmark: ProfileRecommendBookmarkItem) => void
  onRemove: (bookmark: ProfileRecommendBookmarkItem) => void
  openingCode?: string | null
  failedCode?: string | null
}) {
  return (
    <CardGrid>
      {bookmarks.map(bookmark => (
        <ContentCard key={bookmark.bookmarkId}>
          <CardHeaderRow>
            <div>
              <CardEyebrow>상권 북마크</CardEyebrow>
              <CardTitle>
                <CardStretchedButton
                  aria-label={`${bookmark.targetName} 상권 분석 열기`}
                  aria-busy={openingCode === bookmark.targetCode || undefined}
                  disabled={openingCode === bookmark.targetCode}
                  onClick={() => onOpen(bookmark)}
                >
                  {bookmark.targetName}
                </CardStretchedButton>
              </CardTitle>
            </div>
            <CardOverlayAction>
              <DangerGhostButton
                aria-label={`${bookmark.targetName} 북마크 해제`}
                leftIcon={<BookmarkMinus />}
                onClick={() => onRemove(bookmark)}
              >
                해제
              </DangerGhostButton>
            </CardOverlayAction>
          </CardHeaderRow>
          <CardText>
            {openingCode === bookmark.targetCode
              ? '분석 화면을 여는 중이에요.'
              : '누르면 이 상권을 고른 상권 분석 화면이 열려요.'}
          </CardText>
          <MetaList>
            <MetaItem>저장 {formatDateTime(bookmark.createdAt)}</MetaItem>
          </MetaList>
          {failedCode === bookmark.targetCode ? (
            <SectionNotice $tone="error" role="alert">
              {COMMERCIAL_BOOKMARK_OPEN_FAILED}
            </SectionNotice>
          ) : null}
        </ContentCard>
      ))}
    </CardGrid>
  )
}

export default function ProfileRecommendBookmarksPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const memberId = useAuthStore(auth => auth.memberInfo?.memberId ?? null)
  const query = useCommercialBookmarks(memberId, true)
  const [failedCode, setFailedCode] = useState<string | null>(null)
  /*
    역조회가 끝나 이동을 시작한 카드. 이동이 끝나 이 화면이 내려갈 때까지 잠근다 — 성공하자마자 풀면 그 사이 연타가
    역조회와 이동을 한 번 더 일으킨다.
  */
  const [navigatingCode, setNavigatingCode] = useState<string | null>(null)

  const removal = useUndoableRemoval({
    scope: 'profile-commercial-bookmark-remove',
    batchCopy: BOOKMARK_REMOVAL_BATCH_COPY,
    commit: async bookmarkId => {
      await requestRemoval(
        () => removeMemberBookmark(bookmarkId),
        '북마크를 해제하지 못했어요.',
      )
      if (memberId) await invalidateMemberBookmarksQuery(queryClient, memberId)
    },
  })

  const openMutation = useMutation({
    mutationFn: (commercialCode: string) =>
      fetchCommercialRegion(commercialCode),
    onSuccess: (response, commercialCode) => {
      const href = createCommercialBookmarkHref(getResponseBody(response))
      if (!href) {
        setFailedCode(commercialCode)
        return
      }
      setNavigatingCode(commercialCode)
      router.push(href)
    },
    onError: (_error, commercialCode) => setFailedCode(commercialCode),
  })

  const bookmarks = excludeHiddenItems(
    createProfileRecommendBookmarkView(query.bookmarks),
    removal.hiddenKeys,
    bookmark => bookmark.bookmarkId,
  )

  if (query.isLoading) {
    return (
      <SectionStack>
        <SectionNotice $tone="info">
          저장한 상권 목록을 불러오는 중입니다.
        </SectionNotice>
      </SectionStack>
    )
  }

  if (query.isError) {
    return (
      <SectionStack>
        <SectionNotice $tone="error">
          {query.errorMessage ?? '저장한 상권 목록을 불러오지 못했습니다.'}
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
            상권 분석이나 상권 추천 화면에서 저장한 상권이 이 목록에 모여요.
          </SectionBody>
        </SectionPanel>
        <EmptyState>
          아직 저장한 상권이 없어요. 상권 추천을 받아 마음에 드는 상권을 저장해
          보세요.
          <ButtonLink
            href="/recommend"
            size="medium"
            variant="secondary"
            rightIcon={<ArrowRight />}
          >
            상권 추천 받으러 가기
          </ButtonLink>
        </EmptyState>
      </SectionStack>
    )
  }

  return (
    <SectionStack>
      <SectionPanel>
        <SectionTitle>상권 북마크</SectionTitle>
        <SectionBody>
          저장한 상권 목록입니다. 카드를 누르면 그 상권을 고른 상권 분석 화면이
          열려 업종만 고르면 됩니다.
        </SectionBody>
      </SectionPanel>
      <ProfileRecommendBookmarkCards
        bookmarks={bookmarks}
        openingCode={
          openMutation.isPending ? openMutation.variables : navigatingCode
        }
        failedCode={failedCode}
        onOpen={bookmark => {
          // 다른 카드도 함께 막는다 — 두 곳으로 동시에 이동시키지 않는다.
          if (openMutation.isPending || navigatingCode) return
          setFailedCode(null)
          openMutation.mutate(bookmark.targetCode)
        }}
        onRemove={bookmark =>
          removal.remove(bookmark.bookmarkId, {
            removed: `${bookmark.targetName} 북마크를 해제했어요.`,
            restored: `${bookmark.targetName} 북마크를 해제하지 못해 다시 보여 드려요.`,
            failed: `${bookmark.targetName} 북마크를 해제하지 못했어요.`,
            pending: `${bookmark.targetName} 북마크는 아직 되돌릴 수 있어요.`,
            alreadyDone: `${bookmark.targetName} 북마크는 이미 해제됐어요.`,
          })
        }
      />
    </SectionStack>
  )
}
