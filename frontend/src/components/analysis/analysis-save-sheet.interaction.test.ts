// @vitest-environment jsdom
import { createElement, useState } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AnalysisSaveSheet, {
  type AnalysisSaveOptionKey,
} from '@/components/analysis/analysis-save-sheet'

/*
  상권분석 결과 「저장」 시트(#563, D-2). 포커스 가두기 · Esc · 포커스 복귀 · 두 북마크 토글 상태를
  실제 DOM 에서 잠근다.
*/

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

const flushFrames = async (count = 2) => {
  for (let index = 0; index < count; index += 1) {
    await act(async () => {
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    })
  }
}

/** 트리거로 열고, 항목을 누르면 그 북마크의 저장 여부를 뒤집는 하네스. */
function Harness({
  requiresLogin = false,
  onToggle,
  pending = {},
  disabled = {},
}: {
  requiresLogin?: boolean
  onToggle?: (key: AnalysisSaveOptionKey) => void
  pending?: Partial<Record<AnalysisSaveOptionKey, boolean>>
  disabled?: Partial<Record<AnalysisSaveOptionKey, boolean>>
}) {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState({ analysis: false, commercial: true })

  return createElement(
    'div',
    null,
    createElement(
      'button',
      { type: 'button', onClick: () => setOpen(true) },
      '저장',
    ),
    createElement(AnalysisSaveSheet, {
      open,
      requiresLogin,
      onClose: () => setOpen(false),
      onToggle: key => {
        onToggle?.(key)
        setSaved(current => ({ ...current, [key]: !current[key] }))
      },
      options: [
        {
          key: 'analysis',
          title: '이 분석 화면 저장',
          description:
            '업종·분기·보던 항목까지 지금 화면을 그대로 보관함에 남겨요.',
          saved: saved.analysis,
          pending: pending.analysis ?? false,
          disabled: disabled.analysis,
        },
        {
          key: 'commercial',
          title: '관심 상권으로 저장',
          description: '업종과 분기 없이 이 상권만 관심 상권 목록에 남겨요.',
          saved: saved.commercial,
          pending: pending.commercial ?? false,
          disabled: disabled.commercial,
        },
      ],
    }),
  )
}

const dialog = () => document.body.querySelector<HTMLElement>('[role="dialog"]')
const option = (key: AnalysisSaveOptionKey) =>
  document.body.querySelector<HTMLButtonElement>(`[data-save-option="${key}"]`)!
const closeButton = () =>
  document.body.querySelector<HTMLButtonElement>(
    'button[aria-label="저장 창 닫기"]',
  )!

const openHarness = async (props: Parameters<typeof Harness>[0] = {}) => {
  render(createElement(Harness, props))
  const trigger = Array.from(document.body.querySelectorAll('button')).find(
    item => item.textContent === '저장',
  )!
  trigger.focus()
  fireEvent.click(trigger)
  await flushFrames()
  return trigger
}

