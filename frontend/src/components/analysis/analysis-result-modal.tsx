'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PropsWithChildren,
} from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'

import AnalysisResultView from '@/components/analysis/analysis-result-view'

export type AnalysisResultModalSurfaceProps = PropsWithChildren<{
  onClose: () => void
  ariaLabel?: string
}>

const Overlay = styled.div`
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 18, 0.58);
  padding: clamp(24px, 3vw, 32px);
  backdrop-filter: blur(3px);

  @media (max-width: 840px) {
    display: block;
    padding: 0;
    background: var(--color-surface-muted);
    backdrop-filter: none;
  }
`

const Surface = styled.section`
  width: min(1400px, 100%);
  height: min(920px, calc(100dvh - clamp(48px, 6vw, 64px)));
  overflow: hidden;
  border: 1px solid var(--color-border-200);
  border-radius: 24px;
  background: var(--color-surface-muted);
  box-shadow: var(--shadow-level-4);

  &:focus {
    outline: none;
  }

  @media (max-width: 840px) {
    width: 100%;
    height: 100dvh;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
`

/**
 * Scroll happens in here, not on `Surface` — keeps the scrollbar inside the
 * rounded corners instead of drawing over them (Surface clips via
 * `overflow: hidden`, this inner layer owns `overflow-y: auto`).
 */
const ScrollArea = styled.div`
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
`

const getFocusableElements = (root: HTMLElement) =>
  Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(element => !element.hasAttribute('aria-hidden'))

export function AnalysisResultModalSurface({
  onClose,
  children,
  ariaLabel = '상권 분석 결과',
}: AnalysisResultModalSurfaceProps) {
  const surfaceRef = useRef<HTMLElement>(null)

  // document.body에 포털링: 사이드바 패널처럼 z-index가 낮은 stacking context
  // 안에서 열리면 SiteHeader(z-index:20) 같은 상위 레이어에 덮이므로, 루트로
  // 포털해 항상 최상단(z-index:100)에 뜨게 한다. SSR/첫 페인트 가드 — mounted가
  // true가 되는 커밋에서 실제 Surface DOM이 생기므로, 아래 포커스 이펙트도
  // mounted를 의존성에 넣어 그 시점에만 surfaceRef를 찾는다.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = requestAnimationFrame(() => {
      const surface = surfaceRef.current
      const closeButton = surface?.querySelector<HTMLElement>(
        `[aria-label="${ariaLabel} 닫기"]`,
      )
      ;(closeButton ?? surface)?.focus()
    })

    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      previousActiveElement?.focus()
    }
  }, [ariaLabel, mounted])

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab' || !surfaceRef.current) return

    const focusable = getFocusableElements(surfaceRef.current)
    if (focusable.length === 0) {
      event.preventDefault()
      surfaceRef.current.focus()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const handleOverlayMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  if (!mounted) return null

  return createPortal(
    <Overlay onMouseDown={handleOverlayMouseDown}>
      <Surface
        ref={surfaceRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <ScrollArea>{children}</ScrollArea>
      </Surface>
    </Overlay>,
    document.body,
  )
}

export default function AnalysisResultModal() {
  const router = useRouter()
  const handleClose = useCallback(() => router.back(), [router])

  return (
    <AnalysisResultModalSurface onClose={handleClose}>
      <AnalysisResultView onClose={handleClose} />
    </AnalysisResultModalSurface>
  )
}
