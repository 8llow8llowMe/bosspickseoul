'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BookmarkCheck, BookmarkPlus, LogIn } from 'lucide-react'
import styled from 'styled-components'

import { Button, ButtonLink } from '@/components/ui/button'
import { resolveApiError } from '@/lib/api/api-error'
import {
  buildSimulationHistorySaveRequest,
  saveSimulationHistory,
} from '@/lib/api/simulation'
import { isApiSuccess } from '@/lib/api/response'
import { SIMULATION_HISTORY_QUERY_SCOPE } from '@/lib/simulation/history-query'
import { useAuthStore } from '@/stores/auth-store'
import type { SimulationReportRequest } from '@/types/simulation'

export type SimulationSaveButtonProps = {
  request: SimulationReportRequest
  /** 리포트의 `totalPrice` (만원). 저장 계약이 계산된 총비용을 함께 받는다. */
  totalPrice: number
  /** 지금 보고 있는 URL. 로그인 후 여기로 되돌아온다. */
  currentHref: string
}

const Root = styled.div`
  display: grid;
  gap: 8px;
  justify-items: start;
`

const Notice = styled.p`
  color: var(--color-danger);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

/**
 * 리포트 저장 CTA.
 *
 * 저장만 인증이 필요하다 — 계산은 비로그인도 된다. 그래서 이 버튼 하나가 로그인 유도를
 * 맡고, 화면의 나머지는 로그인 여부를 모른다.
 *
 * **세션 판정 전(`hasHydrated === false`)에는 로그인 유도를 그리지 않는다.** 스토어가
 * `/api/auth/me`로 채워지기 전 기본값이 `isLoggedIn: false`라, 그대로 그리면 로그인한
 * 사용자에게 "저장하려면 로그인"이 한 프레임 깜빡이고 사라진다.
 *
 * 저장 후에는 버튼을 `저장됨`으로 잠근다. 같은 조건을 두 번 저장하면 이력이 중복되는데,
 * 서버가 막아 주지 않으므로 화면에서 막는다. (삭제 API가 없어 되돌릴 방법도 없다.)
 * 삭제·공유 버튼은 만들지 않는다 — 삭제 API가 없고 `ShareTargetType`에 시뮬레이션 상수가 없다.
 */
export default function SimulationSaveButton({
  request,
  totalPrice,
  currentHref,
}: SimulationSaveButtonProps) {
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      saveSimulationHistory(
        buildSimulationHistorySaveRequest(request, totalPrice),
      ),
    onSuccess: response => {
      if (!isApiSuccess(response)) return
      // 목록 화면이 열려 있으면 방금 저장한 항목이 바로 보여야 한다.
      void queryClient.invalidateQueries({
        queryKey: [SIMULATION_HISTORY_QUERY_SCOPE],
      })
    },
  })

  const error = resolveApiError({ error: mutation.error, data: mutation.data })
  const saved = mutation.isSuccess && !error

  // 세션이 만료된 채로 저장을 눌렀을 때도 로그인으로 데려간다.
  if (hasHydrated && (!isLoggedIn || error?.kind === 'unauthorized')) {
    return (
      <Root>
        <ButtonLink
          size="medium"
          variant="secondary"
          href={`/login?redirect=${encodeURIComponent(currentHref)}`}
          leftIcon={<LogIn />}
        >
          저장하려면 로그인
        </ButtonLink>
        {error?.kind === 'unauthorized' ? (
          <Notice role="alert">
            로그인이 풀렸어요. 다시 로그인하면 저장할 수 있어요.
          </Notice>
        ) : null}
      </Root>
    )
  }

  return (
    <Root>
      <Button
        size="medium"
        variant={saved ? 'secondary' : 'primary'}
        disabled={saved || !hasHydrated}
        isLoading={mutation.isPending}
        leftIcon={saved ? <BookmarkCheck /> : <BookmarkPlus />}
        onClick={() => mutation.mutate()}
      >
        {saved ? '저장됨' : '결과 저장'}
      </Button>
      {error ? <Notice role="alert">{error.message}</Notice> : null}
    </Root>
  )
}
