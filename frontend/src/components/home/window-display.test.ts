import { describe, expect, it } from 'vitest'
import { deriveWindowDisplay } from '@/components/home/window-display'

describe('deriveWindowDisplay', () => {
  it('데스크톱 · open: 그대로 open, 독 버튼 없음', () => {
    const d = deriveWindowDisplay('open', false)
    expect(d.displayState).toBe('open')
    expect(d.showDock).toBe(false)
  })

  it('데스크톱 · minimized: 그대로 minimized, 독 버튼 없음', () => {
    const d = deriveWindowDisplay('minimized', false)
    expect(d.displayState).toBe('minimized')
    expect(d.showDock).toBe(false)
  })

  it('데스크톱 · closed: 그대로 closed, 독 버튼 노출', () => {
    const d = deriveWindowDisplay('closed', false)
    expect(d.displayState).toBe('closed')
    expect(d.showDock).toBe(true)
  })

  it('모바일 · minimized: 카드는 강제로 open, 독 버튼 없음(신호등이 숨겨져 되돌릴 방법이 없으므로)', () => {
    const d = deriveWindowDisplay('minimized', true)
    expect(d.displayState).toBe('open')
    expect(d.showDock).toBe(false)
  })

  it('모바일 · closed: 카드는 강제로 open, 독 버튼 없음(빈 화면 방지)', () => {
    const d = deriveWindowDisplay('closed', true)
    expect(d.displayState).toBe('open')
    expect(d.showDock).toBe(false)
  })

  it('모바일 · open: 그대로 open, 독 버튼 없음', () => {
    const d = deriveWindowDisplay('open', true)
    expect(d.displayState).toBe('open')
    expect(d.showDock).toBe(false)
  })
})
