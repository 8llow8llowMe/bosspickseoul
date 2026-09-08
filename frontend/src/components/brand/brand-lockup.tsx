import styled from 'styled-components'

import BrandMark, { type BrandMarkTone } from '@/components/brand/brand-mark'

/**
 * 심볼 + 워드마크 락업.
 *
 * 심볼 단독으로는 락업이 성립하지 않는다 — 격자 심볼의 비례가 0.559 라
 * 텍스트 높이에 맞추면 폭 15px 의 조각이 되어 장식 불릿처럼 보인다.
 * 정사각 컨테이너가 그 문제를 해결한다(브라우저 실측으로 확인).
 *
 * 워드마크는 `BossPick` 700 + `Seoul` 400 으로 무게를 나눈다. 13자를 전부
 * 700 으로 두면 헤더에서 덩어리로 뭉친다.
 */

export type BrandLockupProps = {
  orientation?: 'horizontal' | 'vertical'
  /** 정사각 컨테이너의 변 길이(px). */
  markHeight?: number
  wordmarkSize?: number
  tone?: BrandMarkTone
}

const Root = styled.span<{ $vertical: boolean; $gap: number }>`
  display: inline-flex;
  flex-direction: ${props => (props.$vertical ? 'column' : 'row')};
  align-items: center;
  gap: ${props => props.$gap}px;
`

const Wordmark = styled.span<{ $size: number; $inverse: boolean }>`
  color: ${props => (props.$inverse ? '#ffffff' : 'var(--color-text-900)')};
  font-size: ${props => props.$size}px;
  /* 푸터 크기 15px 에서 22.105... 가 나오므로 반올림한다. 19→28, 38→56 은 그대로다. */
  line-height: ${props => Math.round((props.$size * 28) / 19)}px;
  letter-spacing: -0.01em;
  white-space: nowrap;
`

const Strong = styled.span`
  font-weight: 700;
`

const Regular = styled.span`
  font-weight: 400;
`

export default function BrandLockup({
  orientation = 'horizontal',
  markHeight = 32,
  wordmarkSize = 19,
  tone = 'ink',
}: BrandLockupProps) {
  return (
    <Root $vertical={orientation === 'vertical'} $gap={markHeight * 0.25}>
      <BrandMark height={markHeight} container tone={tone} />
      <Wordmark $size={wordmarkSize} $inverse={tone === 'inverse'}>
        <Strong>BossPick</Strong>
        <Regular>Seoul</Regular>
      </Wordmark>
    </Root>
  )
}
