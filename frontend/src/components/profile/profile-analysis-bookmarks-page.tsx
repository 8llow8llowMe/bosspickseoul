'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, BookmarkMinus, Trash2 } from 'lucide-react'
import styled from 'styled-components'

import {
  CardEyebrow,
  CardGrid,
  CardHeaderRow,
  CardOverlayAction,
  CardStretchedLink,
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
import { Button, ButtonLink } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { TextField } from '@/components/ui/text-field'
import { useMemberBookmarks } from '@/hooks/use-member-bookmarks'
import {
  deleteAnalysisBookmark,
  fetchAnalysisBookmarks,
  updateAnalysisBookmarkName,
} from '@/lib/api/analysis-bookmark'
import { normalizeApiError } from '@/lib/api/api-error'
import {
  getApiMessage,
  getResponseBody,
  isApiSuccess,
} from '@/lib/api/response'
import { removeMemberBookmark } from '@/lib/api/user'
import {
  type AnalysisBookmarkTab,
  BOOKMARK_TAB_PARAM,
  createAnalysisBookmarkTabHref,
  createRegionBookmarkHref,
  describeRegionBookmarkParent,
  parseAnalysisBookmarkTab,
} from '@/lib/profile/bookmark-links'
import {
  excludeHiddenItems,
  requestRemoval,
} from '@/lib/profile/removal-request'
import {
  ARCHIVE_REMOVAL_BATCH_COPY,
  BOOKMARK_REMOVAL_BATCH_COPY,
} from '@/lib/profile/removal-batch-copy'
import { invalidateMemberBookmarksQuery } from '@/lib/recommend/recommend-bookmarks'
import { SHARE_TYPE_LABELS, type ShareType } from '@/lib/share/payload'
import {
  buildShareRoute,
  getShareRouteFailureMessage,
} from '@/lib/share/routes'
import { formatDateTime } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'
import type { AnalysisBookmark, MemberBookmark } from '@/types/bookmark'

/* ------------------------------------------------------------------------- *
 * 탭 1 — 지역 북마크 (자치구·행정동 **엔티티** 즐겨찾기)
 * ------------------------------------------------------------------------- */

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
  onRemove,
}: {
  bookmarks: readonly ProfileRegionBookmarkItem[]
  onRemove: (bookmark: ProfileRegionBookmarkItem) => void
}) {
  return (
    <CardGrid>
      {bookmarks.map(bookmark => (
        <ContentCard key={bookmark.bookmarkId}>
          <CardHeaderRow>
            <div>
              <CardEyebrow>{targetLabels[bookmark.targetType]}</CardEyebrow>
              <CardTitle>
                <CardStretchedLink
                  href={createRegionBookmarkHref(bookmark)}
                  aria-label={`${bookmark.targetName} 상권 분석 열기`}
                >
                  {bookmark.targetName}
                </CardStretchedLink>
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
          <CardText>{describeRegionBookmarkParent(bookmark)}</CardText>
          <MetaList>
            <MetaItem>저장 {formatDateTime(bookmark.createdAt)}</MetaItem>
          </MetaList>
        </ContentCard>
      ))}
    </CardGrid>
  )
}

/* ------------------------------------------------------------------------- *
 * 탭 2 — 화면 보관함 (업종·기간 조건까지 포함한 **화면 상태** 저장)
 * ------------------------------------------------------------------------- */

/**
 * 필터는 **FE 가 실제로 생성하는 타입**만 노출한다. 칩을 두면 항상 빈 목록이 되기 때문이다.
 * (그래도 목록에 섞여 오면 카드가 처리한다)
 *
 * - `DISTRICT_ANALYSIS`: 복원 가능한 URL 상태가 없다 — 빌더 자체가 없다(`routes.ts`)
 * - `COMMERCIAL_COMPARISON`: **빌더는 생겼다.** 저장된 항목이 있으면 카드가 열 수 있다.
 *   다만 아직 비교 화면에 공유·보관 버튼이 없어 생성되지 않는다. 그 버튼이 붙으면
 *   여기 칩도 함께 추가한다.
 */
