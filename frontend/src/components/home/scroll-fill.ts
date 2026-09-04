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
 * 스텝 중앙 목표를 스티키가 실제로 pin 되는 progress 구간으로 클램프한다.
 *
 * progress 정의는 `viewportProgress` 와 같다: (vh - top) / (H + vh).
 * pin 구간은 [vh/(H+vh), H/(H+vh)] 이므로 그 밖으로 나가면 트랙 위/아래로 튄다.
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
  const denom = trackHeight + viewportHeight
  if (denom <= 0 || stepCount <= 0) return 0

  const pinStart = viewportHeight / denom
  const pinEnd = trackHeight / denom
  const center = (index + 0.5) / stepCount

  return Math.min(pinEnd - margin, Math.max(pinStart + margin, center))
}
