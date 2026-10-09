'use client'

import Link from 'next/link'
import type { MouseEvent } from 'react'
import { CornerDownRight, MessageCircle } from 'lucide-react'
import styled from 'styled-components'

import CommunityChoiceChips from '@/components/community/community-choice-chips'
import CommunityFeedback from '@/components/community/community-feedback'
import CommunityListSkeleton from '@/components/community/community-list-skeleton'
import { Button } from '@/components/ui/button'
import { useLoadMoreSentinel } from '@/hooks/use-load-more-sentinel'
import { formatCommunityDate, formatRelativeTime } from '@/lib/community'
import {
  COMMUNITY_NOTIFICATION_DELETED_POST,
  createCommunityNotificationHref,
  formatCommunityNotificationMessage,
} from '@/lib/community/notifications'
import type { CommunityNotificationItem } from '@/types/community'

/*
  커뮤니티 알림 목록(#536, community.md §S4 「알림 목록」). 글 목록 피드와 같은 읽기 폭(`--w-read`) 1단이고,
  행 모양(구분선 · hover · 포커스)도 글 행을 따른다. 새 토큰을 만들지 않는다.
*/

const MOBILE = '@media (max-width: 479px)'

const Page = styled.main`
  width: min(var(--w-read), var(--w-shell));
  margin: 0 auto;
  padding: 32px 0 64px;
  display: grid;
  gap: 16px;
  align-content: start;

  ${MOBILE} {
    padding-top: 24px;
    gap: 12px;
  }
`

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.35;
`

const ReadAllError = styled.p`
  color: var(--color-negative-text);
  font-size: 13px;
  line-height: 1.6;
`

const List = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`

const rowBox = `
  min-height: 52px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 0 -12px;
  padding: 16px 12px;
  border-bottom: 1px solid var(--color-border-200);
  color: inherit;
`

/* 글이 살아 있는 알림 — 누르면 읽음 처리 뒤 글(댓글 앵커)로 간다. */
const RowLink = styled(Link)<{ $unread: boolean }>`
  ${rowBox}
  background: ${props =>
    props.$unread ? 'var(--color-blue-50)' : 'transparent'};
  transition: background-color var(--motion-fast) var(--ease-standard);

  &:hover {
    background: var(--color-background-muted);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-700);
    outline-offset: -2px;
    border-radius: var(--radius-control);
  }

  &[aria-busy='true'] {
    cursor: progress;
  }
`

/* 글이 사라진 알림 — 링크가 아니다(이동을 막는다). */
const RowStatic = styled.div<{ $unread: boolean }>`
  ${rowBox}
  background: ${props =>
    props.$unread ? 'var(--color-blue-50)' : 'transparent'};
`

const IconTile = styled.span`
  width: 36px;
  height: 36px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  color: var(--color-text-700);

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }
`

const Body = styled.span`
  min-width: 0;
  flex: 1 1 auto;
  display: grid;
  gap: 4px;
`

const Message = styled.span<{ $unread: boolean }>`
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: ${props =>
    props.$unread ? 'var(--color-text-900)' : 'var(--color-text-700)'};
  font-size: 15px;
  font-weight: ${props => (props.$unread ? 600 : 400)};
  line-height: 1.5;
  overflow-wrap: anywhere;
  word-break: keep-all;
`

/* 안 읽은 행은 blue50 띠 위라 캡션은 band 토큰을 쓴다(DESIGN.md §2 Neutral — grey600 은 띠 위 AA 미달). */
const Preview = styled.span<{ $onBand: boolean }>`
  overflow: hidden;
  color: ${props =>
    props.$onBand
      ? 'var(--color-text-caption-on-band)'
      : 'var(--color-text-600)'};
  font-size: 13px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Meta = styled.span<{ $onBand: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  color: ${props =>
    props.$onBand
      ? 'var(--color-text-caption-on-band)'
      : 'var(--color-text-600)'};
  font-size: 13px;
  line-height: 1.5;
`

const UnreadDot = styled.span`
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  margin-top: 8px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-700);
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

const Sentinel = styled.div`
  height: 1px;
`

const FeedEnd = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 1.5;
  text-align: center;
`

const LoadMoreError = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 12px 16px;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-danger);
  font-size: 13px;
  line-height: 1.6;

  ${MOBILE} {
    align-items: stretch;
    flex-direction: column;
  }
`

const LoadMoreRetryButton = styled.button`
  min-height: 44px;
  flex: 0 0 auto;
  padding: 0 16px;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-danger);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
