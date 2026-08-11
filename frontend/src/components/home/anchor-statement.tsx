'use client'

import { useRef } from 'react'
import styled from 'styled-components'
import { filledWordCount } from '@/components/home/scroll-fill'
import { useScrollProgress } from '@/components/home/use-scroll-progress'

const ANCHOR_COPY =
  '감에 의존하지 마세요. AI 에이전트가 방대한 데이터를 분석해 오직 당신만을 위한 맞춤형 리포트를 완성합니다.'
const WORDS = ANCHOR_COPY.split(' ')

// 트랙 진행도(0~1)를 구간별로 매핑한다.
// 0~ENTER_END: 아래에서 올라오며 등장 / FILL_START~FILL_END: 가운데 고정된 채 채우기 / 이후: 채워진 채 위로 퇴장
const ENTER_END = 0.26
const FILL_START = 0.34
const FILL_END = 0.6

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

const Track = styled.div`
  height: 220dvh;

  @media (max-width: 640px) {
    height: 200dvh;
  }

  @media (prefers-reduced-motion: reduce) {
    height: auto;
  }
`

const Sticky = styled.div`
  position: sticky;
  top: 0;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 96px 20px;

  @media (max-width: 640px) {
    padding: 96px 16px;
  }

  @media (prefers-reduced-motion: reduce) {
    position: static;
    min-height: auto;
    padding: 120px 20px;
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
  will-change: transform, opacity;

  @media (max-width: 640px) {
    font-size: 24px;
  }
`

const Word = styled.span<{ $filled: boolean }>`
  color: ${p =>
    p.$filled ? 'var(--color-text-900)' : 'var(--color-border-200)'};
  transition: color var(--motion-standard) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export default function AnchorStatement() {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const progress = useScrollProgress(trackRef)

  const enter = clamp01(progress / ENTER_END)
  const fill = clamp01((progress - FILL_START) / (FILL_END - FILL_START))
  const filled = filledWordCount(fill, WORDS.length)

  return (
    <Track ref={trackRef}>
      <Sticky>
        <Statement
          style={{
            opacity: enter,
            transform: `translateY(${(1 - enter) * 36}px)`,
          }}
        >
          {WORDS.map((word, index) => (
            <Word key={`${word}-${index}`} $filled={index < filled}>
              {word}
              {index < WORDS.length - 1 ? ' ' : ''}
            </Word>
          ))}
        </Statement>
      </Sticky>
    </Track>
  )
}
