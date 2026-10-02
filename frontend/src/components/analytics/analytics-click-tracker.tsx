'use client'

import { useEffect } from 'react'
import {
  TRACK_ATTR,
  TRACK_PARAMS_ATTR,
  parseTrackAttrs,
} from '@/lib/analytics/events'

/**
 * `trackAttrs()` 를 펼친 요소의 클릭을 문서 한 곳에서 받아 GA 이벤트로 보낸다.
 *
 * 캡처 단계에서 듣는다 — 하위 핸들러가 `stopPropagation` 해도 놓치지 않는다. 링크 이동은
 * 막지 않는다(`preventDefault` 없음). `gtag.js` 는 페이지를 떠나는 클릭도 `sendBeacon`
 * 으로 보낸다.
 */
export default function AnalyticsClickTracker() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (typeof window.gtag !== 'function') return
      const target = event.target
      if (!(target instanceof Element)) return
      const element = target.closest(`[${TRACK_ATTR}]`)
      if (!element) return
      const parsed = parseTrackAttrs(
        element.getAttribute(TRACK_ATTR),
        element.getAttribute(TRACK_PARAMS_ATTR),
      )
      if (!parsed) return
      window.gtag('event', parsed.name, parsed.params)
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  return null
}
