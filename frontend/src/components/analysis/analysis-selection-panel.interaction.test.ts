// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import AnalysisSelectionPanel from '@/components/analysis/analysis-selection-panel'
import {
  createEmptyAnalysisSelection,
  type AnalysisSelection,
} from '@/lib/analysis/selection'

/*
  모바일 시트 목록 필터(#648). 칸은 시트 머리 아래 고정 자리에 있고 검색어는 패널이 쥔다.
  - 단계나 상위 선택이 바뀌면 검색어를 비운다 — 다른 동의 상권을 이전 동의 검색어로 걸러
    「검색 결과가 없어요」만 남고 지울 칸이 없는 화면을 만들지 않는다.
  - 칸이 없으면(목록이 임계값 이하) 거르지 않는다.
*/

type PanelProps = Parameters<typeof AnalysisSelectionPanel>[0]

const commercials = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => ({
    code: `${prefix}${index}`,
    name: `${prefix}상권${index + 1}`,
  }))

const selectionAt = (administrationCode: string): AnalysisSelection => ({
  ...createEmptyAnalysisSelection(),
  districtCode: '11680',
  administrationCode,
})

const baseProps = (overrides: Partial<PanelProps>): PanelProps => ({
  activeStep: 'commercial',
  selection: selectionAt('11680640'),
  periodCode: '20252',
  selectedNames: {},
  items: commercials('역삼', 20),
  status: 'ready',
  error: null,
  onStepChange: () => undefined,
  onSelect: () => undefined,
  onPreviewChange: () => undefined,
  onRetry: () => undefined,
  onSubmit: () => undefined,
  variant: 'sheet',
  ...overrides,
})

const optionCount = (prefix: string) =>
  screen.queryAllByRole('button', { name: new RegExp(`^${prefix}상권`) }).length

afterEach(cleanup)

describe('시트 목록 필터 검색어', () => {
  it('다른 상위를 고른 뒤 같은 단계로 돌아오면 필터가 비어 있다', () => {
    const view = render(createElement(AnalysisSelectionPanel, baseProps({})))

    const filter = screen.getByRole('searchbox', { name: '상권 검색' })
    fireEvent.change(filter, { target: { value: '역삼상권1' } })
    // 역삼상권1, 역삼상권10~19 = 11개
    expect(optionCount('역삼')).toBe(11)

    // 행정동 단계로 갔다가 다른 동을 고르고 상권 단계로 돌아온다.
    view.rerender(
      createElement(
        AnalysisSelectionPanel,
        baseProps({
          activeStep: 'administration',
          items: commercials('동', 20),
        }),
      ),
    )
    view.rerender(
      createElement(
        AnalysisSelectionPanel,
        baseProps({
          selection: selectionAt('11680650'),
          items: commercials('삼성', 20),
        }),
      ),
    )

    const next = screen.getByRole('searchbox', {
      name: '상권 검색',
    }) as HTMLInputElement
    expect(next.value).toBe('')
    expect(optionCount('삼성')).toBe(20)
  })

  it('칸이 없으면(목록이 임계값 이하) 거르지 않는다', () => {
    const view = render(createElement(AnalysisSelectionPanel, baseProps({})))
    fireEvent.change(screen.getByRole('searchbox', { name: '상권 검색' }), {
      target: { value: '없는이름' },
    })
    expect(optionCount('역삼')).toBe(0)

    // 같은 열쇠(단계·상위 선택 그대로)에서 목록이 줄어 칸이 사라진다.
    view.rerender(
      createElement(
        AnalysisSelectionPanel,
        baseProps({ items: commercials('역삼', 5) }),
      ),
    )

    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(optionCount('역삼')).toBe(5)
    expect(screen.queryByText('검색 결과가 없어요.')).toBeNull()
  })
})
