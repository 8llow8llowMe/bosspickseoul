import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import StepTabs, {
  STORY_PANEL_ID,
  nextTabIndex,
  storyTabId,
} from '@/components/home/step-tabs'
import { STORY_STEPS } from '@/components/home/story-steps'

describe('nextTabIndex — WAI-ARIA 탭 키보드 (TC-HR-001)', () => {
  it('→ 는 다음 탭, 끝에서는 처음으로 돈다', () => {
    expect(nextTabIndex(0, 'ArrowRight', 4)).toBe(1)
    expect(nextTabIndex(3, 'ArrowRight', 4)).toBe(0)
  })

  it('← 는 이전 탭, 처음에서는 끝으로 돈다', () => {
    expect(nextTabIndex(2, 'ArrowLeft', 4)).toBe(1)
    expect(nextTabIndex(0, 'ArrowLeft', 4)).toBe(3)
  })

  it('Home/End 는 처음/끝', () => {
    expect(nextTabIndex(2, 'Home', 4)).toBe(0)
    expect(nextTabIndex(1, 'End', 4)).toBe(3)
  })

  /* ↑/↓ 는 페이지 스크롤로 남긴다 — 2×2 배치여도 탭 순서는 1차원이다. */
  it('그 밖의 키는 null — 기본 동작을 막지 않는다', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'a']) {
      expect(nextTabIndex(1, key, 4)).toBeNull()
    }
  })

  it('탭이 없으면 null', () => {
    expect(nextTabIndex(0, 'ArrowRight', 0)).toBeNull()
  })
})

describe('StepTabs — 마크업', () => {
  const render = (selected = 0) =>
    renderToStaticMarkup(
      createElement(StepTabs, {
        steps: STORY_STEPS,
        selected,
        figures: ['25개 자치구', '강남구 · 카페', '—', '예시'],
        onSelect: () => undefined,
      }),
    )

  it('tablist 하나와 tab 네 개를 그린다', () => {
    const html = render()

    expect(html.match(/role="tablist"/g)).toHaveLength(1)
    expect(html.match(/role="tab"/g)).toHaveLength(4)
  })

  it('선택된 탭만 aria-selected=true 이고 tabindex=0 이다(roving tabindex)', () => {
    const html = render(2)

    expect(html.match(/aria-selected="true"/g)).toHaveLength(1)
    expect(html).toMatch(
      new RegExp(
        `id="${storyTabId('03')}"[^>]*aria-selected="true"[^>]*tabindex="0"`,
      ),
    )
    expect(html.match(/tabindex="-1"/g)).toHaveLength(3)
  })

  it('모든 탭이 같은 패널을 가리킨다', () => {
    expect(
      render().match(new RegExp(`aria-controls="${STORY_PANEL_ID}"`, 'g')),
    ).toHaveLength(4)
  })

  it('탭에 단계 수치를 싣는다', () => {
    const html = render()

    expect(html).toContain('25개 자치구')
    expect(html).toContain('예시')
  })
})

describe('STORY_STEPS — 탭 데이터 (TC-HR-007)', () => {
  it('네 단계 모두 아이콘이 있다', () => {
    for (const step of STORY_STEPS) expect(step.icon).toBeTruthy()
  })

  it('본문은 해요체로 끝난다', () => {
    for (const step of STORY_STEPS) {
      expect(step.body).toMatch(/요\.$/)
    }
  })

  it('04 만 고른 조건과 무관한 예시라는 note 를 갖는다', () => {
    expect(STORY_STEPS.filter(step => step.note)).toHaveLength(1)
    expect(STORY_STEPS[3].note).toBe('이 단계는 고른 조건과 상관없는 예시예요.')
  })
})
