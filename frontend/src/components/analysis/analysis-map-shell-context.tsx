'use client'

import { createContext, useContext } from 'react'

import type { MapCamera } from '@/lib/analysis/map-camera'

export type AnalysisMapShellContextValue = {
  /** 현재 카메라. URL 이 정본이고, `c` 가 없으면 셸이 유도한 폴백 카메라다. */
  camera: MapCamera
  /**
   * 결과 레이어 닫기. `push` 로 열었으면 `router.back()`, 그 외(하드 로드·공유 링크
   * `replace` 진입)에는 탐색 URL 로 `replace` 한다 — 어떤 경로에서도 사이트를 벗어나지
   * 않는다(map-shell.md D4-5).
   */
  closeResultLayer: () => void
}

/*
 * `openedByPush` 는 컨텍스트로 내보내지 않는다. 그 사실은 셸의 ref 에만 있고, ref 를
 * 렌더 중에 읽어 컨텍스트에 실으면 값이 갱신되지 않는 채로 굳는다(react-hooks/refs).
 * 소비처도 없다 — 결과 레이어는 `closeResultLayer` 만 알면 되고, push/replace 판정은
 * 셸 안에서 끝난다(map-shell.md D4-5).
 */

const AnalysisMapShellContext =
  createContext<AnalysisMapShellContextValue | null>(null)

export const AnalysisMapShellProvider = AnalysisMapShellContext.Provider

/**
 * 결과 레이어가 셸의 닫기 동작·현재 카메라를 읽는 통로.
 *
 * 프로바이더 밖에서 호출되면 프로그래밍 오류다 — 결과 레이어는 반드시
 * `(map-shell)` 라우트 그룹 안에서만 렌더된다.
 */
export const useAnalysisMapShell = (): AnalysisMapShellContextValue => {
  const value = useContext(AnalysisMapShellContext)
  if (!value) {
    throw new Error(
      'useAnalysisMapShell는 AnalysisMapShell 안에서만 사용할 수 있습니다.',
    )
  }
  return value
}
