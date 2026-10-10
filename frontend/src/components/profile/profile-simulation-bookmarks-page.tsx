'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  SectionBody,
  SectionNotice,
  SectionPanel,
  SectionStack,
  SectionTitle,
} from '@/components/profile/profile-ui'
import { useUndoableRemoval } from '@/components/profile/use-undoable-removal'
import SimulationHistoryList from '@/components/simulation/simulation-history-list'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveApiError, retryUnlessClientError } from '@/lib/api/api-error'
import {
  deleteSimulationHistory,
  fetchSimulationHistories,
} from '@/lib/api/simulation'
import { getResponseBody } from '@/lib/api/response'
import {
  excludeHiddenItems,
  requestRemoval,
} from '@/lib/profile/removal-request'
import { describeSimulationHistoryCondition } from '@/lib/simulation/history-presentation'
import {
  SIMULATION_HISTORY_QUERY_SCOPE,
  simulationHistoriesQueryKey,
} from '@/lib/simulation/history-query'

/** 한 페이지에 담는 이력 수. 서버 상한은 50이다(초과하면 400 `SIMULATION_109`). */
const PAGE_SIZE = 10

/**
 * 삭제 성공 후 머무를 페이지 — **빠른 길**이다.
 *
 * 마지막 페이지의 유일한 항목을 지우면 그 페이지 자체가 없어진다. 여기서 미리 당겨 두면
 * 빈 목록을 한 번 그리지 않고 곧바로 앞 페이지를 받는다.
 *
 * 앞 페이지들은 꽉 차 있으므로 `visibleCount <= 1 && page > 0`이면 그 페이지는 마지막이다.
 * 따로 `totalPages`를 볼 필요가 없다.
 *
 * 이 함수는 "한 번에 한 건"을 가정한다. 그 가정이 깨지는 경로는 `resolveClampedPage`가 받는다.
 * 지연 삭제(#574)에서는 실제 DELETE 가 나가는 순간의 서버 항목 수를 `visibleCount` 로 넣는다.
 */
export const resolvePageAfterDelete = ({
  page,
  visibleCount,
}: {
  page: number
  visibleCount: number
}): number => (visibleCount <= 1 && page > 0 ? page - 1 : page)

/**
 * 응답의 `totalPages`로 현재 페이지를 가둔다 — **안전망**이다.
 *
 * 위의 빠른 길은 한 건씩 성공하는 경우만 맞는다. 가정이 깨지는 경로가 셋 있다:
 * 삭제가 `404`로 실패했을 때(다른 기기에서 먼저 지운 항목), 두 카드를 잇달아 눌러
 * 두 건이 함께 빠졌을 때, 남의 삭제로 목록이 줄었을 때. 그러면 빈 페이지가 남는데,
 * **빈 목록은 페이저까지 감추므로** 앞 페이지에 항목이 멀쩡히 있는데도 "저장한 결과가
 * 없어요"에 갇혀 돌아갈 버튼이 없다.
 *
 * 그래서 조회가 돌아올 때마다 페이지를 유효 범위로 되돌린다. 페이지는 0부터이므로 마지막
 * 인덱스는 `totalPages - 1`이고, 이력이 하나도 없으면 0이다.
 */
export const resolveClampedPage = ({
  page,
  totalPages,
}: {
  page: number
  totalPages: number
}): number => Math.min(page, Math.max(0, totalPages - 1))

/**
 * 저장한 시뮬레이션 결과 목록.
 *
 * 인증 처리를 여기서 하지 않는다 — `profile-shell.tsx`가 이미 비로그인 사용자를 `/login`으로
 * 돌려보낸다. 중복해서 로그인 유도를 그리면 리다이렉트 직전에 두 화면이 겹쳐 깜빡인다.
 *
 * 페이지 번호를 URL에 담지 않은 이유: 이 목록은 프로필 탭 안의 보조 화면이라 특정 페이지를
 * 링크로 공유할 상황이 없다. (리포트는 반대로 조건이 URL 정본이다 — 거기선 공유·새로고침이
 * 실제로 일어난다.)
 *
 * 삭제는 다른 보관함과 같은 「숨기고 → 10초 되돌리기 → 그 뒤에 DELETE」다(#574, `use-undoable-removal`).
 * 404(다른 기기에서 먼저 지운 기록)는 바란 상태와 같으므로 성공으로 본다(`requestRemoval`).
 */
export default function ProfileSimulationBookmarksPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)

  const query = useQuery({
    queryKey: simulationHistoriesQueryKey(page, PAGE_SIZE),
    queryFn: () => fetchSimulationHistories(page, PAGE_SIZE),
    retry: retryUnlessClientError(),
  })

  const error = resolveApiError({ error: query.error, data: query.data })
  const body = error ? null : getResponseBody(query.data)
  const serverHistories = body?.histories ?? []

  /** 지연 삭제가 실제로 나갈 때 읽을 「지금 이 페이지의 서버 항목 수」. 10초 사이에 페이지가 바뀌었을 수 있다. */
  const serverCountRef = useRef(0)
  useEffect(() => {
    serverCountRef.current = serverHistories.length
  })

  // 조회가 성공했을 때만 가둔다. 로딩 중에는 `body`가 없어 0페이지로 튕겨 버린다.
  const clampedPage = body
    ? resolveClampedPage({ page, totalPages: body.totalPages })
    : page

  // 렌더 중 보정이다. effect 로 하면 화면을 한 번 커밋한 뒤 다시 렌더해 빈 페이지가 깜빡인다.
  if (clampedPage !== page) setPage(clampedPage)

  /**
   * 페이지 하나가 아니라 **스코프 전체**를 무효화한다. 한 건이 빠지면 뒤 페이지의 경계 항목이
   * 앞으로 밀려 다른 페이지의 캐시도 함께 낡는다.
   */
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: [SIMULATION_HISTORY_QUERY_SCOPE],
    })

  const removal = useUndoableRemoval({
    scope: 'profile-simulation-history-delete',
    // ⚠️ 문자열. 경로 세그먼트라 숫자로 바꿀 이유가 없고, 바꾸면 큰 값에서 손상된다.
    commit: async historyId => {
      await requestRemoval(
        () => deleteSimulationHistory(historyId),
        '저장한 기록을 삭제하지 못했어요.',
      )
      // 지운 항목이 이 페이지의 마지막이었다면 빈 페이지가 남는다.
      setPage(current =>
        resolvePageAfterDelete({
          page: current,
          visibleCount: serverCountRef.current,
        }),
      )
      await invalidate()
    },
  })

  const histories = excludeHiddenItems(
    serverHistories,
    removal.hiddenKeys,
    history => history.historyId,
  )

  return (
    <SectionStack>
      <SectionPanel>
        <SectionTitle>시뮬레이션 저장 목록</SectionTitle>
        <SectionBody>
          저장한 창업 시뮬레이션 결과입니다. 저장 시점의 기준 연도로 계산된
          금액이며, 리포트를 열면 지금 기준으로 다시 계산합니다.
        </SectionBody>
      </SectionPanel>

      {query.isPending ? (
        <SectionStack aria-label="저장 목록 불러오는 중" role="status">
          <Skeleton $height="132px" />
          <Skeleton $height="132px" />
        </SectionStack>
      ) : error ? (
        <SectionNotice $tone="error" role="alert">
          {error.message}
        </SectionNotice>
      ) : (
        <SimulationHistoryList
          histories={[...histories]}
          page={body?.page ?? page}
          totalPages={body?.totalPages ?? 0}
          onPageChange={setPage}
          onDelete={historyId => {
            const history = histories.find(item => item.historyId === historyId)
            if (!history) return

            const condition = describeSimulationHistoryCondition(history)
            removal.remove(historyId, {
              removed: `${condition} 기록을 삭제했어요.`,
              restored: `${condition} 기록을 삭제하지 못해 다시 보여 드려요.`,
              failed: `${condition} 기록을 삭제하지 못했어요.`,
              alreadyDone: `${condition} 기록은 이미 삭제됐어요.`,
            })
          }}
        />
      )}
    </SectionStack>
  )
}
