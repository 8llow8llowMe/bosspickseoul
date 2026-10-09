// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RecommendationView } from './recommend-state'
import {
  readCompareSelection,
  resolveAdministrationListReady,
  resolveViewTransitionFocus,
  toggleCompareSelection,
  useAdministrationListReady,
  useRecommendViewFocus,
} from './recommend-view-effects'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('useAdministrationListReady — 행정동 자동 열림을 알리는 조건 (#570)', () => {
  type Props = Parameters<typeof useAdministrationListReady>[0]
  const base = {
    pendingDistrictCode: '11680',
    draftDistrictCode: '11680',
    isSuccess: false,
    count: 0,
  }

  it('목록 요청이 성공하고 비어 있지 않을 때만 한 번 알린다', () => {
    const dispatch = vi.fn()
    const { rerender } = renderHook(
      (props: Props) => useAdministrationListReady(props),
      {
        initialProps: { ...base, dispatch },
      },
    )

    // 로딩 중
    expect(dispatch).not.toHaveBeenCalled()

    // 성공했지만 빈 목록
    rerender({ ...base, isSuccess: true, count: 0, dispatch })
    expect(dispatch).not.toHaveBeenCalled()

    rerender({ ...base, isSuccess: true, count: 20, dispatch })
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({
      type: 'administrationListReady',
      districtCode: '11680',
    })
  })

  it('대기 중인 자치구가 초안의 자치구와 다르면 알리지 않는다', () => {
    const dispatch = vi.fn()

    renderHook(() =>
      useAdministrationListReady({
        ...base,
        draftDistrictCode: '11110',
        isSuccess: true,
        count: 17,
        dispatch,
      }),
    )

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('대기가 없으면 알리지 않는다(링크 씨앗·이미 연 뒤)', () => {
    expect(
      resolveAdministrationListReady({
        ...base,
        pendingDistrictCode: null,
        isSuccess: true,
        count: 20,
      }),
    ).toBeNull()
  })
})

describe('useRecommendViewFocus — 뷰 전환 뒤 포커스 (#570)', () => {
  const mountButton = (label: string): HTMLButtonElement => {
    const button = document.createElement('button')
    button.textContent = label
    document.body.append(button)
    return button
  }

  it('이전 결과로 돌아오면 결과 제목에 포커스를 둔다', () => {
    const restoreButton = mountButton('이전 결과로 돌아가기')
    const heading = document.createElement('h2')
    heading.tabIndex = -1
    document.body.append(heading)
    restoreButton.focus()

    const { result, rerender } = renderHook(
      ({ view }: { view: RecommendationView }) =>
        useRecommendViewFocus({
          view,
          getResultHeading: () => heading,
          getCriteriaTarget: () => restoreButton,
        }),
      { initialProps: { view: 'criteria' as RecommendationView } },
    )

    result.current.requestRestoreFocus()
    restoreButton.remove()
    rerender({ view: 'results' })

    expect(document.activeElement).toBe(heading)
  })

  it('제출로 결과에 가면 여기서 옮기지 않는다 — 응답 처리가 맡는다', () => {
    const heading = document.createElement('h2')
    heading.tabIndex = -1
    document.body.append(heading)

    const { rerender } = renderHook(
      ({ view }: { view: RecommendationView }) =>
        useRecommendViewFocus({
          view,
          getResultHeading: () => heading,
          getCriteriaTarget: () => null,
        }),
      { initialProps: { view: 'criteria' as RecommendationView } },
    )

    rerender({ view: 'results' })

    expect(document.activeElement).not.toBe(heading)
  })

  it('칩에서 연 선택 뷰를 닫으면 조건 화면의 첫 자리로 옮긴다', () => {
    const restoreButton = mountButton('이전 결과로 돌아가기')

    const { rerender } = renderHook(
      ({ view }: { view: RecommendationView }) =>
        useRecommendViewFocus({
          view,
          getResultHeading: () => null,
          getCriteriaTarget: () => restoreButton,
        }),
      { initialProps: { view: 'results' as RecommendationView } },
    )

    rerender({ view: 'picker' })
    expect(document.activeElement).not.toBe(restoreButton)

    rerender({ view: 'criteria' })
    expect(document.activeElement).toBe(restoreButton)
  })

  it('전환 규칙', () => {
    expect(resolveViewTransitionFocus('criteria', 'results', true)).toBe(
      'results-heading',
    )
    expect(resolveViewTransitionFocus('criteria', 'results', false)).toBeNull()
    expect(resolveViewTransitionFocus('picker', 'criteria', false)).toBe(
      'criteria',
    )
    expect(resolveViewTransitionFocus('results', 'criteria', false)).toBeNull()
  })
})

describe('비교 담기 선택은 제출 열쇠와 함께 든다 (#570 리뷰)', () => {
  it('열쇠가 바뀐 그 렌더에서 빈 선택으로 읽힌다', () => {
    const selection = { requestKey: 'old', codes: ['A', 'B'] }

    expect(readCompareSelection(selection, 'old')).toEqual(['A', 'B'])
    expect(readCompareSelection(selection, 'new')).toEqual([])
    expect(readCompareSelection(selection, null)).toEqual([])
  })

  it('새 열쇠로 담으면 이전 선택을 섞지 않는다', () => {
    const selection = { requestKey: 'old', codes: ['A', 'B'] }

    expect(toggleCompareSelection(selection, 'new', 'C', 2)).toEqual({
      requestKey: 'new',
      codes: ['C'],
    })
  })

  it('정원을 넘기지 않고, 다시 누르면 뺀다', () => {
    const full = { requestKey: 'k', codes: ['A', 'B'] }

    expect(toggleCompareSelection(full, 'k', 'C', 2)).toBe(full)
    expect(toggleCompareSelection(full, 'k', 'A', 2)).toEqual({
      requestKey: 'k',
      codes: ['B'],
    })
  })
})
