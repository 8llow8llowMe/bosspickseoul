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

  /*
   * story-panel-redesign D4-1: 탭은 번호와 이름만 싣는다. 수치는 패널 왼쪽의 큰 숫자가
   * 맡는다 — 탭과 패널이 같은 수치를 두 번 말하던 것을 없앴다.
   */
  it('탭에 아이콘·수치를 싣지 않는다 (TC-SP-001)', () => {
    const html = render()

    expect(html).not.toContain('<svg')
    expect(html).not.toContain('개 자치구')
  })

  it('탭 이름은 번호와 단계명 전체이고, 좁은 화면용 짧은 이름도 그린다 (TC-SP-001)', () => {
    const html = render()

    for (const step of STORY_STEPS) {
      expect(html).toContain(`aria-label="${step.step} ${step.title}"`)
      expect(html).toContain(`>${step.shortTitle}</span>`)
    }
  })
})

describe('STORY_STEPS — 탭 데이터 (TC-HR-007 · TC-SP-004)', () => {
  it('아이콘 필드가 없고 짧은 이름이 있다', () => {
    for (const step of STORY_STEPS) {
      expect('icon' in step).toBe(false)
      expect(step.shortTitle.length).toBeGreaterThan(0)
    }
  })

  /* 02 도 CTA 를 갖는다 — 미니데모 안에 있던 버튼을 패널 왼쪽으로 옮겼다(D4-2). */
  it('네 단계 모두 자기 도구로 가는 CTA 를 갖는다', () => {
    expect(STORY_STEPS.map(step => step.cta.href)).toEqual([
      '/status',
      '/analysis',
      '/recommend',
      '/simulation',
    ])
  })

  /* AI 리포트는 분석의 산출물이라 02 단계에 둔다(story-and-rankings — 벤토에서 옮겨 왔다). */
  it('02 단계 제목이 AI 리포트를 명시한다', () => {
    expect(STORY_STEPS[1].title).toBe('상권 분석 · AI 리포트')
  })

  it('보드 전용이던 tool 필드가 없다', () => {
    for (const step of STORY_STEPS) expect('tool' in step).toBe(false)
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
