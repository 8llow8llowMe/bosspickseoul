'use client'

import { Bookmark } from 'lucide-react'
import styled from 'styled-components'

import { ButtonLink } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'

/** 프로필의 시뮬레이션 저장 목록. 이력 삭제도 이 화면에서만 한다(명세 D4-4). */
export const SIMULATION_SAVED_RESULTS_HREF = '/profile/bookmarks/simulation'

/* 헤더가 flex-wrap 이라 margin-left:auto 로 오른쪽 끝에 붙는다. 좁으면 다음 줄 오른쪽으로 내려간다. */
const Root = styled.div`
  margin-left: auto;
`

/**
 * 입력 화면 헤더의 「저장한 결과」 진입점(B12). **로그인 사용자에게만** 그린다.
 *
 * 건수는 붙이지 않는다 — 붙이려면 입력 화면을 열 때마다 계산과 무관한 이력 목록 요청을 한 번
 * 더 해야 한다. 세션 복원 전(`hasHydrated` false)에도 그리지 않는다. 먼저 그렸다가 비로그인으로
 * 뒤집히면 링크가 깜빡인다.
 */
export default function SimulationSavedResultsLink() {
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)

  if (!hasHydrated || !isLoggedIn) return null

  return (
    <Root>
      <ButtonLink
        href={SIMULATION_SAVED_RESULTS_HREF}
        variant="ghost"
        size="medium"
        leftIcon={<Bookmark />}
      >
        저장한 결과
      </ButtonLink>
    </Root>
  )
}
