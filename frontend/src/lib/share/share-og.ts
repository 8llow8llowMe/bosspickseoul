/**
 * `/s/{shareCode}/opengraph-image` 의 **카드 모델**(share.md D4-2, #598). 순수 함수만 둔다.
 *
 * 카카오톡·슬랙 미리보기에서 가장 큰 영역은 이미지다. 제목·설명(#572)과 같은 상권·업종·분기에
 * 핵심 지표(점포당 월 매출·점포 수)를 얹는다. 네트워크는 `share-og.server.ts` 가 맡는다.
 *
 * **카드를 못 만들면 null** 이고, 이미지 라우트는 루트 OG 이미지(심볼)로 떨어진다.
 * - 지원 유형은 상권분석·AI 리포트뿐이다. 둘만 payload 에 기준 분기가 있어 지표를 하나로 정할 수 있다.
 *   비교는 분기가 없고(`CommercialComparisonPayload`), 행정동 탐색은 업종이 없다.
 * - 상권 이름이나 지표가 하나도 없으면 null — 「데이터 없음」만 큰 글씨로 박힌 카드는 심볼보다 못하다.
 * - **폰트에 없는 글자가 하나라도 있으면 null.** OG 폰트는 KS X 1001 서브셋(2,566자)이다. 없는
 *   글자를 satori 가 빈칸으로 그리거나 외부 폰트를 내려받게 두지 않는다 — 틀린 상권명을 보이는 것보다
 *   심볼 카드가 낫다.
 */

import {
  formatKoreanMoney,
  formatPeriodCode,
} from '@/lib/analysis/presentation'
import { resolveMonthlySalesPerStore } from '@/lib/analysis/summary-sales'
import type { CommercialBenchmark } from '@/types/commercial-analysis'
import type { ServerShareResolution } from './share-preview'
import { findShareServiceName } from './share-preview'

/**
 * 이미지 응답 캐시 헤더. 카드는 브라우저 1시간·공유 캐시(nginx·플랫폼 프록시) 하루, 폴백은 5분이다 —
 * 백엔드가 잠깐 실패한 순간의 심볼 이미지가 오래 남지 않게 한다. 지표 데이터 캐시(하루)와 맞췄다.
 */
export const SHARE_OG_CARD_CACHE_CONTROL =
  'public, max-age=3600, s-maxage=86400'
export const SHARE_OG_FALLBACK_CACHE_CONTROL = 'public, max-age=300'

export type ShareOgMetric = { label: string; value: string }

export type ShareOgCard = {
  /** 「상권분석」·「AI 리포트」 */
  kind: string
  /** 「2025년 2분기」. 형식이 틀리면 null. */
  period: string | null
  /** 상권 이름 */
  title: string
  /** 「종로구 청운효자동 · 커피-음료」. 하나도 없으면 null. */
  subtitle: string | null
  /** 1~2개 */
  metrics: ShareOgMetric[]
}

/** 지표를 그릴 수 있는 공유 유형. 이 밖은 기본 이미지다. */
const SUPPORTED_SHARE_TYPES = {
  COMMERCIAL_ANALYSIS: '상권분석',
  AI_REPORT: 'AI 리포트',
} as const

type SupportedShareType = keyof typeof SUPPORTED_SHARE_TYPES

const isSupportedShareType = (
  value: string | null,
): value is SupportedShareType =>
  value !== null &&
  Object.prototype.hasOwnProperty.call(SUPPORTED_SHARE_TYPES, value)

/** 지표 조회에 쓸 코드. 지원 유형이 아니거나 코드가 빠지면 null. */
export type ShareOgLookup = {
  shareType: SupportedShareType
  commercialCode: string
  serviceCode: string
  periodCode: string
}

