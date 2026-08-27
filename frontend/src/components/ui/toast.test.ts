import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import ToastProvider, { ToastItem } from '@/components/ui/toast'
import type { Toast } from '@/lib/ui/toast-state'

const toast = (overrides: Partial<Toast> = {}): Toast => ({
  id: '1',
  tone: 'success',
  message: '이 분석 화면을 보관함에 저장했어요.',
  ...overrides,
})

const render = (props: Partial<Toast> = {}) =>
  renderToStaticMarkup(
    createElement(ToastItem, {
      toast: toast(props),
      onDismiss: vi.fn(),
    }),
  )

describe('ToastItem', () => {
  it('문구와 닫기 버튼을 그린다', () => {
    const html = render()

    expect(html).toContain('이 분석 화면을 보관함에 저장했어요.')
    expect(html).toContain('aria-label="알림 닫기"')
  })

  it('성공은 status, 오류는 alert 로 알린다', () => {
    // 성공까지 alert 로 두면 스크린리더가 읽던 내용을 끊는다.
    expect(render({ tone: 'success' })).toContain('role="status"')
    expect(render({ tone: 'success' })).toContain('aria-live="polite"')
    expect(render({ tone: 'error' })).toContain('role="alert"')
    expect(render({ tone: 'error' })).toContain('aria-live="assertive"')
  })

  it('액션이 있으면 버튼으로 그린다', () => {
    const html = render({
      action: { label: '이어서 보관하기', onAction: () => undefined },
    })

    expect(html).toContain('이어서 보관하기')
  })

  it('액션이 없으면 액션 버튼을 그리지 않는다', () => {
    // 닫기 버튼 하나만 남아야 한다.
    const html = render()

    expect((html.match(/<button/g) ?? []).length).toBe(1)
  })
})

describe('ToastProvider', () => {
  it('띄운 토스트가 없으면 아무것도 덧붙이지 않는다', () => {
    // 뷰포트를 항상 그려 두면 빈 고정 상자가 화면 하단의 클릭을 먹는다.
    const html = renderToStaticMarkup(
      createElement(ToastProvider, null, createElement('main', null, '본문')),
    )

    expect(html).toBe('<main>본문</main>')
  })
})
