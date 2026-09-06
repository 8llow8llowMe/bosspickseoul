'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'

import {
  CardEyebrow,
  CardGrid,
  ContentCard,
  CardTitle,
  EmptyState,
  MetaItem,
  MetaList,
  SectionBody,
  SectionNotice,
  SectionPanel,
  SectionStack,
  SectionTitle,
} from '@/components/profile/profile-ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { normalizeApiError } from '@/lib/api/api-error'
import { fetchAuthSessions, revokeAuthSession } from '@/lib/api/auth-session'
import {
  getApiMessage,
  getResponseBody,
  isApiSuccess,
} from '@/lib/api/response'
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
  busySessionId,
}: {
  sessions: readonly AuthSessionItem[]
  onRevoke: (sessionId: string) => void
  busySessionId?: string | null
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
                <Button
                  size="tiny"
                  variant="secondary"
                  isLoading={busySessionId === session.sessionId}
                  onClick={() => onRevoke(session.sessionId)}
                >
                  해제
                </Button>
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

export default function ProfileSessionsPage() {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<{
    error: boolean
    message: string
  } | null>(null)
  const [busySessionId, setBusySessionId] = useState<string | null>(null)

  const query = useQuery({
    queryKey: [AUTH_SESSIONS_QUERY_KEY],
    queryFn: () => fetchAuthSessions(),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [AUTH_SESSIONS_QUERY_KEY] })

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => revokeAuthSession(sessionId),
    onSuccess: async response => {
      if (!isApiSuccess(response)) {
        setFeedback({
          error: true,
          message: getApiMessage(response, '기기를 해제하지 못했어요.'),
        })
        return
      }
      setFeedback({ error: false, message: '기기를 해제했어요.' })
      await invalidate()
    },
    /*
     * 해제는 멱등이라 404 가 오지 않는 게 정상이지만, 목록을 띄워 둔 사이 다른 기기가
     * 로그아웃하면 행 자체가 사라진다. 실패든 아니든 목록을 다시 받아 화면과 서버를
     * 맞춘다 — 안 하면 이미 없는 행에 계속 해제를 누르게 된다.
     */
    onError: async error => {
      await invalidate()
      setFeedback({ error: true, message: normalizeApiError(error).message })
    },
    onSettled: () => setBusySessionId(null),
  })

  const body = getResponseBody(query.data)
  const sessions = body?.sessions ?? []

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

      {feedback ? (
        <SectionNotice
          $tone={feedback.error ? 'error' : 'success'}
          role="status"
        >
          {feedback.message}
        </SectionNotice>
      ) : null}

      {sessions.length === 0 ? (
        <EmptyState>
          표시할 기기가 없어요. 로그인 상태라면 잠시 후 다시 열어 보세요.
        </EmptyState>
      ) : (
        <ProfileSessionCards
          sessions={sessions}
          busySessionId={busySessionId}
          onRevoke={sessionId => {
            setBusySessionId(sessionId)
            revokeMutation.mutate(sessionId)
          }}
        />
      )}
    </SectionStack>
  )
}
