'use client'

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import styled from 'styled-components'

import { Button, ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui'
import { formatDateTime, formatLargeWon } from '@/lib/format'
import {
  buildSimulationHistoryReportHref,
  describeSimulationHistoryCondition,
  isSimulationHistoryReplayable,
} from '@/lib/simulation/history-presentation'
import type { SimulationHistoryItem } from '@/types/simulation'
import { SIMULATION_MEDIA } from '@/components/simulation/simulation-media'

export type SimulationHistoryListProps = {
  histories: readonly SimulationHistoryItem[]
  /** 0부터. */
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  /** 삭제를 맡긴다. 호출부(프로필)가 카드를 바로 숨기고 되돌리기 토스트를 띄운 뒤 지연 삭제한다. */
  onDelete: (historyId: string) => void
}

/*
  삭제는 위험색 ghost 다 — 프로필의 `DangerGhostButton`(profile-ui.tsx)과 같은 모양. 「리포트 보기」와 같은
  무게면 무엇이 주 행동인지 읽히지 않는다. 보이는 높이도 44px 로 둔다(카드 안 터치 대상).
*/
const DeleteButton = styled(Button)`
  min-height: 44px;
  color: var(--color-negative-text);

  &:hover:not(:disabled) {
    color: var(--color-negative-text);
  }
`

const Root = styled.div`
  display: grid;
  gap: 16px;
`

const List = styled.ul`
  display: grid;
  gap: 12px;
`

const Card = styled.li`
  display: grid;
  gap: 8px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 16px 20px;

  @media ${SIMULATION_MEDIA.mobile} {
    padding: 16px;
  }
`

const Price = styled.strong`
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
`

const Condition = styled.p`
  color: var(--color-text-700);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

const Meta = styled.p`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  color: var(--color-text-caption);
  font-size: 13px;
  line-height: 20px;
`

const Hint = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 4px;
`

const Pager = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;

  span {
    min-width: 56px;
    color: var(--color-text-700);
    font-size: 14px;
    font-weight: 600;
    text-align: center;
  }
`

/**
 * 저장한 시뮬레이션 결과 목록 — **순수 표시**다. 조회·페이지 상태는 호출부가 들고 있다.
 *
 * 카드마다 이동 목적지가 다르다: 개인 창업은 리포트로 바로 가고, 프랜차이즈는 입력 화면으로
 * 간다. 저장 응답이 `franchiseeId`를 돌려주지 않아 프랜차이즈는 조건이 완성되지 않기 때문인데,
 * 그 판단은 `history-presentation`이 하고 여기서는 문구만 바꾼다.
 *
 * 삭제는 `onDelete`로 **위임**한다. 확인 대화상자를 두지 않는다 — 호출부가 카드를 바로 숨기고
 * 「되돌리기」 토스트를 띄운 뒤 지연 삭제한다(분석 보관함과 같은 규칙). 되돌릴 수 있으니 확인창이
 * 한 번 더 막을 이유가 없고, 요청이 화면 밖에서 진행되므로 카드 버튼을 잠그지도 않는다.
 */
export default function SimulationHistoryList({
  histories,
  page,
  totalPages,
  onPageChange,
  onDelete,
}: SimulationHistoryListProps) {
  /**
   * 빈 목록.
   *
   * **첫 페이지가 아니면 페이저를 남긴다.** 뒷페이지가 비는 일은 실제로 일어난다(다른
   * 기기에서 먼저 지웠거나 두 건이 함께 빠졌을 때). 그때 페이저까지 감추면 앞 페이지에
   * 항목이 남아 있는데도 돌아갈 버튼이 없어 막다른 길이 된다. 호출부가 페이지를 되돌리지만
   * 그 보정이 도착하기 전 한 프레임에도 길은 열려 있어야 한다.
   */
  if (histories.length === 0) {
    if (page <= 0) {
      return (
        <EmptyState
          title="아직 저장한 결과가 없어요"
          description="창업 조건을 계산하고 결과를 저장하면 여기에 모여요."
          action={
            <ButtonLink href="/simulation" rightIcon={<ArrowRight />}>
              시뮬레이션 하러 가기
            </ButtonLink>
          }
        />
      )
    }

    /*
      뒷페이지가 빈 것은 「저장한 결과가 없다」가 아니다(X3) — 앞 페이지에는 남아 있다. 전에는 첫
      페이지와 같은 문구라 다 지워진 줄 알았다. 이 페이지만 비었다고 말하고 돌아갈 길을 준다.
    */
    return (
      <Root>
        <EmptyState
          title="이 페이지에는 결과가 없어요"
          description="앞 페이지에서 나머지 저장 결과를 볼 수 있어요."
        />
        <Pager aria-label="저장 목록 페이지">
          <Button
            size="medium"
            variant="secondary"
            aria-label="이전 페이지"
            onClick={() => onPageChange(page - 1)}
            leftIcon={<ChevronLeft />}
          >
            이전
          </Button>
        </Pager>
      </Root>
    )
  }

  return (
    <Root>
      <List>
        {histories.map(history => {
          const replayable = isSimulationHistoryReplayable(history)
          const condition = describeSimulationHistoryCondition(history)

          return (
            <Card key={history.historyId}>
              <Price>{formatLargeWon(history.totalPrice)}</Price>
              <Condition>{condition}</Condition>
              <Meta>
                <span>{history.dataBaseYear}년 기준</span>
                <span>{formatDateTime(history.createdAt)}</span>
              </Meta>
              {replayable ? null : (
                <Hint>
                  저장된 이력에 브랜드 정보가 없어요. 브랜드를 다시 골라야 다시
                  계산할 수 있어요.
                </Hint>
              )}
              <Actions>
                <ButtonLink
                  size="medium"
                  variant="secondary"
                  href={buildSimulationHistoryReportHref(history)}
                  rightIcon={replayable ? <ArrowRight /> : undefined}
                  leftIcon={replayable ? undefined : <SlidersHorizontal />}
                >
                  {replayable ? '리포트 보기' : '브랜드 다시 고르기'}
                </ButtonLink>
                {/* 삭제는 위험색 ghost 로 낮춘다(X3). 누르면 카드가 바로 사라지고 토스트의 「되돌리기」로
                    살릴 수 있다 — 그래도 주 행동(리포트 보기)과 같은 무게로 두지 않는다. */}
                <DeleteButton
                  size="medium"
                  variant="ghost"
                  aria-label={`${condition} 저장 기록 삭제`}
                  onClick={() => onDelete(history.historyId)}
                  leftIcon={<Trash2 />}
                >
                  삭제
                </DeleteButton>
              </Actions>
            </Card>
          )
        })}
      </List>

      {totalPages > 1 ? (
        <Pager aria-label="저장 목록 페이지">
          <Button
            size="medium"
            variant="secondary"
            aria-label="이전 페이지"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
            leftIcon={<ChevronLeft />}
          >
            이전
          </Button>
          <span aria-live="polite">
            {page + 1} / {totalPages}
          </span>
          <Button
            size="medium"
            variant="secondary"
            aria-label="다음 페이지"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
            rightIcon={<ChevronRight />}
          >
            다음
          </Button>
        </Pager>
      ) : null}
    </Root>
  )
}