const ARCHIVE_FILTERS: readonly { label: string; value: ShareType | null }[] = [
  { label: '전체', value: null },
  {
    label: SHARE_TYPE_LABELS.COMMERCIAL_ANALYSIS,
    value: 'COMMERCIAL_ANALYSIS',
  },
  { label: SHARE_TYPE_LABELS.AI_REPORT, value: 'AI_REPORT' },
  {
    label: SHARE_TYPE_LABELS.ADMINISTRATION_ANALYSIS,
    value: 'ADMINISTRATION_ANALYSIS',
  },
]

export const ANALYSIS_BOOKMARKS_QUERY_KEY = 'analysis-bookmarks'

/** 항목의 표시 이름. 이름이 없으면 화면 타입 라벨로 대신한다. */
export const getArchiveItemTitle = (item: AnalysisBookmark): string => {
  const name = item.bookmarkName?.trim()
  if (name) return name
  const code = item.shareType?.code
  return (code && SHARE_TYPE_LABELS[code as ShareType]) || '분석 화면'
}

/** payload 를 사람이 읽을 한 줄 요약으로. 결과 데이터가 아니라 조건만 담겨 있다. */
export const summarizeArchivePayload = (item: AnalysisBookmark): string => {
  const payload = item.payload ?? {}
  const parts = Object.entries(payload)
    .filter(([, value]) => typeof value === 'string' && value)
    .map(([key, value]) => `${key} ${value as string}`)
  return parts.length > 0 ? parts.join(' · ') : '저장된 조건 없음'
}

const ArchiveCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

const ArchiveActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
`

/* 삭제는 「화면 열기·이름 수정」과 떨어뜨려 오른쪽 끝에 둔다 — 8px 옆에 붙어 있으면 잘못 누른다(#574). */
const ArchiveDangerSlot = styled.div`
  margin-left: auto;
`

const RenameRow = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 12px;
`

const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export function ProfileAnalysisArchiveCards({
  items,
  onOpen,
  onRename,
  onDelete,
  busyBookmarkId,
}: {
  items: readonly AnalysisBookmark[]
  onOpen: (item: AnalysisBookmark) => void
  onRename: (bookmarkId: string, bookmarkName: string | null) => void
  onDelete: (item: AnalysisBookmark) => void
  busyBookmarkId?: string | null
}) {
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(
    null,
  )

  return (
    <CardGrid>
      {items.map(item => {
        const route = buildShareRoute(item.shareType?.code, item.payload)
        const isEditing = editing?.id === item.bookmarkId
        const busy = busyBookmarkId === item.bookmarkId

        return (
          <ContentCard key={item.bookmarkId} data-bookmark-id={item.bookmarkId}>
            <ArchiveCardHeader>
              <div>
                <CardEyebrow>
                  {item.shareType?.name ??
                    SHARE_TYPE_LABELS[item.shareType?.code as ShareType] ??
                    '분석 화면'}
                </CardEyebrow>
                <CardTitle>{getArchiveItemTitle(item)}</CardTitle>
              </div>
            </ArchiveCardHeader>
            <CardText>{summarizeArchivePayload(item)}</CardText>
            <MetaList>
              <MetaItem>{formatDateTime(item.createdAt)}</MetaItem>
            </MetaList>

            {isEditing ? (
              <RenameRow>
                <TextField
                  label="보관함 이름"
                  maxLength={50}
                  value={editing.value}
                  onChange={event =>
                    setEditing({
                      id: item.bookmarkId,
                      value: event.target.value,
                    })
                  }
                />
                <ArchiveActions>
                  <Button
                    size="tiny"
                    isLoading={busy}
                    onClick={() => {
                      onRename(item.bookmarkId, editing.value.trim() || null)
                      setEditing(null)
                    }}
                  >
                    저장
                  </Button>
                  <Button
                    size="tiny"
                    variant="secondary"
                    onClick={() => setEditing(null)}
                  >
                    취소
                  </Button>
                </ArchiveActions>
              </RenameRow>
            ) : (
              <ArchiveActions>
                <Button
                  size="tiny"
                  disabled={!route.ok}
                  onClick={() => onOpen(item)}
                >
                  {route.ok ? '화면 열기' : '열 수 없음'}
                </Button>
                <Button
                  size="tiny"
                  variant="secondary"
                  onClick={() =>
                    setEditing({
                      id: item.bookmarkId,
                      value: item.bookmarkName ?? '',
                    })
                  }
                >
                  이름 수정
                </Button>
                <ArchiveDangerSlot>
                  <DangerGhostButton
                    aria-label={`${getArchiveItemTitle(item)} 보관 삭제`}
                    leftIcon={<Trash2 />}
                    onClick={() => onDelete(item)}
                  >
                    삭제
                  </DangerGhostButton>
                </ArchiveDangerSlot>
              </ArchiveActions>
            )}

            {route.ok ? null : (
              <SectionNotice $tone="info">
                {getShareRouteFailureMessage(route.reason)}
              </SectionNotice>
            )}
          </ContentCard>
        )
      })}
    </CardGrid>
  )
}

