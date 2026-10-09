import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import ErrorScreen from '@/components/layout/error-screen'
import NotFoundScreen from '@/components/layout/not-found-screen'

vi.mock('react', async importOriginal => ({
  ...(await importOriginal<typeof import('react')>()),
  useEffect: () => undefined,
}))

describe('NotFoundScreen', () => {
  const html = renderToStaticMarkup(createElement(NotFoundScreen))

  it('제목과 이유 한 줄을 그린다', () => {
    expect(html).toContain('찾는 페이지가 없어요')
    expect(html).toContain('주소가 바뀌었거나 페이지가 삭제되었을 수 있어요.')
  })

  it('제목은 h1 이다', () => {
    expect(html).toMatch(/<h1[^>]*>찾는 페이지가 없어요/)
  })

  it('주 버튼은 상권 분석, 보조는 홈으로 간다', () => {
    expect(html).toMatch(/href="\/analysis"[^>]*>상권 분석하러 가기/)
    expect(html).toMatch(/href="\/"[^>]*>홈으로/)
  })
})

describe('ErrorScreen', () => {
  const error = Object.assign(new Error('내부 비밀 메시지'), {
    digest: 'abc123digest',
  })
  const html = renderToStaticMarkup(
    createElement(ErrorScreen, { error, retry: vi.fn() }),
  )

  it('다시 시도 버튼과 홈 링크를 그린다', () => {
    expect(html).toContain('다시 시도')
    expect(html).toMatch(/href="\/"[^>]*>홈으로/)
  })

  it('다시 시도 버튼이 retry 를 부른다', () => {
    const retry = vi.fn()
    // 훅을 직접 호출하므로 useEffect 만 비운다(vi.mock 아래).
    const tree = ErrorScreen({ error, retry }) as ReactElement<{
      primary: ReactElement<{ onClick: () => void }>
    }>
    tree.props.primary.props.onClick()
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('오류 메시지와 digest 를 노출하지 않는다', () => {
    expect(html).not.toContain('내부 비밀 메시지')
    expect(html).not.toContain('abc123digest')
  })
})