describe('AnalysisSaveSheet', () => {
  it('modal dialog 로 열고 제목·설명을 잇는다. 첫 포커스는 첫 저장 항목이다', async () => {
    await openHarness()
    const panel = dialog()!

    expect(panel.getAttribute('aria-modal')).toBe('true')
    expect(
      document.getElementById(panel.getAttribute('aria-labelledby')!)
        ?.textContent,
    ).toBe('무엇을 저장할까요?')
    expect(document.activeElement).toBe(option('analysis'))
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('두 항목의 저장 여부를 aria-pressed 와 글자로 보이고, 누르면 그 자리에서 뒤집힌다', async () => {
    const onToggle = vi.fn()
    await openHarness({ onToggle })

    expect(option('analysis').getAttribute('aria-pressed')).toBe('false')
    expect(option('analysis').textContent).toContain('저장하기')
    expect(option('commercial').getAttribute('aria-pressed')).toBe('true')
    expect(option('commercial').textContent).toContain('저장됨')

    fireEvent.click(option('analysis'))
    expect(onToggle).toHaveBeenLastCalledWith('analysis')
    expect(option('analysis').getAttribute('aria-pressed')).toBe('true')
    expect(option('analysis').textContent).toContain('저장됨')
    // 시트는 닫히지 않는다 — 두 가지를 다 저장하려는 사람이 다시 열지 않게.
    expect(dialog()).not.toBeNull()

    fireEvent.click(option('commercial'))
    expect(onToggle).toHaveBeenLastCalledWith('commercial')
    expect(option('commercial').getAttribute('aria-pressed')).toBe('false')
  })

  it('항목 설명을 aria-describedby 로 잇는다', async () => {
    await openHarness()
    const describedBy = option('commercial').getAttribute('aria-describedby')!

    expect(document.getElementById(describedBy)?.textContent).toBe(
      '업종과 분기 없이 이 상권만 관심 상권 목록에 남겨요.',
    )
  })

  it('Tab 은 시트 안을 돈다(포커스 가두기)', async () => {
    await openHarness()
    const panel = dialog()!

    // 순서: 닫기 → 분석 화면 → 관심 상권. 첫 포커스는 분석 화면이다.
    fireEvent.keyDown(panel, { key: 'Tab' })
    expect(document.activeElement).toBe(option('commercial'))
    fireEvent.keyDown(panel, { key: 'Tab' })
    expect(document.activeElement).toBe(closeButton())
    fireEvent.keyDown(panel, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(option('commercial'))
  })

  it('Esc 로 닫고 「저장」 버튼으로 포커스를 돌려준다', async () => {
    const trigger = await openHarness()

    fireEvent.keyDown(dialog()!, { key: 'Escape' })

    expect(dialog()).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(document.body.style.overflow).toBe('')
  })

  it('닫기 버튼·바깥 누름도 닫는다', async () => {
    const trigger = await openHarness()
    fireEvent.click(closeButton())
    expect(dialog()).toBeNull()
    expect(document.activeElement).toBe(trigger)

    fireEvent.click(trigger)
    await flushFrames()
    fireEvent.mouseDown(dialog()!.parentElement!)
    expect(dialog()).toBeNull()
  })

  it('비로그인이면 저장 여부 대신 「로그인 필요」를 보이고 눌림 상태를 말하지 않는다', async () => {
    const onToggle = vi.fn()
    await openHarness({ requiresLogin: true, onToggle })

    expect(option('commercial').textContent).toContain('로그인 필요')
    expect(option('commercial').hasAttribute('aria-pressed')).toBe(false)
    expect(dialog()!.textContent).toContain('저장하려면 로그인이 필요해요.')

    fireEvent.click(option('analysis'))
    expect(onToggle).toHaveBeenCalledWith('analysis')
  })

  it('로그인 상태의 상태 글자는 스크린리더에 숨긴다 — 저장 여부는 aria-pressed 가 말한다', async () => {
    await openHarness()

    const state = option('commercial').lastElementChild!
    expect(state.textContent).toContain('저장됨')
    expect(state.getAttribute('aria-hidden')).toBe('true')
  })

  it('비로그인 「로그인 필요」는 읽힌다', async () => {
    await openHarness({ requiresLogin: true })

    const state = option('commercial').lastElementChild!
    expect(state.textContent).toContain('로그인 필요')
    expect(state.hasAttribute('aria-hidden')).toBe(false)
  })

  it('처리 중인 항목은 aria-busy 이고 다시 눌러도 onToggle 을 부르지 않는다', async () => {
    const onToggle = vi.fn()
    await openHarness({ onToggle, pending: { commercial: true } })

    expect(option('commercial').getAttribute('aria-busy')).toBe('true')
    expect(option('commercial').disabled).toBe(false)
    fireEvent.click(option('commercial'))
    expect(onToggle).not.toHaveBeenCalled()

    // 다른 항목은 그대로 누를 수 있다.
    expect(option('analysis').hasAttribute('aria-busy')).toBe(false)
    fireEvent.click(option('analysis'))
    expect(onToggle).toHaveBeenCalledWith('analysis')
  })

  it('첫 항목이 잠겨 있으면 첫 포커스는 다음 항목이고, 다 잠겼으면 닫기 버튼이다', async () => {
    await openHarness({ disabled: { analysis: true } })
    expect(option('analysis').disabled).toBe(true)
    expect(document.activeElement).toBe(option('commercial'))

    cleanup()
    await openHarness({ disabled: { analysis: true, commercial: true } })
    expect(document.activeElement).toBe(closeButton())
  })
})
