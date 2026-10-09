'use client'

import { ChevronRight } from 'lucide-react'
import styled from 'styled-components'

import { Skeleton } from '@/components/ui/skeleton'
import type { AnalysisResultTab } from '@/lib/analysis/selection'

/**
 * 요약 인사이트 — 핵심 지표 아래에 **결론을 한 줄씩** 둔다(피크 시간 · 주 고객층 · 경쟁).
 *
 * 요약 탭은 숫자 카드만 있어서, 「그래서 언제 · 누구에게 · 얼마나 붐비는 곳인가」는 아래 탭
 * 일곱 개를 내려가며 사용자가 찾아야 했다. 각 줄은 그 근거가 있는 탭으로 데려간다 — 문장만
 * 믿지 말고 차트로 확인할 수 있어야 한다.
 *
 * 문장은 차트 카드의 결론 문장과 **같은 함수**(`lib/analysis/chart-insights`)로 만든다. 같은
 * 데이터에서 요약과 탭이 다른 말을 하면 안 된다.
 */

export type SummaryInsight = {
  key: string
  label: string
  /** 데이터가 모자라면 null — 그 줄은 그리지 않는다(지어내지 않는다). */
  sentence: string | null
  /** 근거 데이터를 불러오는 중이면 줄 자리를 잡아 둔다(다 받은 뒤 아래가 밀리지 않게). */
  loading: boolean
  tab: AnalysisResultTab
  tabLabel: string
}

const List = styled.ul`
  display: grid;
  gap: 8px;
`

/*
  행 전체가 버튼 하나다. 근거 탭 링크(Action)는 따로 칸을 두지 않고 **문장 바로 뒤에 잇는다**(#589).
  오른쪽 끝 칸에 두던 때는 1440 에서 문장 끝과 링크가 490~630px 떨어져, 무엇을 여는 링크인지
  눈이 행을 가로질러 다시 돌아와야 했다.
*/
const Row = styled.button`
  width: 100%;
  min-height: 52px;
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: var(--color-surface-muted);
  }

  /* 전역 :focus-visible 링은 끄지 않는다 — 후광만으로는 흰 배경에서 대비가 약 1.2:1 이다. */
  &:focus-visible {
    box-shadow: var(--shadow-focus-primary-strong);
  }

  /* 좁으면 라벨을 문장 위로 올린다. 76px 칸에 라벨을 두면 문장이 두세 줄로 꺾인다. */
  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 2px;
  }
`

const LoadingRow = styled.div`
  min-height: 52px;
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  padding: 12px 14px;

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 6px;
  }
`

const Label = styled.span`
  color: var(--color-text-caption);
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;

  @media (max-width: 640px) {
    grid-column: 1 / -1;
  }
`

const Sentence = styled.span`
  color: var(--color-text-900);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

/* 문장 끝에 붙는 인라인 링크. 줄이 꺾여도 「매출 보기 ›」는 한 덩어리로 다음 줄에 넘어간다. */
const Action = styled.span`
  display: inline-flex;
  align-items: center;
  vertical-align: bottom;
  gap: 2px;
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  white-space: nowrap;

  svg {
    width: 16px;
    height: 16px;
  }
`

export default function AnalysisSummaryInsights({
  items,
  onSelect,
}: {
  items: readonly SummaryInsight[]
  onSelect: (tab: AnalysisResultTab) => void
}) {
  const visible = items.filter(item => item.loading || item.sentence)
  if (visible.length === 0) return null

  return (
    <List aria-label="요약 인사이트">
      {visible.map(item => (
        <li key={item.key}>
          {item.loading ? (
            <LoadingRow role="status" aria-label={`${item.label} 불러오는 중`}>
              <Label>{item.label}</Label>
              <Skeleton $height="18px" $width="70%" />
            </LoadingRow>
          ) : (
            <Row type="button" onClick={() => onSelect(item.tab)}>
              <Label>{item.label}</Label>
              <Sentence>
                {item.sentence}{' '}
                <Action>
                  {item.tabLabel} 보기
                  <ChevronRight aria-hidden="true" />
                </Action>
              </Sentence>
            </Row>
          )}
        </li>
      ))}
    </List>
  )
}
