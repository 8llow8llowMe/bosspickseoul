'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import { Button } from '@/components/ui/button'
import EmptyState from '@/components/ui/empty-state'
import { resolveShareLink } from '@/lib/api/share'
import { getResponseBody } from '@/lib/api/response'
import {
  buildShareRoute,
  getShareRouteFailureMessage,
} from '@/lib/share/routes'
import { classifyShareEntryError } from '@/lib/share/share-entry'

const Root = styled.main`
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 16px;
  min-height: 60vh;
  padding: 40px 20px;
`

const Notice = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
`

const Actions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
`

export default function ShareEntryPage({ shareCode }: { shareCode: string }) {
  const router = useRouter()

  const query = useQuery({
    queryKey: ['share-link', shareCode],
    queryFn: () => resolveShareLink(shareCode),
    // 만료(410)·미존재(404)는 재시도해도 같다. 통신/서버 장애만 한 번 더 시도한다.
    retry: (failureCount, error) =>
      classifyShareEntryError(error).retryable && failureCount < 1,
  })

  const body = getResponseBody(query.data)
  const route = body
    ? buildShareRoute(body.shareType?.code, body.payload)
    : null
  const href = route?.ok ? route.href : null

  useEffect(() => {
    if (href) router.replace(href)
  }, [href, router])

  if (query.isPending) {
    return (
      <Root>
        <Notice role="status">공유된 분석 화면을 여는 중이에요…</Notice>
      </Root>
    )
  }

  if (query.isError) {
    const failure = classifyShareEntryError(query.error)
    return (
      <Root>
        <EmptyState
          title={failure.title}
          description={failure.description}
          action={
            <Actions>
              {failure.retryable ? (
                <Button
                  variant="secondary"
                  onClick={() => void query.refetch()}
                >
                  다시 시도
                </Button>
              ) : null}
              <Button onClick={() => router.replace('/')}>홈으로 이동</Button>
            </Actions>
          }
        />
      </Root>
    )
  }

  if (!href) {
    return (
      <Root>
        <EmptyState
          title="링크를 열 수 없어요"
          description={
            route && !route.ok
              ? getShareRouteFailureMessage(route.reason)
              : '링크에 담긴 화면 정보가 올바르지 않아요.'
          }
          action={
            <Button onClick={() => router.replace('/')}>홈으로 이동</Button>
          }
        />
      </Root>
    )
  }

  return (
    <Root>
      <Notice role="status">공유된 분석 화면으로 이동하고 있어요…</Notice>
    </Root>
  )
}
