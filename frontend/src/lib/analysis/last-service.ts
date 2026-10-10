import type { AnalysisSelection } from '@/lib/analysis/selection'

/**
 * 상권분석에서 마지막으로 쓴 업종을 기억한다(#562).
 *
 * 왜 필요한가: 업종은 상권마다 다른 목록(31개 안팎)에서 고른다. 같은 업종으로 여러 상권을
 * 견주는 사람이 대부분인데, 새로 들어올 때마다 업종을 다시 찾아야 했다. 마지막으로 쓴
 * 업종을 상권을 고르는 순간 기본값으로 채워 두면 「분석 결과 보기」까지 한 번 덜 누른다.
 *
 * `localStorage` 인 이유: 탭을 닫았다 다시 와도 이어져야 쓸모가 있다. 화면 편의값이라
 * 서버에 올리지 않고, 읽기·쓰기가 실패해도(프라이빗 모드 등) 원래 흐름은 그대로 간다.
 *
 * 이름도 함께 둔다. 업종 이름은 상권을 고른 뒤에야 목록 API 로 오므로, 자치구·행정동
 * 단계에서 단계 탭에 「한식음식점」처럼 남아 있는 업종을 보여 줄 다른 출처가 없다.
 */
export type RememberedAnalysisService = { code: string; name: string }

export const LAST_ANALYSIS_SERVICE_STORAGE_KEY = 'bps_analysis_last_service'

const listeners = new Set<() => void>()

const storage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** 저장된 원문을 해석한다. 모양이 틀리면 조용히 「기억 없음」으로 둔다. */
export const parseRememberedAnalysisService = (
  raw: string | null,
): RememberedAnalysisService | null => {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (
      value &&
      typeof value === 'object' &&
      typeof (value as RememberedAnalysisService).code === 'string' &&
      typeof (value as RememberedAnalysisService).name === 'string' &&
      (value as RememberedAnalysisService).code.trim() &&
      (value as RememberedAnalysisService).name.trim()
    ) {
      const { code, name } = value as RememberedAnalysisService
      return { code: code.trim(), name: name.trim() }
    }
  } catch {
    // 손상된 값. 기억이 없는 것과 같다.
  }
  return null
}

/** `useSyncExternalStore` 스냅샷. 문자열이라 값이 같으면 참조도 같다. */
export const getLastAnalysisServiceSnapshot = (): string | null => {
  try {
    return storage()?.getItem(LAST_ANALYSIS_SERVICE_STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

export const subscribeLastAnalysisService = (
  listener: () => void,
): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const readLastAnalysisService = (): RememberedAnalysisService | null =>
  parseRememberedAnalysisService(getLastAnalysisServiceSnapshot())

export const rememberLastAnalysisService = (
  service: RememberedAnalysisService,
): void => {
  const code = service.code.trim()
  const name = service.name.trim()
  const store = storage()
  if (!store || !code || !name) return

  try {
    store.setItem(
      LAST_ANALYSIS_SERVICE_STORAGE_KEY,
      JSON.stringify({ code, name }),
    )
  } catch {
    return
  }
  listeners.forEach(listener => listener())
}

/**
 * 업종이 비어 있으면 기억한 업종으로 채운다. 이미 고른 업종은 덮어쓰지 않는다.
 * 새 상권에 없는 업종이면 업종 목록이 도착한 뒤 셸의 정합성 효과가 지운다.
 */
export const applyRememberedService = (
  selection: AnalysisSelection,
  remembered: RememberedAnalysisService | null,
): AnalysisSelection =>
  selection.serviceCode || !remembered
    ? selection
    : { ...selection, serviceCode: remembered.code }
