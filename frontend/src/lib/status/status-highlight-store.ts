import { useSyncExternalStore } from 'react'

/**
 * 목록 ↔ 지도 hover 연동 상태. **페이지 state 가 아니라 작은 store** 다.
 *
 * 처음엔 페이지 `useState` 로 올렸는데, 그러면 구 경계를 넘을 때마다 페이지 전체(상세의
 * recharts 차트 4개, 숨겨진 모바일 지도와 시트까지)가 다시 렌더됐다. 이 store 는 목록과
 * 데스크톱 지도만 구독한다.
 *
 * `leave` 는 **지금 값**과 비교해 지운다. 렌더 시점 값으로 비교하면, 가장자리 구로 들어갔다가
 * 커밋 전에 밖으로 나갈 때 지우지 못해 테두리·툴팁이 남는다.
 */
export type StatusHighlightStore = {
  get: () => string | null
  enter: (districtCode: string) => void
  leave: (districtCode: string) => void
  clear: () => void
  subscribe: (listener: () => void) => () => void
}

export const createStatusHighlightStore = (): StatusHighlightStore => {
  let current: string | null = null
  const listeners = new Set<() => void>()

  const set = (next: string | null) => {
    if (next === current) return
    current = next
    listeners.forEach(listener => listener())
  }

  return {
    get: () => current,
    enter: districtCode => set(districtCode),
    leave: districtCode => {
      if (current === districtCode) set(null)
    },
    clear: () => set(null),
    subscribe: listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

const getServerSnapshot = () => null

export const useStatusHighlight = (store: StatusHighlightStore) =>
  useSyncExternalStore(store.subscribe, store.get, getServerSnapshot)
