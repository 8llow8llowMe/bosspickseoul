'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import styled from 'styled-components'

import {
  CardEyebrow,
  CardGrid,
  ContentCard,
  CardTitle,
  DangerGhostButton,
  EmptyState,
  MetaItem,
  MetaList,
  SectionBody,
  SectionNotice,
  SectionPanel,
  SectionStack,
  SectionTitle,
} from '@/components/profile/profile-ui'
import { useUndoableRemoval } from '@/components/profile/use-undoable-removal'
import { Badge } from '@/components/ui/badge'
import { normalizeApiError } from '@/lib/api/api-error'
import { fetchAuthSessions, revokeAuthSession } from '@/lib/api/auth-session'
import {
  getApiMessage,
  getResponseBody,
  isApiSuccess,
} from '@/lib/api/response'
import {
  excludeHiddenItems,
  requestRemoval,
} from '@/lib/profile/removal-request'
import { SESSION_REVOKE_BATCH_COPY } from '@/lib/profile/removal-batch-copy'
import {
  CURRENT_SESSION_NOTICE,
  canRevokeSession,
  describeDeviceLabel,
  formatSessionTime,
  SESSION_REVOKE_NOTICE,
} from '@/lib/auth/device-session'
import type { AuthSessionItem } from '@/types/auth'

export const AUTH_SESSIONS_QUERY_KEY = 'auth-sessions'

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

const CardActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`

/**
 * 목록 표시부. 데이터를 받아 그리기만 한다 — 조회·해제는 페이지가 한다.
 * (`ProfileAnalysisArchiveCards` 와 같은 분리다. 픽스처로 바로 렌더해 검증하려는 것.)
 */
export function ProfileSessionCards({
  sessions,
  onRevoke,
}: {
  sessions: readonly AuthSessionItem[]
  onRevoke: (session: AuthSessionItem) => void
}) {
  return (
    <CardGrid>
      {sessions.map(session => {
        const revocable = canRevokeSession(session)

        return (
          <ContentCard
            key={session.sessionId}
            data-session-id={session.sessionId}
          >
            <CardHeader>
              <div>
                <CardEyebrow>로그인 기기</CardEyebrow>
                <CardTitle>{describeDeviceLabel(session.deviceInfo)}</CardTitle>
              </div>
              {session.current ? <Badge $tone="blue">현재 기기</Badge> : null}
            </CardHeader>

            <MetaList>
              <MetaItem>
                마지막 사용 {formatSessionTime(session.lastUsedAt)}
              </MetaItem>
              <MetaItem>로그인 {formatSessionTime(session.createdAt)}</MetaItem>
            </MetaList>

            {revocable ? (
              <CardActions>
                <DangerGhostButton
                  aria-label={`${describeDeviceLabel(session.deviceInfo)} 로그인 해제`}
                  leftIcon={<LogOut />}
                  onClick={() => onRevoke(session)}
                >
                  해제
                </DangerGhostButton>
              </CardActions>
            ) : (
              <SectionNotice $tone="info">
                {CURRENT_SESSION_NOTICE}
              </SectionNotice>
            )}
          </ContentCard>
        )
      })}
    </CardGrid>
  )
}

/**
 * 로그인 기기 목록과 해제.
 *
 * 해제도 다른 보관함 삭제와 같은 「숨기고 → 10초 되돌리기 → 그 뒤에 요청」이다(#574). 다른 기기를 잘못 해제하면
 * 그 기기에서 다시 로그인해야 하는데, 되돌리기 시간 동안은 요청을 보내지 않으므로 그 수고가 없다.
 */
export default function ProfileSessionsPage() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: [AUTH_SESSIONS_QUERY_KEY],
    queryFn: () => fetchAuthSessions(),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [AUTH_SESSIONS_QUERY_KEY] })

  const removal = useUndoableRemoval({
    scope: 'profile-session-revoke',
    batchCopy: SESSION_REVOKE_BATCH_COPY,
    commit: async sessionId => {
      try {
        await requestRemoval(
          () => revokeAuthSession(sessionId),
          '기기를 해제하지 못했어요.',
        )
      } finally {
        /*
         * 해제는 멱등이지만, 목록을 띄워 둔 사이 다른 기기가 로그아웃하면 행 자체가 사라진다. 실패든 아니든
         * 목록을 다시 받아 화면과 서버를 맞춘다 — 안 하면 이미 없는 행에 계속 해제를 누르게 된다.
         */
        await invalidate()
      }
    },
  })

  const body = getResponseBody(query.data)
  const sessions = excludeHiddenItems(
    body?.sessions ?? [],
    removal.hiddenKeys,
    session => session.sessionId,
  )

  if (query.isPending) {
    return (
      <SectionNotice $tone="info">
        로그인한 기기를 불러오는 중입니다.
      </SectionNotice>
    )
  }

  if (query.isError || (query.data && !isApiSuccess(query.data))) {
    const message = query.isError
      ? normalizeApiError(query.error).message
      : getApiMessage(query.data, '로그인한 기기를 불러오지 못했습니다.')
    return <SectionNotice $tone="error">{message}</SectionNotice>
  }

  return (
    <SectionStack>
      <SectionPanel>
        <SectionTitle>로그인 기기</SectionTitle>
        <SectionBody>
          이 계정으로 로그인해 둔 기기 목록입니다. 쓰지 않는 기기는 해제하세요.{' '}
          {SESSION_REVOKE_NOTICE}
        </SectionBody>
      </SectionPanel>

      {sessions.length === 0 ? (
        <EmptyState>
          표시할 기기가 없어요. 로그인 상태라면 잠시 후 다시 열어 보세요.
        </EmptyState>
      ) : (
        <ProfileSessionCards
          sessions={sessions}
          onRevoke={session => {
            const label = describeDeviceLabel(session.deviceInfo)
            removal.remove(session.sessionId, {
              removed: `${label} 기기의 로그인을 해제했어요.`,
              restored: `${label} 기기의 로그인을 해제하지 못해 다시 보여 드려요.`,
              failed: `${label} 기기의 로그인을 해제하지 못했어요.`,
              pending: `${label} 기기의 로그인 해제는 아직 되돌릴 수 있어요.`,
              alreadyDone: `${label} 기기는 이미 해제됐어요.`,
            })
          }}
        />
      )}
    </SectionStack>
  )
}
