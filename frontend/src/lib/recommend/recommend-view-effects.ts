'use client'

import { useCallback, useEffect, useRef } from 'react'

import type {
  RecommendationAction,
  RecommendationView,
} from './recommend-state'

/**
 * 행정동 목록이 「쓸 만하게 도착했는가」. 그렇다면 알릴 자치구 코드, 아니면 `null`.
 *
 * 판단(선택 뷰를 열지)은 리듀서(`administrationListReady`)가 한다. 여기서는 화면이 알릴
 * 조건만 정한다 — 대기 중인 자치구가 지금 초안의 자치구이고, 목록 요청이 성공했고,
 * 목록이 비어 있지 않을 것. 실패·빈 목록이면 알리지 않는다(condition-selector D4-2-1).
 */
export const resolveAdministrationListReady = ({
  pendingDistrictCode,
  draftDistrictCode,
  isSuccess,
  count,
}: {
  pendingDistrictCode: string | null
  draftDistrictCode: string | null
  isSuccess: boolean
  count: number
}): string | null => {
  if (!pendingDistrictCode) return null
  if (draftDistrictCode !== pendingDistrictCode) return null
  if (!isSuccess || count === 0) return null

  return pendingDistrictCode
}

/** 행정동 목록 도착을 리듀서에 알린다(#570). 조건은 `resolveAdministrationListReady`. */
export function useAdministrationListReady({
  pendingDistrictCode,
  draftDistrictCode,
  isSuccess,
  count,
  dispatch,
}: {
  pendingDistrictCode: string | null
  draftDistrictCode: string | null
  isSuccess: boolean
  count: number
  dispatch: (action: RecommendationAction) => void
}): void {
  useEffect(() => {
    const districtCode = resolveAdministrationListReady({
      pendingDistrictCode,
      draftDistrictCode,
      isSuccess,
      count,
    })

    if (districtCode) {
      dispatch({ type: 'administrationListReady', districtCode })
    }
  }, [count, dispatch, draftDistrictCode, isSuccess, pendingDistrictCode])
}

type Focusable = { focus: (options?: FocusOptions) => void }

/**
 * 뷰가 바뀐 뒤 포커스를 둘 자리.
 *
 * - 「이전 결과로 돌아가기」로 결과 뷰에 돌아왔다 → 결과 제목. 누른 버튼이 사라져
 *   포커스가 문서 처음으로 튀기 때문이다.
 * - 선택 뷰에서 조건 화면으로 돌아왔다(닫기·항목 선택) → 조건 화면의 첫 자리
 *   (「이전 결과로 돌아가기」가 있으면 그 버튼, 없으면 조건 화면 제목). 선택 뷰가 통째로
 *   사라져 포커스를 잃는다.
 *
 * 그 밖의 전환은 다른 곳이 맡는다(제출 → 응답 처리가 결과 제목, 선택 뷰 진입 → 선택 뷰 제목).
 */
export const resolveViewTransitionFocus = (
  previous: RecommendationView,
  next: RecommendationView,
  isRestoreRequested: boolean,
): 'results-heading' | 'criteria' | null => {
  if (next === 'results' && previous !== 'results' && isRestoreRequested) {
    return 'results-heading'
  }
  if (previous === 'picker' && next === 'criteria') return 'criteria'

  return null
}

/**
 * 뷰 전환 뒤 포커스를 옮긴다. 대상은 **전환이 커밋된 뒤에** 읽는다 — 그 전에는 새 뷰의
 * 요소가 아직 없다. 반환하는 `requestRestoreFocus` 는 「이전 결과로 돌아가기」가 dispatch
 * 직전에 부른다.
 */
export function useRecommendViewFocus({
  view,
  getResultHeading,
  getCriteriaTarget,
}: {
  view: RecommendationView
  getResultHeading: () => Focusable | null
  getCriteriaTarget: () => Focusable | null
}): { requestRestoreFocus: () => void } {
  const previousViewRef = useRef(view)
  const restoreRequestedRef = useRef(false)
  const getResultHeadingRef = useRef(getResultHeading)
  const getCriteriaTargetRef = useRef(getCriteriaTarget)

  useEffect(() => {
    getResultHeadingRef.current = getResultHeading
    getCriteriaTargetRef.current = getCriteriaTarget
  })

  useEffect(() => {
    const previous = previousViewRef.current

    if (previous === view) return

    previousViewRef.current = view

    const target = resolveViewTransitionFocus(
      previous,
      view,
      restoreRequestedRef.current,
    )

    restoreRequestedRef.current = false

    if (target === 'results-heading') {
      getResultHeadingRef.current()?.focus({ preventScroll: true })
    } else if (target === 'criteria') {
      getCriteriaTargetRef.current()?.focus({ preventScroll: true })
    }
  }, [view])

  const requestRestoreFocus = useCallback(() => {
    restoreRequestedRef.current = true
  }, [])

  return { requestRestoreFocus }
}

/**
 * 비교 담기 선택을 **그 선택을 담은 제출(`requestKey`)과 함께** 든다.
 *
 * 예전에는 `requestKey` 가 바뀐 뒤 이펙트로 비워, 새로 제출한 직후 한 프레임 동안 이전
 * 결과의 선택이 새 결과 위에 보였다(#570 리뷰). 열쇠가 다르면 렌더에서 바로 빈 배열로 읽는다.
 */
export type CompareSelectionState = {
  readonly requestKey: string | null
  readonly codes: readonly string[]
}

export const readCompareSelection = (
  selection: CompareSelectionState,
  requestKey: string | null,
): readonly string[] =>
  requestKey !== null && selection.requestKey === requestKey
    ? selection.codes
    : EMPTY_SELECTION

const EMPTY_SELECTION: readonly string[] = []

export const toggleCompareSelection = (
  selection: CompareSelectionState,
  requestKey: string | null,
  commercialCode: string,
  max: number,
): CompareSelectionState => {
  const current = readCompareSelection(selection, requestKey)

  if (current.includes(commercialCode)) {
    return {
      requestKey,
      codes: current.filter(code => code !== commercialCode),
    }
  }
  if (current.length >= max) {
    return selection.requestKey === requestKey
      ? selection
      : { requestKey, codes: current }
  }

  return { requestKey, codes: [...current, commercialCode] }
}
