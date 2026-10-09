import type { DistrictRecord } from '@/data/districts'
import type { StatusRankedItem } from '@/types/status'

export type StatusMapFeature = {
  readonly districtCode: string
  readonly path: string
  readonly center: {
    readonly x: number
    readonly y: number
  }
}

export type StatusMapLabel = {
  readonly districtCode: string
  readonly districtName: string
  readonly x: number
  readonly y: number
  readonly rank: number | null
  readonly isTopTen: boolean
}

export function createStatusMapLabels(
  items: readonly StatusRankedItem[],
  features: readonly StatusMapFeature[],
  districtRecords: ReadonlyArray<Pick<DistrictRecord, 'gooCode' | 'gooName'>>,
): StatusMapLabel[] {
  const districtNamesByCode = new Map(
    districtRecords.map(record => [String(record.gooCode), record.gooName]),
  )
  const topTenItemsByDistrictCode = new Map<string, StatusRankedItem>()

  for (const item of items.slice(0, 10)) {
    if (!topTenItemsByDistrictCode.has(item.districtCode)) {
      topTenItemsByDistrictCode.set(item.districtCode, item)
    }
  }

  return features.flatMap(feature => {
    const districtName = districtNamesByCode.get(feature.districtCode)

    if (districtName === undefined) return []

    const topTenItem = topTenItemsByDistrictCode.get(feature.districtCode)

    return [
      {
        districtCode: feature.districtCode,
        districtName,
        ...feature.center,
        rank: topTenItem?.rank ?? null,
        isTopTen: Boolean(topTenItem),
      },
    ]
  })
}

export const STATUS_MAP_STEP_COUNT = 5

/**
 * 지도 단계 색. 현재 지표 값으로 구를 **5분위**(같은 개수씩 다섯 묶음)로 나눈다. 1 이 가장 많다.
 *
 * - 구간 폭을 값으로 똑같이 자르지 않는다. 매출은 강남구 하나가 다른 구의 몇 배라, 등간격이면 강남구만
 *   진하고 나머지 24개 구가 가장 옅은 칸에 몰린다. 분위는 25개 구를 다섯 칸에 고르게 펼친다.
 * - 단계는 **값으로** 정한다 — 나보다 값이 큰 구의 수(`higher`)가 n 의 몇 분위인지다. 그래서 같은 값은
 *   늘 같은 단계이고, 응답 `rank` 의 동점(1, 2, 2, 4)과도 맞는다. 25개면 1~5위가 1단계, 21~25위가 5단계다.
 * - 값이 유한수가 아닌 항목은 단계가 없다(회색). 같은 구가 두 번 오면 앞 항목만 쓴다.
 */
export function resolveStatusMapValueSteps(
  items: readonly StatusRankedItem[],
): Map<string, number> {
  const valuesByDistrictCode = new Map<string, number>()

  for (const item of items) {
    if (!Number.isFinite(item.value)) continue
    if (valuesByDistrictCode.has(item.districtCode)) continue
    valuesByDistrictCode.set(item.districtCode, item.value)
  }

  const values = [...valuesByDistrictCode.values()]
  const steps = new Map<string, number>()

  for (const [districtCode, value] of valuesByDistrictCode) {
    const higher = values.filter(other => other > value).length
    steps.set(
      districtCode,
      Math.floor((higher * STATUS_MAP_STEP_COUNT) / values.length) + 1,
    )
  }

  return steps
}

export function findSelectedStatusMapFeature(
  features: readonly StatusMapFeature[],
  districtCode: string | null,
): StatusMapFeature | null {
  return features.find(feature => feature.districtCode === districtCode) ?? null
}

/**
 * 라벨을 어떻게 보일지. `full` = (순위 점 +) 이름 한 줄, `stacked` = 순위 점 위·이름 아래,
 * `badge` = 순위 점만, `hidden` = 숨김.
 *
 * 예전에는 순위 라벨이 겹치면 **다른 자리로 밀어내고** 점선으로 원래 구에 이었다. 충돌
 * 판정 상자가 375px 화면 기준이라 800×620 좌표에서 142×110 이나 돼, 라벨이 이웃 구
 * 몇 칸 너머로 밀려났고 점선은 거의 보이지 않았다(매출 탭에서 「용산구 9」가 관악구
 * 아래, 「중구 7」이 은평구 위에 떴다). 지도에서 위치가 틀리면 지도를 믿을 수 없다.
 *
 * 그래서 라벨은 **폴리곤 중심에서 움직이지 않는다.** 겹치면 옮기는 대신 줄인다:
 * 순위 라벨끼리 겹치면 낮은 순위가 먼저 두 줄로 접어 폭을 줄이고(강남구 옆 송파구),
 * 그래도 겹치면 이름을 빼고 점만 남긴다. 순위 없는 이름이 순위 라벨에 깔리면 이름을
 * 숨긴다. 줄인 정보는 hover 툴팁과 목록이 준다.
 */
export type StatusMapLabelMode = 'full' | 'stacked' | 'badge' | 'hidden'

