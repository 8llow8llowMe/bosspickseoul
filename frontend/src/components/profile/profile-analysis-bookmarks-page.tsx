'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'

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
import { Button } from '@/components/ui/button'
import { TabButton, TabList } from '@/components/ui/tabs'
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

/* ------------------------------------------------------------------------- *
 * 탭 2 — 화면 보관함 (업종·기간 조건까지 포함한 **화면 상태** 저장)
 * ------------------------------------------------------------------------- */

/**
 * 필터는 **FE 가 실제로 생성하는 타입**만 노출한다.
 * `DISTRICT_ANALYSIS`·`COMMERCIAL_COMPARISON` 은 복원 가능한 URL 상태가 없어 생성되지 않으므로
 * 필터 칩을 두면 항상 빈 목록이 된다. (그래도 목록에 섞여 오면 카드가 미지원으로 안내한다)
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
  gap: 8px;
  margin-top: 12px;
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
  onDelete: (bookmarkId: string) => void
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
                <Button
                  size="tiny"
                  variant="secondary"
                  isLoading={busy}
                  onClick={() => onDelete(item.bookmarkId)}
                >
                  삭제
                </Button>
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
  const [shareType, setShareType] = useState<ShareType | null>(null)
  const [feedback, setFeedback] = useState<{
    error: boolean
    message: string
  } | null>(null)
  const [busyBookmarkId, setBusyBookmarkId] = useState<string | null>(null)

  const query = useQuery({
    queryKey: [ANALYSIS_BOOKMARKS_QUERY_KEY, shareType],
    queryFn: () => fetchAnalysisBookmarks({ shareType }),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: [ANALYSIS_BOOKMARKS_QUERY_KEY],
    })

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
        setFeedback({
          error: true,
          message: getApiMessage(response, '이름을 수정하지 못했어요.'),
        })
        return
      }
      setFeedback({ error: false, message: '이름을 수정했어요.' })
      await invalidate()
    },
    onError: error =>
      setFeedback({ error: true, message: normalizeApiError(error).message }),
    onSettled: () => setBusyBookmarkId(null),
  })

  const deleteMutation = useMutation({
    mutationFn: (bookmarkId: string) => deleteAnalysisBookmark(bookmarkId),
    onSuccess: async response => {
      if (!isApiSuccess(response)) {
        setFeedback({
          error: true,
          message: getApiMessage(response, '삭제하지 못했어요.'),
        })
        return
      }
      setFeedback({ error: false, message: '보관 항목을 삭제했어요.' })
      await invalidate()
    },
    onError: async error => {
      const normalized = normalizeApiError(error)
      // 404: 이미 없어진 항목이다. 재시도 대신 목록을 새로고침한다.
      if (normalized.kind === 'not-found') await invalidate()
      setFeedback({ error: true, message: normalized.message })
    },
    onSettled: () => setBusyBookmarkId(null),
  })

  const body = getResponseBody(query.data)
  const items = body?.bookmarks ?? []

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

      {feedback ? (
        <SectionNotice
          $tone={feedback.error ? 'error' : 'success'}
          role="status"
        >
          {feedback.message}
        </SectionNotice>
      ) : null}

      {items.length === 0 ? (
        <EmptyState>
          아직 보관한 분석 화면이 없어요. 분석 결과 화면의 &lsquo;화면
          보관&rsquo; 버튼으로 저장할 수 있어요.
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
          onDelete={bookmarkId => {
            setBusyBookmarkId(bookmarkId)
            deleteMutation.mutate(bookmarkId)
          }}
        />
      )}
    </SectionStack>
  )
}

/* ------------------------------------------------------------------------- *
 * 페이지 — 두 개념을 탭으로 분리한다
 * ------------------------------------------------------------------------- */

type AnalysisBookmarkTab = 'region' | 'archive'

function ProfileRegionBookmarkTab() {
  const memberId = useAuthStore(auth => auth.memberInfo?.memberId ?? null)
  const query = useMemberBookmarks(memberId, true)
  const bookmarks = createProfileRegionBookmarkView(query.bookmarks)

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
          자치구·행정동 <strong>지역 자체</strong>를 저장한 목록입니다.
          업종·기간 같은 분석 조건은 포함되지 않습니다 — 조건까지 저장하려면
          화면 보관함을 쓰세요.
        </SectionBody>
      </SectionPanel>
      {bookmarks.length === 0 ? (
        <EmptyState>저장한 자치구나 행정동이 아직 없어요.</EmptyState>
      ) : (
        <ProfileRegionBookmarkCards bookmarks={bookmarks} />
      )}
    </SectionStack>
  )
}

export default function ProfileAnalysisBookmarksPage() {
  const [tab, setTab] = useState<AnalysisBookmarkTab>('region')

  return (
    <SectionStack>
      <TabList aria-label="북마크 종류">
        <TabButton
          type="button"
          $active={tab === 'region'}
          aria-current={tab === 'region' ? 'true' : undefined}
          onClick={() => setTab('region')}
        >
          지역 북마크
        </TabButton>
        <TabButton
          type="button"
          $active={tab === 'archive'}
          aria-current={tab === 'archive' ? 'true' : undefined}
          onClick={() => setTab('archive')}
        >
          화면 보관함
        </TabButton>
      </TabList>

      {tab === 'region' ? (
        <ProfileRegionBookmarkTab />
      ) : (
        <ProfileAnalysisArchiveTab />
      )}
    </SectionStack>
  )
}
