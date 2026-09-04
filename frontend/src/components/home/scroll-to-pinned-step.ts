'use client'

import { pinnedStepProgress } from '@/components/home/scroll-fill'

/**
 * 스텝 인덱스가 화면 중앙에 오도록 스크롤한다. 계산은 `pinnedStepProgress` 가 하고
 * 여기서는 DOM 읽기와 `window.scrollTo` 만 한다.
 *
 * `behavior: 'smooth'` 는 애니메이션이 끝나기까지 몇 프레임이 걸리고 그동안 활성
 * 스텝이 스크롤 이벤트에 맞춰 점진적으로 갱신된다 — 스토리가 이미 갖고 있던
 * 특성이라 새로 도입하는 결함이 아니다.
 */
export function scrollToPinnedStep(
  el: HTMLElement,
  index: number,
  stepCount: number,
): void {
  const vh = window.innerHeight
  const trackHeight = el.offsetHeight
  const trackTop = el.getBoundingClientRect().top + window.scrollY
  const denom = trackHeight + vh
  const targetProgress = pinnedStepProgress(index, stepCount, trackHeight, vh)
  const target = targetProgress * denom - vh + trackTop
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  window.scrollTo({
    top: Math.max(0, target),
    behavior: reduce ? 'auto' : 'smooth',
  })
}
