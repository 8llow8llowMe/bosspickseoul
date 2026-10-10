import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import ToastProvider, {
  ToastAnnouncer,
  ToastItem,
  announcementOf,
} from '@/components/ui/toast'
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

  it('카드는 live region 이 아니다 — 읽기는 늘 마운트된 알림 영역이 맡는다(#584)', () => {
    // 카드에도 role 을 달면 같은 문구를 두 번 읽는다.
    for (const tone of ['success', 'info', 'error'] as const) {
      const html = render({ tone })
      expect(html).not.toContain('role=')
      expect(html).not.toContain('aria-live')
    }
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
  it('띄운 토스트가 없으면 뷰포트는 그리지 않고, 빈 live region 만 서버 렌더부터 둔다(#584)', () => {
    // 뷰포트를 항상 그려 두면 빈 고정 상자가 화면 하단의 클릭을 먹는다. live region 은 1px 고정 상자라 괜찮다.
    const html = renderToStaticMarkup(
      createElement(ToastProvider, null, createElement('main', null, '본문')),
    )

    expect(html.startsWith('<main>본문</main>')).toBe(true)
    expect(html).toContain('role="status"')
    expect(html).toContain('role="alert"')
    expect(html).not.toContain('알림 닫기')
    expect(html.replace(/<[^>]+>/g, '')).toBe('본문')
  })
})

describe('ToastAnnouncer', () => {
  const announce = (toasts: Toast[]) =>
    renderToStaticMarkup(createElement(ToastAnnouncer, { toasts }))

  it('토스트가 없어도 polite·assertive 영역을 둘 다 그린다', () => {
    const html = announce([])

    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('role="alert"')
    expect(html).toContain('aria-live="assertive"')
  })

  it('성공·안내는 polite 영역, 오류는 assertive 영역에 넣는다', () => {
    const html = announce([
      toast({ id: 'a', tone: 'success', message: '저장했어요.' }),
      toast({ id: 'b', tone: 'info', message: '링크를 복사했어요.' }),
      toast({ id: 'c', tone: 'error', message: '저장하지 못했어요.' }),
    ])
    const assertiveStart = html.indexOf('aria-live="assertive"')
    const polite = html.slice(0, assertiveStart)
    const assertive = html.slice(assertiveStart)

    expect(polite).toContain('저장했어요.')
    expect(polite).toContain('링크를 복사했어요.')
    expect(polite).not.toContain('저장하지 못했어요.')
    expect(assertive).toContain('저장하지 못했어요.')
    expect(assertive).not.toContain('>저장했어요.')
  })
})

describe('announcementOf — 동작 버튼 안내', () => {
  it('동작이 있으면 버튼 이름을 넣어 「버튼이 있어요」를 붙인다', () => {
    expect(
      announcementOf(
        toast({
          message: '댓글을 삭제했어요.',
          action: { label: '되돌리기', onAction: () => undefined },
        }),
      ),
    ).toBe('댓글을 삭제했어요. 알림에 「되돌리기」 버튼이 있어요.')
  })

  it('동작이 없으면 문구 그대로다', () => {
    expect(announcementOf(toast({ message: '저장했어요.' }))).toBe(
      '저장했어요.',
    )
  })

  it('live region 에도 같은 안내가 실린다', () => {
    const html = renderToStaticMarkup(
      createElement(ToastAnnouncer, {
        toasts: [
          toast({
            message: '댓글을 삭제했어요.',
            action: { label: '되돌리기', onAction: () => undefined },
          }),
        ],
      }),
    )

    expect(html).toContain(
      '댓글을 삭제했어요. 알림에 「되돌리기」 버튼이 있어요.',
    )
  })
})