const readCode = (payload: Record<string, unknown>, key: string) => {
  const value = payload[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export const readShareOgLookup = (
  resolution: ServerShareResolution,
): ShareOgLookup | null => {
  if (!resolution.ok || !isSupportedShareType(resolution.shareType)) return null
  const { payload } = resolution
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    return null

  const record = payload as Record<string, unknown>
  const commercialCode = readCode(record, 'commercialCode')
  const serviceCode = readCode(record, 'serviceCode')
  const periodCode = readCode(record, 'periodCode')
  if (!commercialCode || !serviceCode || !periodCode) return null
  if (!/^\d{4}[1-4]$/.test(periodCode)) return null

  return {
    shareType: resolution.shareType,
    commercialCode,
    serviceCode,
    periodCode,
  }
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const trimmed = (value: string | null | undefined): string | null =>
  value?.trim() ? value.trim() : null

/**
 * 점포당 월 매출과 점포 수. 요약 카드(`summary-sales.ts`)와 같은 규칙이다 — 점포 0 이면
 * 점포당 값을 적지 않는다(0 원이 아니라 나눌 수 없다).
 */
const buildMetrics = (benchmark: CommercialBenchmark): ShareOgMetric[] => {
  const perStore = benchmark.salesPerStore?.commercial ?? null
  const storeCount = perStore?.storeCount
  const salesPerStore = resolveMonthlySalesPerStore({
    monthlySalesPerStore: perStore?.monthlySalesPerStore,
    monthlySales:
      perStore?.monthlySalesAmount ??
      benchmark.salesSummary?.commercial?.monthlySalesAmount,
    storeCount,
  })

  const metrics: ShareOgMetric[] = []
  if (salesPerStore !== null && salesPerStore > 0) {
    metrics.push({
      label: '점포당 월 매출',
      value: `약 ${formatKoreanMoney(salesPerStore)}`,
    })
  }
  if (isFiniteNumber(storeCount) && storeCount > 0) {
    metrics.push({
      label: '같은 업종 점포',
      value: `${storeCount.toLocaleString('ko-KR')}개`,
    })
  }
  return metrics
}

const cardTexts = (card: ShareOgCard): string[] => [
  card.kind,
  card.period ?? '',
  card.title,
  card.subtitle ?? '',
  ...card.metrics.flatMap(metric => [metric.label, metric.value]),
]

/** 카드의 모든 글자가 폰트에 있는가. 공백·줄바꿈은 폰트와 무관하다. */
export const isCardRenderable = (
  card: ShareOgCard,
  hasGlyph: (char: string) => boolean,
): boolean =>
  cardTexts(card).every(text =>
    Array.from(text).every(char => /\s/.test(char) || hasGlyph(char)),
  )

/**
 * 원천에서 글자가 깨진 이름. 백엔드 행정동명 일부에 `·` 자리가 `?` 로 들어온다
 * (`종로1?2?3?4가동`, pretendard-subset.md 「BE 후속 요청」 1). `?` 는 폰트에 있어 그대로 그려지므로
 * 따로 거른다. 지역 이름에 `?` 가 정상으로 들어갈 일은 없다.
 */
const hasBrokenCharacter = (name: string): boolean => name.includes('?')

/**
 * 카드 모델을 만든다. 이름은 `/benchmarks` 응답에 함께 오므로 따로 조회하지 않는다.
 * 업종 이름은 응답에 없으면 정적 카탈로그(`findShareServiceName`)로 채운다.
 */
export const buildShareOgCard = (
  lookup: ShareOgLookup,
  benchmark: CommercialBenchmark | null,
  hasGlyph: (char: string) => boolean,
): ShareOgCard | null => {
  if (!benchmark) return null
  const title = trimmed(benchmark.commercialName)
  if (!title || hasBrokenCharacter(title)) return null

  const metrics = buildMetrics(benchmark)
  if (metrics.length === 0) return null

  const serviceName =
    trimmed(benchmark.salesPerStore?.serviceName) ??
    findShareServiceName(lookup.serviceCode)
  const area = [
    trimmed(benchmark.districtName),
    trimmed(benchmark.administrationName),
  ]
    .filter(
      (name): name is string => name !== null && !hasBrokenCharacter(name),
    )
    .join(' ')
  const subtitle = [area || null, serviceName].filter(Boolean).join(' · ')

  const card: ShareOgCard = {
    kind: SUPPORTED_SHARE_TYPES[lookup.shareType],
    period: formatPeriodCode(lookup.periodCode),
    title,
    subtitle: subtitle || null,
    metrics,
  }
  return isCardRenderable(card, hasGlyph) ? card : null
}

/** `charset.txt` 내용으로 글자 판정 함수를 만든다. */
export const createGlyphChecker = (charset: string) => {
  const glyphs = new Set(Array.from(charset))
  return (char: string) => glyphs.has(char)
}
