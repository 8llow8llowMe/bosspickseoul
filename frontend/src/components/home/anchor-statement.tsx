'use client'

import { useRef } from 'react'
import styled from 'styled-components'
import { filledWordCount } from '@/components/home/scroll-fill'
import { useScrollProgress } from '@/components/home/use-scroll-progress'

/*
  카피 규칙(home.md S2 #3): 「구체·직설·전문 보이스 — 수식어 최소, 지표·동사 중심,
  AI 상투구·과장 배제」. 이전 문구는 「방대한 데이터」·「오직 당신만을 위한 맞춤형」으로
  그 규칙이 배제 대상으로 지목한 표현을 그대로 썼다. 무엇을 보는지(지표)를 적는다.
*/
const ANCHOR_COPY =
  '감이 아니라 숫자로 정합니다. 매출·유동인구·경쟁 강도를 업종별로 봅니다.'
const WORDS = ANCHOR_COPY.split(' ')

// 트랙 진행도(0~1)를 구간별로 매핑한다.
// 0~ENTER_END: 아래에서 올라오며 등장 / FILL_START~FILL_END: 가운데 고정된 채 채우기 / 이후: 채워진 채 위로 퇴장
// 트랙이 220 → 150dvh 로 줄어 핀 구간이 짧아졌다. 같은 비율을 그대로 두면 채우기가
// 순식간에 끝나 효과가 보이지 않는다. 등장을 앞당기고 채우기를 넓게 편다.
const ENTER_END = 0.18
const FILL_START = 0.24
const FILL_END = 0.72

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/*
  트랙 220dvh → 150dvh (모바일 200 → 140).

  이 구간은 홈에서 가장 비싼 스크롤(2.2 화면)인데 문장 하나를 나르고 누를 것이 없었다.
  절반으로 줄인다. 100dvh 까지 줄이지 않는 이유는 sticky 핀 구간이 0 이 되어 단어
  채우기 효과가 아예 돌지 않기 때문이다 — 남는 50dvh 가 등장·채우기·퇴장을 담는다.
*/
const Track = styled.div`
  height: 150dvh;

  @media (max-width: 640px) {
    height: 140dvh;
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

  @media (max-width: 768px) {
    padding: 72px 20px;
  }

  @media (max-width: 640px) {
    padding: 56px 16px;
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
  word-break: keep-all;
  will-change: transform, opacity;

  @media (max-width: 768px) {
    font-size: 28px;
  }

  @media (max-width: 640px) {
    font-size: 24px;
  }

  @media (max-width: 480px) {
    font-size: 21px;
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
