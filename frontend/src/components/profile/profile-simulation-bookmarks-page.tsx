'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  SectionBody,
  SectionNotice,
  SectionPanel,
  SectionStack,
  SectionTitle,
} from '@/components/profile/profile-ui'
import SimulationHistoryList from '@/components/simulation/simulation-history-list'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveApiError, retryUnlessClientError } from '@/lib/api/api-error'
import { fetchSimulationHistories } from '@/lib/api/simulation'
import { getResponseBody } from '@/lib/api/response'
import { simulationHistoriesQueryKey } from '@/lib/simulation/history-query'

/** 한 페이지에 담는 이력 수. 서버 상한은 50이다(초과하면 400 `SIMULATION_109`). */
const PAGE_SIZE = 10

/**
 * 저장한 시뮬레이션 결과 목록.
 *
 * 인증 처리를 여기서 하지 않는다 — `profile-shell.tsx`가 이미 비로그인 사용자를 `/login`으로
 * 돌려보낸다. 중복해서 로그인 유도를 그리면 리다이렉트 직전에 두 화면이 겹쳐 깜빡인다.
 *
 * 페이지 번호를 URL에 담지 않은 이유: 이 목록은 프로필 탭 안의 보조 화면이라 특정 페이지를
 * 링크로 공유할 상황이 없다. (리포트는 반대로 조건이 URL 정본이다 — 거기선 공유·새로고침이
 * 실제로 일어난다.)
 */
export default function ProfileSimulationBookmarksPage() {
  const [page, setPage] = useState(0)

  const query = useQuery({
    queryKey: simulationHistoriesQueryKey(page, PAGE_SIZE),
    queryFn: () => fetchSimulationHistories(page, PAGE_SIZE),
    retry: retryUnlessClientError(),
  })

  const error = resolveApiError({ error: query.error, data: query.data })
  const body = error ? null : getResponseBody(query.data)

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
          histories={body?.histories ?? []}
          page={body?.page ?? page}
          totalPages={body?.totalPages ?? 0}
          onPageChange={setPage}
        />
      )}
    </SectionStack>
  )
}
