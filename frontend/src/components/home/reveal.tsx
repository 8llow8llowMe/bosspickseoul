'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import styled from 'styled-components'

const Wrapper = styled.div<{ $visible: boolean; $delay: number }>`
  opacity: ${p => (p.$visible ? 1 : 0)};
  transform: translateY(${p => (p.$visible ? '0' : '12px')});
  transition:
    opacity var(--motion-standard) var(--ease-standard) ${p => p.$delay}ms,
    transform var(--motion-standard) var(--ease-standard) ${p => p.$delay}ms;

  @media (prefers-reduced-motion: reduce) {
    opacity: 1;
    transform: none;
    transition: none;
  }
`

export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Wrapper ref={ref} $visible={visible} $delay={delay} className={className}>
      {children}
    </Wrapper>
  )
}