// 순위 라벨이 자리를 잡을 때 시도하는 순서. 뒤로 갈수록 좁다.
const RANKED_LABEL_MODES = ['full', 'stacked', 'badge'] as const

export type StatusMapLabelTier = {
  /** 이 등급에서 지도가 가질 수 있는 가장 좁은 폭(px). 가장 빡빡한 경우로 판정한다. */
  readonly mapWidthPx: number
  readonly fontSizePx: number
  readonly rankDotPx: number
}

// 지도 뷰포트 폭 460px 이하가 narrow 다(`status-map.tsx` 의 @container 와 짝).
// narrow 의 하한: 가장 좁은 지도는 375px 폰의 시트 무대(375 − 지도 층 안쪽 24 = 351px)이고,
// 지도가 시트 위 자리에 맞춰 줄면 그보다 좁아질 수 있다. 여유를 두고 320px 로 판정한다.
// (1.4 전에는 태블릿 2단의 좌측 열 옆 지도, 약 323px 가 가장 좁았다.)
export const STATUS_MAP_LABEL_BREAKPOINT_PX = 460
export const STATUS_MAP_LABEL_TIERS = {
  narrow: { mapWidthPx: 320, fontSizePx: 9.5, rankDotPx: 13 },
  wide: {
    mapWidthPx: STATUS_MAP_LABEL_BREAKPOINT_PX + 1,
    fontSizePx: 11,
    rankDotPx: 16,
  },
} as const satisfies Record<string, StatusMapLabelTier>

const STATUS_MAP_VIEW_BOX_WIDTH = 800
// 한글 굵은 글자 한 자는 대략 1em 폭이다. 여유를 조금 더 준다.
const LABEL_GLYPH_WIDTH_EM = 1.02
const LABEL_LINE_HEIGHT_EM = 1.25
const RANK_DOT_GAP_PX = 3
const STACKED_ROW_GAP_PX = 1
// 이웃 라벨과 닿을락 말락 하면 읽기 어렵다. 상자 사이에 이만큼은 띄운다.
const LABEL_CLEARANCE_PX = 2

type LabelBox = { cx: number; cy: number; width: number; height: number }

const measureLabel = (
  label: StatusMapLabel,
  mode: Exclude<StatusMapLabelMode, 'hidden'>,
  tier: StatusMapLabelTier,
): LabelBox => {
  const scale = tier.mapWidthPx / STATUS_MAP_VIEW_BOX_WIDTH
  const nameWidth =
    [...label.districtName].length * tier.fontSizePx * LABEL_GLYPH_WIDTH_EM
  const nameHeight = tier.fontSizePx * LABEL_LINE_HEIGHT_EM
  const hasRank = label.rank !== null
  const center = { cx: label.x * scale, cy: label.y * scale }

  if (mode === 'badge') {
    return { ...center, width: tier.rankDotPx, height: tier.rankDotPx }
  }

  if (mode === 'stacked') {
    return {
      ...center,
      width: Math.max(nameWidth, tier.rankDotPx),
      height: nameHeight + tier.rankDotPx + STACKED_ROW_GAP_PX,
    }
  }

  return {
    ...center,
    width: nameWidth + (hasRank ? tier.rankDotPx + RANK_DOT_GAP_PX : 0),
    height: Math.max(nameHeight, hasRank ? tier.rankDotPx : 0),
  }
}

const overlaps = (first: LabelBox, second: LabelBox) =>
  Math.abs(first.cx - second.cx) <
    (first.width + second.width) / 2 + LABEL_CLEARANCE_PX &&
  Math.abs(first.cy - second.cy) <
    (first.height + second.height) / 2 + LABEL_CLEARANCE_PX

/**
 * 한 등급(narrow/wide)에서 라벨마다 보일 모양을 정한다. 결정적이다 — 순위가 높은
 * 라벨부터 자리를 잡고, 순위 없는 이름은 마지막에 빈자리에만 들어간다.
 */
export function resolveStatusMapLabelModes(
  labels: readonly StatusMapLabel[],
  tier: StatusMapLabelTier,
): Map<string, StatusMapLabelMode> {
  const modes = new Map<string, StatusMapLabelMode>()
  const placed: LabelBox[] = []
  const ranked = labels
    .filter(label => label.rank !== null)
    .sort(
      (first, second) =>
        (first.rank ?? 0) - (second.rank ?? 0) ||
        first.districtCode.localeCompare(second.districtCode),
    )

  for (const label of ranked) {
    // 점만으로도 겹치면 점으로 둔다 — 순위 점까지 지우면 순위 구가 지도에서 사라진다.
    const mode =
      RANKED_LABEL_MODES.find(candidate => {
        const box = measureLabel(label, candidate, tier)
        return !placed.some(other => overlaps(box, other))
      }) ?? 'badge'

    modes.set(label.districtCode, mode)
    placed.push(measureLabel(label, mode, tier))
  }

  for (const label of labels) {
    if (label.rank !== null) continue

    const box = measureLabel(label, 'full', tier)
    const fits = !placed.some(other => overlaps(box, other))

    modes.set(label.districtCode, fits ? 'full' : 'hidden')
    if (fits) placed.push(box)
  }

  return modes
}
