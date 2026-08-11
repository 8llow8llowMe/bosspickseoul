// src/components/home/anchor-statement.tsx
'use client'

import { useRef } from 'react'
import styled from 'styled-components'
import { filledWordCount } from '@/components/home/scroll-fill'
import { useScrollProgress } from '@/components/home/use-scroll-progress'

const ANCHOR_COPY =
  '감에 의존하지 마세요. AI 에이전트가 방대한 데이터를 분석해 오직 당신만을 위한 맞춤형 리포트를 완성합니다.'
const WORDS = ANCHOR_COPY.split(' ')
const FILL_GAIN = 1.7

const Section = styled.section`
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 96px 20px;

  @media (max-width: 640px) {
    min-height: auto;
    padding: 96px 16px;
  }
`

const Statement = styled.p`
  width: min(880px, 100%);
  margin: 0;
  text-align: center;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.5;
  letter-spacing: -0.01em;
  word-break: keep-all;

  @media (max-width: 640px) {
    font-size: 24px;
  }
`

const Word = styled.span<{ $filled: boolean }>`
  color: ${p => (p.$filled ? 'var(--color-text-900)' : 'var(--color-border-200)')};
  transition: color var(--motion-standard) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export default function AnchorStatement() {
  const ref = useRef<HTMLParagraphElement | null>(null)
  const progress = useScrollProgress(ref)
  const filled = filledWordCount(progress * FILL_GAIN, WORDS.length)

  return (
    <Section>
      <Statement ref={ref}>
        {WORDS.map((word, index) => (
          <Word key={`${word}-${index}`} $filled={index < filled}>
            {word}
            {index < WORDS.length - 1 ? ' ' : ''}
          </Word>
        ))}
      </Statement>
    </Section>
  )
}
