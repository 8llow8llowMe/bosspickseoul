'use client'

import { useEffect, useState } from 'react'

export const useProgressRotation = (
  messages: string[],
  intervalMs = 4000,
): string => {
  const key = messages.join('|')
  const [prevKey, setPrevKey] = useState(key)
  const [index, setIndex] = useState(0)

  // 문구 목록이 바뀌면 처음부터 다시 돈다. effect 에서 setIndex(0) 를 부르면 초기화가
  // 커밋 한 번 늦어 이전 목록의 문구가 한 프레임 스쳐 지나가므로, 렌더 중에 맞춘다.
  // React 가 「props 가 바뀔 때 state 조정」으로 권하는 패턴이다.
  if (prevKey !== key) {
    setPrevKey(key)
    setIndex(0)
  }

  useEffect(() => {
    if (messages.length <= 1) return
    const timer = setInterval(
      () => setIndex(i => (i + 1) % messages.length),
      intervalMs,
    )
    return () => clearInterval(timer)
    // key로 배열 내용 변화만 감지
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, intervalMs])

  return messages[prevKey === key ? index : 0] ?? ''
}
