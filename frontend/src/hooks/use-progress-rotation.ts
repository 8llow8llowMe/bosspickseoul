'use client'

import { useEffect, useState } from 'react'

export const useProgressRotation = (
  messages: string[],
  intervalMs = 4000,
): string => {
  const [index, setIndex] = useState(0)
  const key = messages.join('|')

  useEffect(() => {
    setIndex(0)
    if (messages.length <= 1) return
    const timer = setInterval(
      () => setIndex(i => (i + 1) % messages.length),
      intervalMs,
    )
    return () => clearInterval(timer)
    // key로 배열 내용 변화만 감지
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, intervalMs])

  return messages[index] ?? ''
}