`

export type CommunityNotificationsStatus =
  'loading' | 'error' | 'empty' | 'ready'

export type CommunityNotificationsFooter =
  'sentinel' | 'loading-more' | 'load-more-error' | 'end' | null

/** 목록 끝 자리. 글 목록 피드와 같은 순서 — 다음 쪽 실패 > 받는 중 > 감시 요소 > 끝. */
export const getCommunityNotificationsFooter = ({
  itemsLength,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
}: {
  itemsLength: number
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetchNextPageError: boolean
}): CommunityNotificationsFooter => {
  if (itemsLength === 0) {
    return null
  }

  if (isFetchNextPageError) {
    return 'load-more-error'
  }

  if (isFetchingNextPage) {
    return 'loading-more'
  }

  return hasNextPage ? 'sentinel' : 'end'
}

const UNREAD_ONLY_OPTIONS = [
  { value: 'unread' as const, label: '안 읽은 것만' },
]

const emptyCopy = {
  all: {
    title: '아직 받은 알림이 없어요',
    description:
      '내 글에 댓글이 달리거나 내 댓글에 답글이 달리면 여기에 모여요.',
  },
  unread: {
    title: '안 읽은 알림이 없어요',
    description: '받은 알림을 모두 확인했어요.',
  },
} as const

export type CommunityNotificationsViewProps = {
  status: CommunityNotificationsStatus
  unreadOnly: boolean
  items: CommunityNotificationItem[]
  footer: CommunityNotificationsFooter
  hasNextPage: boolean
  isFetching: boolean
  canReadAll: boolean
  readAllPending: boolean
  readAllError: string | null
  /** 읽음 처리 중인 알림(누른 행). 그동안 다른 행을 눌러도 무시한다. */
  pendingNotificationId: string | null
  onToggleUnreadOnly: () => void
  onRetry: () => void
  onLoadMore: () => void
  onRetryLoadMore: () => void
  onReadAll: () => void
  onOpen: (
    item: CommunityNotificationItem,
    href: string,
    event: MouseEvent<HTMLAnchorElement>,
  ) => void
}

const NotificationIcon = ({ item }: { item: CommunityNotificationItem }) =>
  item.notificationType?.code === 'REPLY_ON_COMMENT' ? (
    <CornerDownRight aria-hidden="true" />
  ) : (
    <MessageCircle aria-hidden="true" />
  )

const NotificationContent = ({ item }: { item: CommunityNotificationItem }) => {
  const unread = !item.read
  const preview = item.targetAvailable ? item.commentPreview?.trim() : null

  return (
    <>
      <IconTile>
        <NotificationIcon item={item} />
      </IconTile>
      <Body>
        <Message $unread={unread}>
          {unread ? <VisuallyHidden>안 읽음. </VisuallyHidden> : null}
          {formatCommunityNotificationMessage(item)}
        </Message>
        {preview ? <Preview $onBand={unread}>{preview}</Preview> : null}
        <Meta $onBand={unread}>
          <time
            dateTime={item.lastEventAt}
            title={formatCommunityDate(item.lastEventAt)}
          >
            {formatRelativeTime(item.lastEventAt)}
          </time>
          {!item.targetAvailable ? (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {COMMUNITY_NOTIFICATION_DELETED_POST}이라 열 수 없어요
              </span>
            </>
          ) : null}
        </Meta>
      </Body>
      {unread ? <UnreadDot aria-hidden="true" /> : null}
    </>
  )
}

export default function CommunityNotificationsView({
  status,
  unreadOnly,
  items,
  footer,
  hasNextPage,
  isFetching,
  canReadAll,
  readAllPending,
  readAllError,
  pendingNotificationId,
  onToggleUnreadOnly,
  onRetry,
  onLoadMore,
  onRetryLoadMore,
  onReadAll,
  onOpen,
}: CommunityNotificationsViewProps) {
  const sentinelRef = useLoadMoreSentinel({
    hasNextPage,
    isFetching,
    hasLoadMoreError: footer === 'load-more-error',
    onLoadMore,
  })
  const empty = unreadOnly ? emptyCopy.unread : emptyCopy.all

  return (
    <Page data-community-notifications="true">
      <HeadingRow>
        <Title>알림</Title>
        <Button
          disabled={!canReadAll || readAllPending}
          isLoading={readAllPending}
          loadingLabel="읽음 처리 중"
          size="medium"
          type="button"
          variant="ghost"
          onClick={onReadAll}
        >
          모두 읽음
        </Button>
      </HeadingRow>
      <CommunityChoiceChips
        label="알림 보기"
        options={UNREAD_ONLY_OPTIONS}
        selected={unreadOnly ? 'unread' : null}
        onSelect={onToggleUnreadOnly}
      />
      {readAllError ? (
        <ReadAllError role="alert">{readAllError}</ReadAllError>
      ) : null}

      {status === 'loading' ? (
        <CommunityListSkeleton
          label="알림을 불러오는 중이에요"
          variant="initial"
        />
      ) : status === 'error' ? (
        <CommunityFeedback
          kind="error"
          title="알림을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          actionLabel="다시 시도"
          onAction={onRetry}
        />
      ) : status === 'empty' ? (
        <CommunityFeedback
          kind="empty"
          title={empty.title}
          description={empty.description}
        />
      ) : (
        <div>
          <List aria-label="알림 목록">
            {items.map(item => {
              const href = createCommunityNotificationHref(item)

              return (
                <li key={item.notificationId}>
                  {href ? (
                    <RowLink
                      $unread={!item.read}
                      aria-busy={
                        pendingNotificationId === item.notificationId ||
                        undefined
                      }
                      data-community-notification="true"
                      data-read={item.read ? 'true' : 'false'}
                      href={href}
                      onClick={event => {
                        onOpen(item, href, event)
                      }}
                    >
                      <NotificationContent item={item} />
                    </RowLink>
                  ) : (
                    <RowStatic
                      $unread={!item.read}
                      aria-disabled="true"
                      data-community-notification="true"
                      data-read={item.read ? 'true' : 'false'}
                      data-target-available="false"
                    >
                      <NotificationContent item={item} />
                    </RowStatic>
                  )}
                </li>
              )
            })}
          </List>

          {footer === 'load-more-error' ? (
            <LoadMoreError role="alert">
              <span>다음 알림을 불러오지 못했어요.</span>
              <LoadMoreRetryButton onClick={onRetryLoadMore} type="button">
                다시 불러오기
              </LoadMoreRetryButton>
            </LoadMoreError>
          ) : footer === 'loading-more' ? (
            <CommunityListSkeleton
              label="알림을 더 불러오는 중이에요"
              variant="more"
            />
          ) : footer === 'sentinel' ? (
            <Sentinel
              aria-hidden="true"
              data-load-more-sentinel="true"
              ref={sentinelRef}
            />
          ) : footer === 'end' ? (
            <FeedEnd role="status">알림을 모두 불러왔어요</FeedEnd>
          ) : null}
        </div>
      )}
    </Page>
  )
}