function ProfileAnalysisArchiveTab() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [shareType, setShareType] = useState<ShareType | null>(null)
  const [busyBookmarkId, setBusyBookmarkId] = useState<string | null>(null)

  const query = useQuery({
    queryKey: [ANALYSIS_BOOKMARKS_QUERY_KEY, shareType],
    queryFn: () => fetchAnalysisBookmarks({ shareType }),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: [ANALYSIS_BOOKMARKS_QUERY_KEY],
    })

  /*
    결과 문구는 토스트로 낸다(#574). 예전에는 목록 위 안내 줄이라, 아래쪽 카드를 지우거나 고치면 화면 밖에서
    떠서 보이지 않았다.
  */
  const renameMutation = useMutation({
    mutationFn: ({
      bookmarkId,
      bookmarkName,
    }: {
      // ⚠️ 문자열. Snowflake 값이라 숫자로 바꾸면 값이 손상된다.
      bookmarkId: string
      bookmarkName: string | null
    }) => updateAnalysisBookmarkName(bookmarkId, bookmarkName),
    onSuccess: async response => {
      if (!isApiSuccess(response)) {
        showToast({
          message: getApiMessage(response, '이름을 수정하지 못했어요.'),
          tone: 'error',
        })
        return
      }
      showToast({ message: '보관한 화면의 이름을 수정했어요.' })
      await invalidate()
    },
    onError: error =>
      showToast({ message: normalizeApiError(error).message, tone: 'error' }),
    onSettled: () => setBusyBookmarkId(null),
  })

  const removal = useUndoableRemoval({
    scope: 'profile-archive-delete',
    batchCopy: ARCHIVE_REMOVAL_BATCH_COPY,
    commit: async bookmarkId => {
      await requestRemoval(
        () => deleteAnalysisBookmark(bookmarkId),
        '보관한 화면을 삭제하지 못했어요.',
      )
      await invalidate()
    },
  })

  const body = getResponseBody(query.data)
  const items = excludeHiddenItems(
    body?.bookmarks ?? [],
    removal.hiddenKeys,
    item => item.bookmarkId,
  )

  if (query.isPending) {
    return (
      <SectionNotice $tone="info">
        보관한 화면을 불러오는 중입니다.
      </SectionNotice>
    )
  }

  if (query.isError || (query.data && !isApiSuccess(query.data))) {
    const message = query.isError
      ? normalizeApiError(query.error).message
      : getApiMessage(query.data, '보관한 화면을 불러오지 못했습니다.')
    return <SectionNotice $tone="error">{message}</SectionNotice>
  }

  return (
    <SectionStack>
      <SectionPanel>
        <SectionTitle>화면 보관함</SectionTitle>
        <SectionBody>
          업종·기간 같은 <strong>조건까지 포함한 분석 화면</strong>을 저장한
          목록입니다. 항목을 열면 저장할 때 보던 화면이 그대로 복원됩니다. 지역
          자체를 저장하는 지역 북마크와는 다릅니다.
        </SectionBody>
      </SectionPanel>

      <FilterRow role="group" aria-label="화면 타입 필터">
        {ARCHIVE_FILTERS.map(filter => (
          <Button
            key={filter.label}
            size="tiny"
            variant={shareType === filter.value ? 'primary' : 'secondary'}
            onClick={() => setShareType(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </FilterRow>

      {items.length === 0 ? (
        <EmptyState>
          아직 보관한 분석 화면이 없어요. 상권 분석 결과 화면에서 &lsquo;화면
          보관&rsquo; 버튼을 누르면 조건까지 이곳에 저장돼요.
          <ButtonLink
            href="/analysis"
            size="medium"
            variant="secondary"
            rightIcon={<ArrowRight />}
          >
            상권 분석하러 가기
          </ButtonLink>
        </EmptyState>
      ) : (
        <ProfileAnalysisArchiveCards
          items={items}
          busyBookmarkId={busyBookmarkId}
          onOpen={item => {
            // 목록 응답에 payload 가 그대로 오므로 해석 API 없이 바로 이동한다.
            const route = buildShareRoute(item.shareType?.code, item.payload)
            if (route.ok) router.push(route.href)
          }}
          onRename={(bookmarkId, bookmarkName) => {
            setBusyBookmarkId(bookmarkId)
            renameMutation.mutate({ bookmarkId, bookmarkName })
          }}
          onDelete={item => {
            const title = getArchiveItemTitle(item)
            removal.remove(item.bookmarkId, {
              removed: `「${title}」 보관을 삭제했어요.`,
              restored: `「${title}」 보관을 삭제하지 못해 다시 보여 드려요.`,
              failed: `「${title}」 보관을 삭제하지 못했어요.`,
              pending: `「${title}」 보관은 아직 되돌릴 수 있어요.`,
              alreadyDone: `「${title}」 보관은 이미 삭제됐어요.`,
            })
          }}
        />
      )}
    </SectionStack>
  )
}

/* ------------------------------------------------------------------------- *
 * 페이지 — 두 개념을 탭으로 분리한다
 * ------------------------------------------------------------------------- */

/*
  안쪽 선택은 바깥 탭(지역·화면 / 상권 / 시뮬레이션, 밑줄 탭)과 위계를 나누려고 알약형 세그먼트로 그린다(#606).
  같은 밑줄 탭이 두 줄이면 어느 쪽이 위인지 읽히지 않았다. 생김새는 구별 현황 지표 세그먼트(status-metric-tabs)와
  같다 — 회색 바탕 위 선택 칸만 흰 바탕으로 떠오른다.
*/
const SegmentList = styled.div`
  display: inline-grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  gap: 2px;
  justify-self: start;
  padding: 3px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);

  @media (max-width: 640px) {
    justify-self: stretch;
  }
`

const SegmentButton = styled.button<{ $selected: boolean }>`
  min-width: 0;
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: var(--radius-pill);
  background: ${props =>
    props.$selected ? 'var(--color-surface)' : 'transparent'};
  box-shadow: ${props => (props.$selected ? 'var(--shadow-level-1)' : 'none')};
  color: ${props =>
    props.$selected ? 'var(--color-text-900)' : 'var(--color-text-700)'};
  font-size: 14px;
  font-weight: ${props => (props.$selected ? 700 : 600)};
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
`

const ANALYSIS_BOOKMARK_TABS: readonly {
  value: AnalysisBookmarkTab
  label: string
}[] = [
  { value: 'region', label: '지역 북마크' },
  { value: 'archive', label: '화면 보관함' },
]

function ProfileRegionBookmarkTab() {
  const queryClient = useQueryClient()
  const memberId = useAuthStore(auth => auth.memberInfo?.memberId ?? null)
  const query = useMemberBookmarks(memberId, true)
  const removal = useUndoableRemoval({
    scope: 'profile-region-bookmark-remove',
    batchCopy: BOOKMARK_REMOVAL_BATCH_COPY,
    commit: async bookmarkId => {
      await requestRemoval(
        () => removeMemberBookmark(bookmarkId),
        '북마크를 해제하지 못했어요.',
      )
      if (memberId) await invalidateMemberBookmarksQuery(queryClient, memberId)
    },
  })
  const bookmarks = excludeHiddenItems(
    createProfileRegionBookmarkView(query.bookmarks),
    removal.hiddenKeys,
    bookmark => bookmark.bookmarkId,
  )

  if (query.isLoading) {
    return (
      <SectionNotice $tone="info">
        저장한 지역을 불러오는 중입니다.
      </SectionNotice>
    )
  }

  if (query.isError) {
    return (
      <SectionNotice $tone="error">
        {query.errorMessage ?? '저장한 지역을 불러오지 못했습니다.'}
      </SectionNotice>
    )
  }

  return (
    <SectionStack>
      <SectionPanel>
        <SectionTitle>지역 북마크</SectionTitle>
        <SectionBody>
          자치구·행정동 <strong>지역 자체</strong>를 저장한 목록입니다. 카드를
          누르면 그 지역을 고른 상권 분석 화면이 열립니다. 업종·기간 같은 분석
          조건까지 저장하려면 화면 보관함을 쓰세요.
        </SectionBody>
      </SectionPanel>
      {bookmarks.length === 0 ? (
        <EmptyState>
          저장한 자치구나 행정동이 아직 없어요. 상권 분석에서 지역을 고르고
          북마크해 두면 여기서 바로 다시 열 수 있어요.
          <ButtonLink
            href="/analysis"
            size="medium"
            variant="secondary"
            rightIcon={<ArrowRight />}
          >
            상권 분석하러 가기
          </ButtonLink>
        </EmptyState>
      ) : (
        <ProfileRegionBookmarkCards
          bookmarks={bookmarks}
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
      )}
    </SectionStack>
  )
}

/**
 * 지역 북마크와 화면 보관함 — 두 개념을 안쪽 세그먼트로 나눈다.
 *
 * 선택은 `?tab=archive` 로 주소에 남긴다(#606). 새로고침·뒤로가기·공유한 주소에서 늘 「지역 북마크」로 돌아가던
 * 문제를 막는다. 바꿀 때는 **replace** 다 — 탭을 오갈 때마다 기록이 쌓이면 뒤로가기가 탭 사이를 맴돈다.
 * `window.history.replaceState` 는 App Router 가 `useSearchParams` 와 맞춰 주므로 서버 왕복 없이 바뀐다.
 */
export default function ProfileAnalysisBookmarksPage() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = parseAnalysisBookmarkTab(searchParams.get(BOOKMARK_TAB_PARAM))

  const selectTab = (next: AnalysisBookmarkTab) => {
    if (next === tab) return
    window.history.replaceState(
      window.history.state,
      '',
      createAnalysisBookmarkTabHref(pathname, searchParams.toString(), next),
    )
  }

  return (
    <SectionStack>
      <SegmentList role="group" aria-label="북마크 종류">
        {ANALYSIS_BOOKMARK_TABS.map(item => (
          <SegmentButton
            key={item.value}
            type="button"
            $selected={tab === item.value}
            aria-pressed={tab === item.value}
            onClick={() => selectTab(item.value)}
          >
            {item.label}
          </SegmentButton>
        ))}
      </SegmentList>

      {tab === 'region' ? (
        <ProfileRegionBookmarkTab />
      ) : (
        <ProfileAnalysisArchiveTab />
      )}
    </SectionStack>
  )
}
