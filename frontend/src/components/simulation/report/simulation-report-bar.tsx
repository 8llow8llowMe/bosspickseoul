'use client'

import { useState } from 'react'
import { Scale } from 'lucide-react'
import styled from 'styled-components'

import SimulationSaveButton, {
  SimulationSaveFeedback,
} from '@/components/simulation/report/simulation-save-button'
import {
  SimulationBottomBarAmount,
  SimulationBottomBarFrame,
  SimulationBottomBarSpacer,
} from '@/components/simulation/simulation-bottom-bar'
import { ButtonLink } from '@/components/ui/button'
import { formatLargeWon } from '@/lib/format'
import type { SimulationSaveState } from '@/lib/simulation/use-simulation-save'

export type SimulationReportBarProps = {
  /** 만원 */
  totalPrice: number
  save: SimulationSaveState
  /** 지금 보고 있는 URL. 로그인 후 여기로 되돌아온다. */
  currentHref: string
  compareHref: string
}

/* gap 을 쓰지 않는다 — 결과 한 줄이 비어 있을 때도 그 자리만큼 바가 커진다. 간격은 결과 한 줄이 준다. */
const Root = styled(SimulationBottomBarFrame)`
  display: grid;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const Actions = styled.div`
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
`

/* 아이콘 버튼. 바 폭이 375 에서 「총액 + 저장 + 비교」를 글자로 다 담지 못한다(R6). 정사각 40px. */
const IconLink = styled(ButtonLink)`
  && {
    width: 40px;
    padding: 0;
  }
`

/**
 * 리포트 하단 고정 바(≤1023). 왼쪽 총액, 오른쪽 `결과 저장`(primary) + 비교(아이콘).
 *
 * 리포트는 375 에서 약 2,800px 인데, 저장·비교 CTA 가 첫 카드 안에만 있어 아래로 읽어 내려간
 * 사용자는 다음 행동을 찾으려고 맨 위로 돌아가야 했다. ≥1024 에서는 왼쪽 sticky 요약 열이 같은
 * 버튼을 갖고, 이 바는 숨는다. 두 곳의 저장 상태는 페이지가 넘기는 `save` 하나다.
 *
 * 저장 결과 한 줄(`저장했어요 · 저장 목록 보기`)은 버튼 옆이 아니라 바 위쪽에 둔다 — 버튼 칸에
 * 넣으면 375 에서 세 줄로 감긴다.
 */
export default function SimulationReportBar({
  totalPrice,
  save,
  currentHref,
  compareHref,
}: SimulationReportBarProps) {
  // 문서 끝에 바 높이만큼 자리를 두려고 바를 잰다(#605). 저장 결과 한 줄이 붙으면 바가 커진다.
  const [bar, setBar] = useState<HTMLDivElement | null>(null)

  return (
    <>
      <Root ref={setBar} role="region" aria-label="리포트 요약">
        <SimulationSaveFeedback state={save} offset="bottom" />
        <Row>
          <SimulationBottomBarAmount>
            <span>예상 총 창업 비용</span>
            <strong>{formatLargeWon(totalPrice)}</strong>
          </SimulationBottomBarAmount>
          <Actions>
            <SimulationSaveButton
              state={save}
              currentHref={currentHref}
              size="medium"
              compact
            />
            <IconLink
              href={compareHref}
              size="medium"
              variant="secondary"
              leftIcon={<Scale />}
              aria-label="다른 조건과 비교"
              title="다른 조건과 비교"
            />
          </Actions>
        </Row>
      </Root>
      <SimulationBottomBarSpacer bar={bar} />
    </>
  )
}
