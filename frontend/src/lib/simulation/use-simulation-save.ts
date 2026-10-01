'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { resolveApiError, type NormalizedApiError } from '@/lib/api/api-error'
import {
  buildSimulationHistorySaveRequest,
  saveSimulationHistory,
} from '@/lib/api/simulation'
import { isApiSuccess } from '@/lib/api/response'
import { SIMULATION_HISTORY_QUERY_SCOPE } from '@/lib/simulation/history-query'
import { useAuthStore } from '@/stores/auth-store'
import type { SimulationReportRequest } from '@/types/simulation'

/** 저장 CTA 가 그릴 상태. 표시 컴포넌트는 이것만 받는다. */
export type SimulationSaveState = {
  /** 세션 판정이 끝났는가. 끝나기 전에는 로그인 유도도, 저장도 하지 않는다. */
  hasHydrated: boolean
  /** 비로그인이거나 저장하다 세션이 풀렸다 — 로그인 유도를 그린다. */
  needsLogin: boolean
  saved: boolean
  isPending: boolean
  error: NormalizedApiError | null
  save: () => void
}

/**
 * 리포트 저장 상태. **한 화면에 저장 CTA 가 두 벌 있어도 상태는 하나다.**
 *
 * 리포트는 ≥1024 에서 요약 열에, ≤1023 에서 하단 고정 바에 저장 버튼을 둔다. 보이는 쪽은 CSS 로
 * 고르므로(SSR 과 결과가 같아야 한다) 두 버튼이 모두 마운트된다. 버튼마다 mutation 을 들고 있으면
 * 한쪽에서 저장해도 다른 쪽은 `결과 저장` 그대로라, 창을 넓히거나 기기를 돌리면 같은 조건을 또
 * 저장할 수 있다. 그래서 mutation 을 페이지 한 곳에서 들고 두 버튼에 같은 상태를 내려준다.
 */
export const useSimulationSave = (
  request: SimulationReportRequest,
  totalPrice: number,
): SimulationSaveState => {
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

  return {
    hasHydrated,
    // 세션이 만료된 채로 저장을 눌렀을 때도 로그인으로 데려간다.
    needsLogin: hasHydrated && (!isLoggedIn || error?.kind === 'unauthorized'),
    saved: mutation.isSuccess && !error,
    isPending: mutation.isPending,
    error,
    save: () => mutation.mutate(),
  }
}
