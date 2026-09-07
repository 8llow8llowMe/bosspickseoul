function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function viewportProgress(
  top: number,
  elementHeight: number,
  viewportHeight: number,
): number {
  const total = elementHeight + viewportHeight
  if (total <= 0) return 0
  const scrolled = viewportHeight - top
  return clamp01(scrolled / total)
}

export function filledWordCount(progress: number, total: number): number {
  return Math.round(clamp01(progress) * total)
}

export function activeStepFromProgress(
  progress: number,
  stepCount: number,
): number {
  if (stepCount <= 0) return 0
  const p = Math.min(0.999999, Math.max(0, progress))
  return Math.min(stepCount - 1, Math.floor(p * stepCount))
}

/**
 * 스티키가 실제로 pin 되는 progress 구간 `[vh/(H+vh), H/(H+vh)]`.
 *
 * progress 정의는 `viewportProgress` 와 같다: (vh - top) / (H + vh). 트랙이 화면에
 * 들어오기 시작할 때 이미 progress 가 0 이 아니고, 다 지나가기 전에 1 에 닿지도 않는다 —
 * **스텝이 실제로 보이는 구간은 그 사이뿐**이다.
 */
/**
 * 스티키가 pin 되는 구간을 기준으로 **등장 / 채우기** 두 단계를 낸다.
 *
 * 왜 필요한가: 이 두 단계를 progress 상수(0.12·0.16·0.86)로 못박아 두면 **트랙 높이가
 * 바뀔 때마다 어긋난다.** 실제로 어긋나 있었다 — 트랙 200dvh 에서 pin 구간은
 * 0.333~0.667 인데 채우기는 0.16 에 시작해 0.86 에 끝났다. 즉 **글이 화면 가운데로
 * 오기도 전에 칠해지기 시작했고, 다 칠해지기 전에 이미 위로 밀려 올라갔다.**
 *
 * - `enter` — 트랙 시작부터 pin 이 걸리는 순간까지 0 → 1. **1 이 되는 시점이 곧 글이
 *   화면 가운데 멈추는 시점**이다.
 * - `fill` — pin 구간 안에서만 0 → 1. `fillPortion` 만큼 쓰고 남은 뒤쪽은 **다 칠해진
 *   문장을 그대로 두는 시간**이다. 그 뒤에 pin 이 풀리며 위로 흘러간다.
 */
export function pinnedPhase(
  progress: number,
  trackHeight: number,
  viewportHeight: number,
  fillPortion = 0.8,
): { enter: number; fill: number } {
  const pin = pinWindow(trackHeight, viewportHeight)
  // 아직 측정 전이거나 트랙이 뷰포트보다 짧으면 pin 구간이 없다 — 진행도를 그대로 쓴다.
  if (!pin) return { enter: clamp01(progress), fill: clamp01(progress) }

  const enter = clamp01(progress / pin.start)
  const local = (progress - pin.start) / pin.span
  const span = Math.max(0.0001, fillPortion)

  return { enter, fill: clamp01(local / span) }
}

function pinWindow(
  trackHeight: number,
  viewportHeight: number,
): { start: number; span: number } | null {
  const denom = trackHeight + viewportHeight
  if (denom <= 0) return null

  const start = viewportHeight / denom
  const span = trackHeight / denom - start
  return span > 0 ? { start, span } : null
}

/**
 * **pin 구간 안에서** 진행도를 스텝으로 나눈다.
 *
 * `activeStepFromProgress` 를 그대로 쓰면 안 되는 이유: 그 함수는 progress 0~1 전체를
 * 스텝 수로 나누는데, 스텝이 보이는 구간은 pin 구간뿐이라 **첫 스텝과 마지막 스텝이
 * 극단적으로 짧아진다.**
 *
 * 랭킹 섹션(H=3240, vh=1080)의 실측이 그랬다 — pin 구간이 progress 0.25~0.75 인데
 * 지표 경계는 0.333·0.667 이라 유동인구는 0.25~0.333(스크롤 360px), 매출은
 * 0.333~0.667(1,440px), 개업은 0.667~0.75(360px)를 받았다. 스크롤해서 섹션에 닿는
 * 순간 이미 매출로 넘어가 있어 **첫 지표를 볼 수 없었다.**
 *
 * pin 구간을 0~1 로 다시 펴서 나누면 세 지표가 각각 720px 씩 균등하게 받는다.
 * 스토리(4스텝)와 랭킹(3지표)이 같은 함수를 공유한다.
 */
export function activeStepFromPinnedProgress(
  progress: number,
  stepCount: number,
  trackHeight: number,
  viewportHeight: number,
): number {
  const pin = pinWindow(trackHeight, viewportHeight)
  // 트랙이 뷰포트보다 짧으면 pin 구간이 없다 — 전체 구간으로 나누는 수밖에 없다.
  if (!pin) return activeStepFromProgress(progress, stepCount)

  return activeStepFromProgress((progress - pin.start) / pin.span, stepCount)
}

/**
 * 스텝 중앙으로 가는 목표 progress. **`activeStepFromPinnedProgress` 의 역함수다** —
 * 둘이 어긋나면 지표를 눌렀을 때 다른 지표가 선택된 자리로 스크롤된다.
 *
 * 스토리(4스텝)와 랭킹 섹션(3지표)이 **같은 공식을 공유**한다 — 두 곳에서 따로
 * 계산하면 한쪽만 고쳐지는 사고가 난다.
 */
export function pinnedStepProgress(
  index: number,
  stepCount: number,
  trackHeight: number,
  viewportHeight: number,
  margin = 0.02,
): number {
  const pin = pinWindow(trackHeight, viewportHeight)
  if (!pin || stepCount <= 0) return 0

  // pin 구간 안에서의 스텝 중앙 → 전체 progress 로 되돌린다.
  const center = pin.start + ((index + 0.5) / stepCount) * pin.span
  const pinEnd = pin.start + pin.span

  return Math.min(pinEnd - margin, Math.max(pin.start + margin, center))
}
