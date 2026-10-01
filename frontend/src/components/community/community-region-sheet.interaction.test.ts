// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import CommunityRegionSheet from '@/components/community/community-region-sheet'

/*
  시트의 상호작용 계약(community.md §S4 「지역 선택 시트」, CM-016·017)을 실제 DOM 에서 잠근다.
  renderToStaticMarkup 은 이펙트·포털·이벤트를 돌리지 않아 「닫기만 하면 바꾸지 않는다」·
  「포커스를 칩으로 돌려준다」·「스크롤 잠금을 푼다」를 볼 수 없다(마크업 계약은
  community-region-sheet.test.ts).
*/

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

const renderSheet = () => {
  const onChange = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(CommunityRegionSheet, {
        value: {},
        mockEnabled: true,
        onChange,
      }),
    ),
  )

  const chip = document.body.querySelector<HTMLButtonElement>(
    'button[aria-haspopup="dialog"]',
  )
  if (!chip) {
    throw new Error('지역 칩이 없다')
  }

  return { chip, onChange }
}

const getDialog = () =>
  document.body.querySelector<HTMLElement>('[role="dialog"]')

const clickRow = (label: string) => {
  const row = Array.from(
    getDialog()?.querySelectorAll<HTMLButtonElement>('button') ?? [],
  ).find(button => button.textContent?.trim() === label)
  if (!row) {
    throw new Error(`행이 없다: ${label}`)
  }
  fireEvent.click(row)
}

const openSheet = async (chip: HTMLButtonElement) => {
  chip.focus()
  fireEvent.click(chip)
  // 패널 첫 포커스는 requestAnimationFrame 에서 간다.
  await act(async () => {
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
  })
}

describe('CommunityRegionSheet 상호작용', () => {
  it('하위 단계로 들어갔다가 Esc 로 닫으면 아무것도 내보내지 않고 칩으로 포커스를 돌려준다', async () => {
    const { chip, onChange } = renderSheet()

    await openSheet(chip)
    expect(getDialog()).not.toBeNull()
    expect(document.body.style.overflow).toBe('hidden')

    clickRow('강남구')
    expect(getDialog()?.textContent).toContain('강남구 전체')

    fireEvent.keyDown(getDialog()!, { key: 'Escape' })

    expect(getDialog()).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(chip)
    expect(document.body.style.overflow).toBe('')
  })

  it('닫기 버튼과 바깥 누름도 아무것도 내보내지 않는다', async () => {
    const { chip, onChange } = renderSheet()

    await openSheet(chip)
    fireEvent.click(
      getDialog()!.querySelector<HTMLButtonElement>(
        'button[aria-label="닫기"]',
      )!,
    )
    expect(getDialog()).toBeNull()

    await openSheet(chip)
    const overlay = getDialog()!.parentElement!
    fireEvent.mouseDown(overlay)
    expect(getDialog()).toBeNull()

    expect(onChange).not.toHaveBeenCalled()
  })

  it('패널 안에서 시작한 누름은 시트를 닫지 않는다', async () => {
    const { chip } = renderSheet()

    await openSheet(chip)
    fireEvent.mouseDown(getDialog()!)

    expect(getDialog()).not.toBeNull()
  })

  it('「강남구 전체」를 고르면 한 번만 내보내고 닫는다', async () => {
    const { chip, onChange } = renderSheet()

    await openSheet(chip)
    clickRow('강남구')
    clickRow('강남구 전체')

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({
      targetType: 'DISTRICT',
      targetCode: '11680',
      targetName: '강남구',
    })
    expect(getDialog()).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })

  it('Tab 은 시트 밖으로 나가지 않는다', async () => {
    const { chip } = renderSheet()

    await openSheet(chip)
    const dialog = getDialog()!

    for (let index = 0; index < 40; index += 1) {
      fireEvent.keyDown(document.activeElement ?? dialog, { key: 'Tab' })
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })
})
