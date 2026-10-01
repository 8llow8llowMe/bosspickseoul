import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import CommunityListFallback from './community-list-fallback'
import { CommunityRegisterFallback } from './community-register-page'

/*
  라우트 Suspense 대기 화면(community.md §S4 「다듬기」 목록 첫 렌더). `useSearchParams` 를 쓰는 목록 ·
  글쓰기는 정적 HTML 에 이 화면이 그려진다 — 비어 있으면 첫 화면에 푸터가 올라오고, 실제 화면이 들어오면서
  높이가 튄다.
*/
const renderInQuery = (element: ReturnType<typeof createElement>) =>
  renderToStaticMarkup(
    createElement(QueryClientProvider, { client: new QueryClient() }, element),
  )

describe('목록 대기 화면', () => {
  const markup = renderInQuery(createElement(CommunityListFallback))

  it('실제 목록 화면을 loading 으로 그린다 — 머리 · 검색 툴바 · 탭 줄 · 글 행 스켈레톤 5줄', () => {
    expect(markup).toMatch(/<main[^>]*data-community-list-layout="one"/)
    expect(markup).toMatch(/<h1[^>]*>사장님 이야기<\/h1>/)
    expect(markup).toContain('placeholder="제목·내용 검색"')
    expect(markup).toContain('data-region-chip="filter"')
    expect(markup).toContain('data-community-tab-row="true"')
    expect(markup).toContain('data-community-list-skeleton="initial"')
    expect(markup.match(/data-community-row-skeleton="true"/g)).toHaveLength(5)
    expect(markup).toContain('게시글을 불러오는 중이에요')
  })

  it('글쓰기 링크는 진짜 주소다 — hydration 전에 눌러도 간다', () => {
    expect(markup).toMatch(/href="\/community\/register[^"]*"/)
  })
})

describe('글쓰기 대기 화면', () => {
  it('hydration 뒤 첫 렌더(로그인 확인)와 같은 상자 · 같은 말이다', () => {
    const markup = renderToStaticMarkup(
      createElement(CommunityRegisterFallback),
    )

    expect(markup).toMatch(/^<main/)
    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain('로그인 상태를 확인하고 있어요')
  })
})

describe('라우트가 대기 화면을 비워 두지 않는다', () => {
  const read = (path: string) =>
    readFileSync(
      new URL(`../../../app/(shell)/community/${path}`, import.meta.url),
      'utf8',
    )

  it('목록은 CommunityListFallback, 글쓰기는 CommunityRegisterFallback', () => {
    const list = read('list/page.tsx')
    const register = read('register/page.tsx')

    expect(list).toContain('<Suspense fallback={<CommunityListFallback />}>')
    expect(register).toContain(
      '<Suspense fallback={<CommunityRegisterFallback />}>',
    )
    expect(list).not.toContain('fallback={null}')
    expect(register).not.toContain('fallback={null}')
  })
})
