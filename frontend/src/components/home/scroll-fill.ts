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
