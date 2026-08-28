'use client'

import styled from 'styled-components'

import {
  getScoreQualityColor,
  getScoreQualityLabel,
  resolveScoreQuality,
  type MetricPolarity,
} from '@/lib/recommend/metric-polarity'

/**
 * 값 하나짜리 점수 게이지.
 *
 * `analysis/charts/donut-chart.tsx` 를 재사용하지 않는다 — 그건 recharts 기반의
 * **구성비** 차트라 툴팁·범례·세그먼트 배열을 전제한다. 여기 필요한 건 값 하나이고
 * 결과 카드 안에 여러 개가 촘촘히 들어가므로 의존성 없는 인라인 SVG 로 그린다.
 *
 * **호가 채우는 양은 점수 그대로다.** 위험도 100 의 호는 가득 차되 색은 빨강이다.
 * 호까지 뒤집으면 가운데 숫자(100)와 그림이 어긋난다. 방향은 **색만** 뒤집는다.
 */

export type ScoreGaugeSize = 'sm' | 'lg'

export type ScoreGaugeProps = {
  /**
   * `null` 이면 게이지를 그리지 않는다 — 산정 실패(`compositeScore: null`)를
   * 0점짜리 빈 도넛으로 그리면 「점수가 0」이라고 거짓말한다. 호출부가 기존
   * 「데이터 없음」 표기를 그대로 쓰게 둔다.
   */
  score: number | null
  /** 방향을 모르면 `null` — 색으로 판단하지 않고 중립색으로 둔다. */
  polarity: MetricPolarity | null
  /** 「기회도」처럼 이 점수가 무엇인지. 스크린리더 문구에 들어간다. */
  label: string
  size?: ScoreGaugeSize
}

type Geometry = {
  box: number
  radius: number
  strokeWidth: number
  fontSize: number
}

const GEOMETRY: Readonly<Record<ScoreGaugeSize, Geometry>> = {
  sm: { box: 34, radius: 14, strokeWidth: 4, fontSize: 11 },
  lg: { box: 60, radius: 25, strokeWidth: 6, fontSize: 19 },
}

const Figure = styled.span<{ $box: number }>`
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  width: ${({ $box }) => $box}px;
  height: ${({ $box }) => $box}px;
`

const Svg = styled.svg`
  display: block;
  /* 0점에서 12시부터 그리기 시작한다. 기본 SVG 원은 3시에서 시작한다. */
  transform: rotate(-90deg);
`

/*
 * 트랙(빈 부분)은 등급색을 옅게 깐 것이다. **색의 농담으로 점수를 표현하지 않는다** —
 * 점수가 낮을수록 흐려지면 정작 나쁜 점수가 안 보인다. 점수를 말하는 것은 호의 길이다.
 */
const Track = styled.circle`
  fill: none;
  stroke: color-mix(in srgb, currentColor 16%, transparent);
`

const Arc = styled.circle`
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
`

/**
 * 가운데 숫자는 장식이 아니라 **요건**이다. DESIGN.md §Score Scale 이
 * 「색상만 의존하지 말고 명도 차 + 숫자 라벨도 함께 표시한다(컬러 블라인드 대응)」를
 * 요구한다.
 */
const Value = styled.span<{ $fontSize: number }>`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-900);
  font-size: ${({ $fontSize }) => $fontSize}px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
`

export default function ScoreGauge({
  score,
  polarity,
  label,
  size = 'sm',
}: ScoreGaugeProps) {
  if (score === null || !Number.isFinite(score)) return null

  const { box, radius, strokeWidth, fontSize } = GEOMETRY[size]
  const quality = resolveScoreQuality(score, polarity)
  const qualityLabel = getScoreQualityLabel(quality)
  const rounded = Math.round(score)
  const filled = Math.min(Math.max(score, 0), 100) / 100
  const circumference = 2 * Math.PI * radius
  const center = box / 2

  return (
    <Figure
      $box={box}
      data-score-gauge="true"
      data-score-quality={quality}
      style={{ color: getScoreQualityColor(quality) }}
    >
      <Svg
        aria-label={
          qualityLabel
            ? `${label} ${rounded}점, ${qualityLabel}`
            : `${label} ${rounded}점`
        }
        height={box}
        role="img"
        viewBox={`0 0 ${box} ${box}`}
        width={box}
      >
        <Track cx={center} cy={center} r={radius} strokeWidth={strokeWidth} />
        <Arc
          cx={center}
          cy={center}
          r={radius}
          strokeDasharray={`${circumference * filled} ${circumference}`}
          strokeWidth={strokeWidth}
        />
      </Svg>
      <Value $fontSize={fontSize} aria-hidden="true">
        {rounded}
      </Value>
    </Figure>
  )
}
