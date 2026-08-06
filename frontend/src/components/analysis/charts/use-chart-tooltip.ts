'use client'

import { useCallback, useState } from 'react'

export type TooltipState = {
  x: number
  y: number
  label: string
  value: string
}

export const useChartTooltip = () => {
  const [active, setActive] = useState<TooltipState | null>(null)
  const show = useCallback((next: TooltipState) => setActive(next), [])
  const hide = useCallback(() => setActive(null), [])
  return { active, show, hide }
}
