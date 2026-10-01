'use client'

import Link from 'next/link'
import { BookmarkCheck, BookmarkPlus, LogIn } from 'lucide-react'
import styled from 'styled-components'

import { SIMULATION_SAVED_RESULTS_HREF } from '@/components/simulation/simulation-saved-results-link'
import { Button, ButtonLink } from '@/components/ui/button'
import type { SimulationSaveState } from '@/lib/simulation/use-simulation-save'

export type SimulationSaveButtonProps = {
  state: SimulationSaveState
  /** 지금 보고 있는 URL. 로그인 후 여기로 되돌아온다. */
  currentHref: string
  /** 요약 열은 large(48px), 하단 고정 바는 medium(40px) — 바의 다른 버튼과 같은 높이다. */
  size: 'medium' | 'large'
  /**
   * 하단 고정 바용. 로그인 유도의 아이콘을 뺀다 — 375 바에서 「저장하려면 로그인」 아이콘까지 두면
   * 왼쪽 총액 칸이 121px 로 줄어 「12억 3,456만원」(127px)이 말줄임된다. 금액이 잘리는 것이 더 나쁘다.
   */
  compact?: boolean
}

export type SimulationSaveFeedbackProps = {
  state: SimulationSaveState
  /** 글자가 있을 때만 버튼 쪽으로 띄울 방향. 요약 열은 버튼 아래(top), 하단 바는 버튼 위(bottom)다. */
  offset: 'top' | 'bottom'
}

/**
 * 리포트 저장 CTA. **표시만 한다** — 상태는 `useSimulationSave` 가 페이지 한 곳에서 들고 있다
 * (요약 열과 하단 바에 두 벌이 있어도 저장은 한 번이어야 한다).
 *
 * 저장만 인증이 필요하다 — 계산은 비로그인도 된다. 그래서 이 버튼 하나가 로그인 유도를
 * 맡고, 화면의 나머지는 로그인 여부를 모른다.
 *
 * **세션 판정 전(`hasHydrated === false`)에는 로그인 유도를 그리지 않는다.** 스토어가
 * `/api/auth/me`로 채워지기 전 기본값이 `isLoggedIn: false`라, 그대로 그리면 로그인한
 * 사용자에게 "저장하려면 로그인"이 한 프레임 깜빡이고 사라진다.
 *
 * 저장 후에는 버튼을 `저장됨`으로 잠근다. 같은 조건을 두 번 저장하면 이력이 중복되는데,
 * 서버가 막아 주지 않으므로 화면에서 막는다.
 *
 * 여기에 삭제·공유 버튼은 만들지 않는다. 삭제는 프로필의 저장 목록이 맡는다 — 방금 저장한
 * 것을 같은 자리에서 되돌리는 동작은 "저장됨" 잠금과 겹쳐 무엇이 참인지 흐려진다.
 * 공유는 `ShareTargetType`에 시뮬레이션 상수가 없어 아직 만들 수 없다.
 */
export default function SimulationSaveButton({
  state,
  currentHref,
  size,
  compact = false,
}: SimulationSaveButtonProps) {
  if (state.needsLogin) {
    return (
      // 비로그인에게도 이것이 주 행동이다 — secondary 로 두면 옆의 「다른 조건과 비교」와 무게가 같아진다(R2).
      <ButtonLink
        size={size}
        variant="primary"
        href={`/login?redirect=${encodeURIComponent(currentHref)}`}
        leftIcon={compact ? undefined : <LogIn />}
      >
        저장하려면 로그인
      </ButtonLink>
    )
  }

  return (
    <Button
      size={size}
      variant={state.saved ? 'secondary' : 'primary'}
      disabled={state.saved || !state.hasHydrated}
      isLoading={state.isPending}
      loadingLabel="저장 중"
      leftIcon={state.saved ? <BookmarkCheck /> : <BookmarkPlus />}
      onClick={state.save}
    >
      {state.saved ? '저장됨' : '결과 저장'}
    </Button>
  )
}

/*
  성공과 오류는 함께 오지 않는다(저장되면 오류가 없다). 버튼과의 간격은 **글자가 있을 때만** 이 묶음이
  margin 으로 준다. 감싸는 쪽이 grid gap 으로 띄우면 높이 0 인 빈 묶음 앞에도 gap 이 생겨 버튼 아래
  8px 이 늘 남는다.
*/
const Feedback = styled.div<{ $offset: 'top' | 'bottom' }>`
  display: grid;

  > p:not(:empty) {
    ${props =>
      props.$offset === 'top' ? 'margin-top: 8px;' : 'margin-bottom: 8px;'}
  }
`

/* 상태 영역은 비어 있어도 늘 둔다. 낭독기는 이미 있는 live region 의 **내용 변화**를 읽는다 —
   저장하는 순간 영역째 새로 붙이면 읽지 않고 넘어가는 낭독기가 있다. 그래서 비었을 때도
   display:none 으로 숨기지 않는다(접근성 트리에서 빠진다). 빈 p 는 높이가 0 이다. */
const Status = styled.p`
  color: var(--color-text-700);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;

  a {
    color: var(--color-primary-700);
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const Alert = styled.p`
  color: var(--color-danger);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

/**
 * 저장 결과 한 줄. 라벨이 `저장됨` 으로 바뀌는 것만으로는 저장이 됐는지, 어디서 다시 보는지를
 * 알 수 없었다(R12). 성공하면 `role="status"` 로 알리고 저장 목록으로 가는 링크를 준다.
 *
 * 버튼과 따로 둔 이유: 하단 고정 바에서는 이 줄이 버튼 옆이 아니라 바 위쪽 한 줄을 차지한다.
 */
export function SimulationSaveFeedback({
  state,
  offset,
}: SimulationSaveFeedbackProps) {
  const sessionExpired = state.error?.kind === 'unauthorized'

  return (
    <Feedback $offset={offset}>
      <Status role="status">
        {state.saved ? (
          <>
            저장했어요 ·{' '}
            <Link href={SIMULATION_SAVED_RESULTS_HREF}>저장 목록 보기</Link>
          </>
        ) : null}
      </Status>
      {state.error ? (
        <Alert role="alert">
          {sessionExpired
            ? '로그인이 풀렸어요. 다시 로그인하면 저장할 수 있어요.'
            : state.error.message}
        </Alert>
      ) : null}
    </Feedback>
  )
}
